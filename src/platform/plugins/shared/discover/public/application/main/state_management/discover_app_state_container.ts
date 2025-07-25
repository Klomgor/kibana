/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/common';
import {
  createStateContainer,
  createStateContainerReactHelpers,
} from '@kbn/kibana-utils-plugin/common';
import type { AggregateQuery, Filter, FilterCompareOptions, Query } from '@kbn/es-query';
import {
  COMPARE_ALL_OPTIONS,
  compareFilters,
  FilterStateStore,
  isOfAggregateQueryType,
} from '@kbn/es-query';
import type { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type { IKbnUrlStateStorage, ISyncStateRef } from '@kbn/kibana-utils-plugin/public';
import { syncState } from '@kbn/kibana-utils-plugin/public';
import { isEqual, omit } from 'lodash';
import { connectToQueryState, syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DataGridDensity } from '@kbn/unified-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverServices } from '../../../build_services';
import { addLog } from '../../../utils/add_log';
import { cleanupUrlState } from './utils/cleanup_url_state';
import { getStateDefaults } from './utils/get_state_defaults';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import type { DiscoverDataSource } from '../../../../common/data_sources';
import {
  createDataViewDataSource,
  createEsqlDataSource,
  DataSourceType,
  isDataSourceType,
  isEsqlSource,
} from '../../../../common/data_sources';
import type { DiscoverSavedSearchContainer } from './discover_saved_search_container';
import type { InternalStateStore, TabActionInjector } from './redux';
import { internalStateActions } from './redux';
import { APP_STATE_URL_KEY } from '../../../../common';

export interface DiscoverAppStateContainer extends ReduxLikeStateContainer<DiscoverAppState> {
  /**
   * Returns the previous state, used for diffing e.g. if fetching new data is necessary
   */
  getPrevious: () => DiscoverAppState;
  /**
   * Determines if the current state is different from the initial state
   */
  hasChanged: () => boolean;
  /**
   * Initializes the app state and starts syncing it with the URL
   */
  initAndSync: () => () => void;
  /**
   * Replaces the current state in URL with the given state
   * @param newState
   * @param merge if true, the given state is merged with the current state
   */
  replaceUrlState: (newPartial: DiscoverAppState, merge?: boolean) => Promise<void>;
  /**
   * Resets the state container to a given state, clearing the previous state
   */
  resetToState: (state: DiscoverAppState) => void;
  /**
   * Resets the current state to the initial state
   */
  resetInitialState: () => void;
  /**
   * Start syncing the state with the URL
   */
  syncState: () => ISyncStateRef;
  /**
   * Updates the state, if replace is true, a history.replace is performed instead of history.push
   * @param newPartial
   * @param replace
   */
  update: (newPartial: DiscoverAppState, replace?: boolean) => void;
  /*
   * Get updated AppState when given a saved search
   *
   */
  getAppStateFromSavedSearch: (newSavedSearch: SavedSearch) => DiscoverAppState;
}

export interface DiscoverAppState {
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * Data Grid related state
   */
  grid?: DiscoverGridSettings;
  /**
   * Hide chart
   */
  hideChart?: boolean;
  /**
   * The current data source
   */
  dataSource?: DiscoverDataSource;
  /**
   * Used interval of the histogram
   */
  interval?: string;
  /**
   * Lucence or KQL query
   */
  query?: Query | AggregateQuery;
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];
  /**
   * id of the used saved query
   */
  savedQuery?: string;
  /**
   * Table view: Documents vs Field Statistics
   */
  viewMode?: VIEW_MODE;
  /**
   * Hide mini distribution/preview charts when in Field Statistics mode
   */
  hideAggregatedPreview?: boolean;
  /**
   * Document explorer row height option
   */
  rowHeight?: number;
  /**
   * Document explorer header row height option
   */
  headerRowHeight?: number;
  /**
   * Number of rows in the grid per page
   */
  rowsPerPage?: number;
  /**
   * Custom sample size
   */
  sampleSize?: number;
  /**
   * Breakdown field of chart
   */
  breakdownField?: string;
  /**
   * Density of table
   */
  density?: DataGridDensity;
}

