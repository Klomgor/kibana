/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../_index.scss';
import React, { Component } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiCallOut, UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { Filter } from '@kbn/es-query';
import { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import { Observable } from 'rxjs';
import { ExitFullScreenButton } from '@kbn/shared-ux-button-exit-full-screen';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { MBMap } from '../mb_map';
import { RightSideControls } from '../right_side_controls';
import { Timeslider } from '../timeslider';
import { ToolbarOverlay } from '../toolbar_overlay';
import { EditLayerPanel } from '../edit_layer_panel';
import { AddLayerPanel } from '../add_layer_panel';
import { isScreenshotMode } from '../../kibana_services';
import { RawValue, RENDER_TIMEOUT } from '../../../common/constants';
import { FLYOUT_STATE } from '../../reducers/ui';
import { MapSettings } from '../../../common/descriptor_types';
import { MapSettingsPanel } from '../map_settings_panel';
import { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import { ILayer } from '../../classes/layers/layer';

const RENDER_COMPLETE_EVENT = 'renderComplete';

export interface Props {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
  isMapLoading: boolean;
  cancelAllInFlightRequests: () => void;
  exitFullScreen: () => void;
  flyoutDisplay: FLYOUT_STATE;
  isFullScreen: boolean;
  isTimesliderOpen: boolean;
  indexPatternIds: string[];
  mapInitError: string | null | undefined;
  renderTooltipContent?: RenderToolTipContent;
  title?: string;
  description?: string;
  settings: MapSettings;
  layerList: ILayer[];
  waitUntilTimeLayersLoad$: Observable<void>;
  /*
   * Set to false to exclude sharing attributes 'data-*'.
   * An example usage is tile_map and region_map visualizations. The visualizations use MapEmbeddable for rendering.
   * Visualize Embeddable handles sharing attributes so sharing attributes are not needed in the children.
   */
  isSharable: boolean;
  euiTheme?: any;
}

interface State {
  isInitialLoadRenderTimeoutComplete: boolean;
  domId: string;
  showFitToBoundsButton: boolean;
  showTimesliderButton: boolean;
}

const mapWrapperStyles = css({ position: 'relative' });

export class MapContainer extends Component<Props, State> {
  private _isMounted: boolean = false;
  private _isInitalLoadRenderTimerStarted: boolean = false;

  state: State = {
    isInitialLoadRenderTimeoutComplete: false,
    domId: uuidv4(),
    showFitToBoundsButton: false,
    showTimesliderButton: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadShowFitToBoundsButton();
    this._loadShowTimesliderButton();
  }

  componentDidUpdate() {
    this._loadShowFitToBoundsButton();
    this._loadShowTimesliderButton();
    if (
      this.props.isSharable &&
      !this.props.isMapLoading &&
      !this._isInitalLoadRenderTimerStarted
    ) {
      this._isInitalLoadRenderTimerStarted = true;
      this._startInitialLoadRenderTimer();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.cancelAllInFlightRequests();
  }

  // Reporting uses both a `data-render-complete` attribute and a DOM event listener to determine
  // if a visualization is done loading. The process roughly is:
  // - See if the `data-render-complete` attribute is "true". If so we're done!
  // - If it's not, then reporting injects a listener into the browser for a custom "renderComplete" event.
  // - When that event is fired, we snapshot the viz and move on.
  // Failure to not have the dom attribute, or custom event, will timeout the job.
  // See x-pack/plugins/reporting/export_types/common/lib/screenshots/wait_for_render.ts for more.
  _onInitialLoadRenderComplete = () => {
    const el = document.querySelector(`[data-dom-id="${this.state.domId}"]`);

    if (el) {
      el.dispatchEvent(new CustomEvent(RENDER_COMPLETE_EVENT, { bubbles: true }));
    }
  };

  async _loadShowFitToBoundsButton() {
    const promises = this.props.layerList.map(async (layer) => {
      return await layer.isFittable();
    });
    const showFitToBoundsButton = (await Promise.all(promises)).some((isFittable) => isFittable);
    if (this._isMounted && this.state.showFitToBoundsButton !== showFitToBoundsButton) {
      this.setState({ showFitToBoundsButton });
    }
  }

  async _loadShowTimesliderButton() {
    if (!this.props.settings.showTimesliderToggleButton) {
      if (this.state.showTimesliderButton) {
        this.setState({ showTimesliderButton: false });
      }
      return;
    }

    const promises = this.props.layerList.map(async (layer) => {
      return await layer.isFilteredByGlobalTime();
    });
    const showTimesliderButton = (await Promise.all(promises)).some(
      (isFilteredByGlobalTime) => isFilteredByGlobalTime
    );
    if (this._isMounted && this.state.showTimesliderButton !== showTimesliderButton) {
      this.setState({ showTimesliderButton });
    }
  }

  _startInitialLoadRenderTimer = () => {
    window.setTimeout(() => {
      if (this._isMounted) {
        this.setState({ isInitialLoadRenderTimeoutComplete: true });
        this._onInitialLoadRenderComplete();
      }
    }, RENDER_TIMEOUT);
  };

  render() {
    const {
      addFilters,
      getFilterActions,
      getActionContext,
      onSingleValueTrigger,
      flyoutDisplay,
      isFullScreen,
      exitFullScreen,
      mapInitError,
      renderTooltipContent,
    } = this.props;

    if (mapInitError) {
      return (
        <div
          data-render-complete
          data-shared-item
          data-title={this.props.title}
          data-description={this.props.description}
        >
          <EuiCallOut
            title={i18n.translate('xpack.maps.map.initializeErrorTitle', {
              defaultMessage: 'Unable to initialize map',
            })}
            color="danger"
            iconType="cross"
          >
            <p>{mapInitError}</p>
          </EuiCallOut>
        </div>
      );
    }

    let exitFullScreenButton;
    if (isFullScreen) {
      exitFullScreenButton = <ExitFullScreenButton onExit={exitFullScreen} />;
    }
    const shareAttributes = this.props.isSharable
      ? {
          ['data-dom-id']: this.state.domId,
          ['data-render-complete']: this.state.isInitialLoadRenderTimeoutComplete,
          ['data-shared-item']: true,
          ['data-title']: this.props.title,
          ['data-description']: this.props.description,
        }
      : {};

    return (
      <EuiFlexGroup gutterSize="none" responsive={false} {...shareAttributes}>
        <EuiFlexItem
          css={mapWrapperStyles}
          style={{ backgroundColor: this.props.settings.backgroundColor }}
        >
          <MBMap
            addFilters={addFilters}
            getFilterActions={getFilterActions}
            getActionContext={getActionContext}
            onSingleValueTrigger={onSingleValueTrigger}
            renderTooltipContent={renderTooltipContent}
          />
          {!this.props.settings.hideToolbarOverlay && !isScreenshotMode() && (
            <ToolbarOverlay
              addFilters={addFilters}
              getFilterActions={getFilterActions}
              getActionContext={getActionContext}
              showFitToBoundsButton={this.state.showFitToBoundsButton}
              showTimesliderButton={this.state.showTimesliderButton}
            />
          )}
          <RightSideControls />
          {this.props.isTimesliderOpen && (
            <Timeslider waitForTimesliceToLoad$={this.props.waitUntilTimeLayersLoad$} />
          )}
        </EuiFlexItem>
        <FlyoutPanelWrapper flyoutDisplay={flyoutDisplay} />
        {exitFullScreenButton}
      </EuiFlexGroup>
    );
  }
}

const componentStyles = {
  flyoutPanelWrapperStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      overflow: 'hidden',
      borderLeftWidth: 1,
      borderLeftColor: euiTheme.colors.borderBaseSubdued,
      borderLeftStyle: 'solid',
      width: 0,
      '& > *': {
        width: `calc(${euiTheme.size.xxl} * 12)`,
      },
    }),
  flyoutVisibleStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: `calc(${euiTheme.size.xxl} * 12)`,
      transition: `width ${euiTheme.animation.normal} ${euiTheme.animation.resistance}`,
    }),
};

const FlyoutPanelWrapper = ({ flyoutDisplay }: { flyoutDisplay: FLYOUT_STATE }) => {
  let flyoutPanel = null;
  if (flyoutDisplay === FLYOUT_STATE.ADD_LAYER_WIZARD) {
    flyoutPanel = <AddLayerPanel />;
  } else if (flyoutDisplay === FLYOUT_STATE.LAYER_PANEL) {
    flyoutPanel = <EditLayerPanel />;
  } else if (flyoutDisplay === FLYOUT_STATE.MAP_SETTINGS_PANEL) {
    flyoutPanel = <MapSettingsPanel />;
  }
  const isVisible = !!flyoutPanel;
  const styles = useMemoCss(componentStyles);
  return (
    <EuiFlexItem
      css={[styles.flyoutPanelWrapperStyles, isVisible && styles.flyoutVisibleStyles]}
      grow={false}
    >
      {flyoutPanel}
    </EuiFlexItem>
  );
};
