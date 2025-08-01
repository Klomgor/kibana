/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';

import type { Filter, Query } from '@kbn/es-query';
import { type DataView, type DataViewSpec, getEsQueryConfig } from '@kbn/data-plugin/common';
import { isActiveTimeline } from '../../../helpers';
import { InputsModelId } from '../../store/inputs/constants';
import { useGlobalTime } from '../../containers/use_global_time';
import type { BrowserFields } from '../../containers/source';
import { useKibana } from '../../lib/kibana';
import { combineQueries } from '../../lib/kuery';
import type { inputsModel, State } from '../../store';
import { inputsSelectors } from '../../store';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { timelineSelectors } from '../../../timelines/store';
import type { TimelineModel } from '../../../timelines/store/model';

import { getOptions, isDetectionsAlertsTable } from './helpers';
import { TopN } from './top_n';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import type { AlertsStackByField } from '../../../detections/components/alerts_kpis/common/types';

const EMPTY_FILTERS: Filter[] = [];
const EMPTY_QUERY: Query = { query: '', language: 'kuery' };

const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();

  // The mapped Redux state provided to this component includes the global
  // filters that appear at the top of most views in the app, and all the
  // filters in the active timeline:
  const mapStateToProps = (state: State, ownProps: { globalFilters?: Filter[] }) => {
    const activeTimeline: TimelineModel = getTimeline(state, TimelineId.active) ?? timelineDefaults;
    const activeTimelineFilters = activeTimeline.filters ?? EMPTY_FILTERS;
    const activeTimelineInput: inputsModel.InputsRange = getInputsTimeline(state);
    const { globalFilters } = ownProps;
    return {
      activeTimelineEventType: activeTimeline.eventType,
      activeTimelineFilters:
        activeTimeline.activeTab === TimelineTabs.query ? activeTimelineFilters : EMPTY_FILTERS,
      activeTimelineFrom: activeTimelineInput.timerange.from,
      activeTimelineKqlQueryExpression:
        activeTimeline.activeTab === TimelineTabs.query
          ? getKqlQueryTimeline(state, TimelineId.active)
          : null,
      activeTimelineTo: activeTimelineInput.timerange.to,
      dataProviders:
        activeTimeline.activeTab === TimelineTabs.query ? activeTimeline.dataProviders : [],
      globalQuery: getGlobalQuerySelector(state),
      globalFilters: globalFilters ?? getGlobalFiltersQuerySelector(state),
      kqlMode: activeTimeline.kqlMode,
    };
  };

  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

//  * `indexToAdd`, which enables the alerts index to be appended to
//    the `indexPattern` returned by `useWithSource`, may only be populated when
//    this component is rendered in the context of the active timeline. This
//    behavior enables the 'All events' view by appending the alerts index
//    to the index pattern.
export interface OwnProps {
  browserFields: BrowserFields;
  field: string;
  dataViewSpec?: DataViewSpec;
  dataView: DataView;
  scopeId?: string;
  toggleTopN: () => void;
  onFilterAdded?: () => void;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  globalFilters?: Filter[];
}

type PropsFromRedux = ConnectedProps<typeof connector>;
type Props = OwnProps & PropsFromRedux;

const StatefulTopNComponent: React.FC<Props> = ({
  activeTimelineEventType,
  activeTimelineFilters,
  activeTimelineFrom,
  activeTimelineKqlQueryExpression,
  activeTimelineTo,
  browserFields,
  dataProviders,
  field,
  dataViewSpec,
  dataView,
  globalFilters = EMPTY_FILTERS,
  globalQuery = EMPTY_QUERY,
  kqlMode,
  onFilterAdded,
  paddingSize,
  scopeId,
  toggleTopN,
}) => {
  const { uiSettings } = useKibana().services;
  const { from, deleteQuery, to } = useGlobalTime();

  const options = getOptions(isActiveTimeline(scopeId ?? '') ? activeTimelineEventType : undefined);
  const applyGlobalQueriesAndFilters = !isActiveTimeline(scopeId ?? '');

  const combinedQueries = useMemo(
    () =>
      isActiveTimeline(scopeId ?? '')
        ? combineQueries({
            browserFields,
            config: getEsQueryConfig(uiSettings),
            dataProviders,
            filters: activeTimelineFilters,
            dataViewSpec,
            dataView,
            kqlMode,
            kqlQuery: {
              language: 'kuery',
              query: activeTimelineKqlQueryExpression ?? '',
            },
          })
        : undefined,
    [
      scopeId,
      browserFields,
      uiSettings,
      dataProviders,
      activeTimelineFilters,
      dataViewSpec,
      dataView,
      kqlMode,
      activeTimelineKqlQueryExpression,
    ]
  );

  const defaultView = useMemo(
    () => (isDetectionsAlertsTable(scopeId) ? 'alert' : options[0].value),
    [options, scopeId]
  );

  return (
    <TopN
      filterQuery={combinedQueries?.filterQuery}
      defaultView={defaultView}
      deleteQuery={isActiveTimeline(scopeId ?? '') ? undefined : deleteQuery}
      field={field as AlertsStackByField}
      filters={isActiveTimeline(scopeId ?? '') ? EMPTY_FILTERS : globalFilters}
      from={isActiveTimeline(scopeId ?? '') ? activeTimelineFrom : from}
      dataView={dataView}
      dataViewSpec={dataViewSpec}
      options={options}
      paddingSize={paddingSize}
      query={isActiveTimeline(scopeId ?? '') ? EMPTY_QUERY : globalQuery}
      setAbsoluteRangeDatePickerTarget={
        isActiveTimeline(scopeId ?? '') ? InputsModelId.timeline : InputsModelId.global
      }
      scopeId={scopeId}
      to={isActiveTimeline(scopeId ?? '') ? activeTimelineTo : to}
      toggleTopN={toggleTopN}
      onFilterAdded={onFilterAdded}
      applyGlobalQueriesAndFilters={applyGlobalQueriesAndFilters}
    />
  );
};

StatefulTopNComponent.displayName = 'StatefulTopNComponent';

export const StatefulTopN: React.FunctionComponent<OwnProps> = connector(
  React.memo(StatefulTopNComponent)
);