export interface AppStateUrl extends Omit<DiscoverAppState, 'sort'> {
  /**
   * Necessary to take care of legacy links [fieldName,direction]
   */
  sort?: string[][] | [string, string];
  /**
   * Legacy data view ID prop
   */
  index?: string;
}

export const { Provider: DiscoverAppStateProvider, useSelector: useAppStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<DiscoverAppState>>();

/**
 * This is the app state container for Discover main, it's responsible for syncing state with the URL
 * @param stateStorage
 * @param savedSearch
 * @param services
 */
export const getDiscoverAppStateContainer = ({
  tabId,
  stateStorage,
  internalState,
  savedSearchContainer,
  services,
  injectCurrentTab,
}: {
  tabId: string;
  stateStorage: IKbnUrlStateStorage;
  internalState: InternalStateStore;
  savedSearchContainer: DiscoverSavedSearchContainer;
  services: DiscoverServices;
  injectCurrentTab: TabActionInjector;
}): DiscoverAppStateContainer => {
  let initialState = getInitialState({
    initialUrlState: getCurrentUrlState(stateStorage, services),
    savedSearch: savedSearchContainer.getState(),
    services,
  });
  let previousState = initialState;
  const appStateContainer = createStateContainer<DiscoverAppState>(initialState);

  const enhancedAppContainer = {
    ...appStateContainer,
    set: (value: DiscoverAppState | null) => {
      if (!value) {
        return;
      }

      previousState = appStateContainer.getState();

      // When updating to an ES|QL query, sync the data source
      if (isOfAggregateQueryType(value.query)) {
        value = { ...value, dataSource: createEsqlDataSource() };
      }

      appStateContainer.set(value);
    },
  };

  const hasChanged = () => {
    return !isEqualState(initialState, enhancedAppContainer.getState());
  };

  const getAppStateFromSavedSearch = (newSavedSearch: SavedSearch) => {
    return getInitialState({
      initialUrlState: undefined,
      savedSearch: newSavedSearch,
      services,
    });
  };

  const resetToState = (state: DiscoverAppState) => {
    addLog('[appState] reset state to', state);
    previousState = state;
    enhancedAppContainer.set(state);
  };

  const resetInitialState = () => {
    addLog('[appState] reset initial state to the current state');
    initialState = enhancedAppContainer.getState();
  };

  const replaceUrlState = async (newPartial: DiscoverAppState = {}, merge = true) => {
    addLog('[appState] replaceUrlState', { newPartial, merge });
    const state = merge ? { ...enhancedAppContainer.getState(), ...newPartial } : newPartial;
    if (internalState.getState().tabs.unsafeCurrentId === tabId) {
      await stateStorage.set(APP_STATE_URL_KEY, state, { replace: true });
    } else {
      enhancedAppContainer.set(state);
    }
  };

  const startAppStateUrlSync = () => {
    addLog('[appState] start syncing state with URL');
    return syncState({
      storageKey: APP_STATE_URL_KEY,
      stateContainer: enhancedAppContainer,
      stateStorage,
    });
  };

  const initializeAndSync = () => {
    const currentSavedSearch = savedSearchContainer.getState();

    addLog('[appState] initialize state and sync with URL', currentSavedSearch);

    // Set the default profile state only if not loading a saved search,
    // to avoid overwriting saved search state
    if (!currentSavedSearch.id) {
      const { breakdownField, columns, rowHeight, hideChart } = getCurrentUrlState(
        stateStorage,
        services
      );

      // Only set default state which is not already set in the URL
      internalState.dispatch(
        injectCurrentTab(internalStateActions.setResetDefaultProfileState)({
          resetDefaultProfileState: {
            columns: columns === undefined,
            rowHeight: rowHeight === undefined,
            breakdownField: breakdownField === undefined,
            hideChart: hideChart === undefined,
          },
        })
      );
    }

    const { data } = services;
    const savedSearchDataView = currentSavedSearch.searchSource.getField('index');
    const appState = enhancedAppContainer.getState();
    const setDataViewFromSavedSearch =
      !appState.dataSource ||
      (isDataSourceType(appState.dataSource, DataSourceType.DataView) &&
        appState.dataSource.dataViewId !== savedSearchDataView?.id);

    if (setDataViewFromSavedSearch) {
      // used data view is different from the given by url/state which is invalid
      setState(enhancedAppContainer, {
        dataSource: savedSearchDataView?.id
          ? createDataViewDataSource({ dataViewId: savedSearchDataView.id })
          : undefined,
      });
    }

    // syncs `_a` portion of url with query services
    const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
      data.query,
      enhancedAppContainer,
      {
        filters: FilterStateStore.APP_STATE,
        query: true,
      }
    );

    // syncs `_g` portion of url with query services
    const { stop: stopSyncingGlobalStateWithUrl } = syncGlobalQueryStateWithUrl(
      data.query,
      stateStorage
    );

    const { start, stop } = startAppStateUrlSync();

    // current state need to be pushed to url
    replaceUrlState({}).then(() => start());

    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingGlobalStateWithUrl();
      stop();
    };
  };

  const update = (newPartial: DiscoverAppState, replace = false) => {
    addLog('[appState] update', { newPartial, replace });
    if (replace) {
      return replaceUrlState(newPartial);
    } else {
      previousState = { ...enhancedAppContainer.getState() };
      setState(enhancedAppContainer, newPartial);
    }
  };

  const getPrevious = () => previousState;

  return {
    ...enhancedAppContainer,
    getPrevious,
    hasChanged,
    initAndSync: initializeAndSync,
    resetToState,
    resetInitialState,
    replaceUrlState,
    syncState: startAppStateUrlSync,
    update,
    getAppStateFromSavedSearch,
  };
};

function getCurrentUrlState(stateStorage: IKbnUrlStateStorage, services: DiscoverServices) {
  return (
    cleanupUrlState(stateStorage.get<AppStateUrl>(APP_STATE_URL_KEY) ?? {}, services.uiSettings) ??
    {}
  );
}

export function getInitialState({
  initialUrlState,
  savedSearch,
  overrideDataView,
  services,
}: {
  initialUrlState: DiscoverAppState | undefined;
  savedSearch: SavedSearch | undefined;
  overrideDataView?: DataView | undefined;
  services: DiscoverServices;
}) {
  const defaultAppState = getStateDefaults({
    savedSearch,
    overrideDataView,
    services,
  });
  const mergedState = { ...defaultAppState, ...initialUrlState };

  // https://github.com/elastic/kibana/issues/122555
  if (typeof mergedState.hideChart !== 'boolean') {
    mergedState.hideChart = undefined;
  }

  // Don't allow URL state to overwrite the data source if there's an ES|QL query
  if (isOfAggregateQueryType(mergedState.query) && !isEsqlSource(mergedState.dataSource)) {
    mergedState.dataSource = createEsqlDataSource();
  }

  return handleSourceColumnState(mergedState, services.uiSettings);
}

/**
 * Helper function to merge a given new state with the existing state and to set the given state
 * container
 */
export function setState(
  stateContainer: ReduxLikeStateContainer<DiscoverAppState>,
  newState: DiscoverAppState
) {
  addLog('[appstate] setState', { newState });
  const oldState = stateContainer.getState();
  const mergedState = { ...oldState, ...newState };
  if (!isEqualState(oldState, mergedState)) {
    stateContainer.set(mergedState);
  }
}

/**
 * Helper function to compare 2 different filter states
 */
export function isEqualFilters(
  filtersA?: Filter[] | Filter,
  filtersB?: Filter[] | Filter,
  comparatorOptions: FilterCompareOptions = COMPARE_ALL_OPTIONS
) {
  if (!filtersA && !filtersB) {
    return true;
  } else if (!filtersA || !filtersB) {
    return false;
  }
  return compareFilters(filtersA, filtersB, comparatorOptions);
}

/**
 * Helper function to compare 2 different state, is needed since comparing filters
 * works differently
 */
export function isEqualState(
  stateA: DiscoverAppState,
  stateB: DiscoverAppState,
  exclude: Array<keyof DiscoverAppState> = []
) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }

  const { filters: stateAFilters = [], ...stateAPartial } = omit(stateA, exclude as string[]);
  const { filters: stateBFilters = [], ...stateBPartial } = omit(stateB, exclude as string[]);

  return isEqual(stateAPartial, stateBPartial) && isEqualFilters(stateAFilters, stateBFilters);
}
