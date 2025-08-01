/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiEmptyPrompt } from '@elastic/eui';
import { openLazyFlyout } from '@kbn/presentation-util';
import { css } from '@emotion/react';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import type { PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import {
  apiHasExecutionContext,
  apiHasParentApi,
  apiPublishesTimeRange,
  apiPublishesTimeslice,
  fetch$,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React, { useCallback, useState } from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import type { Observable } from 'rxjs';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
  merge,
  of,
  Subscription,
} from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import type { AnomalySwimlaneEmbeddableServices } from '..';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '..';
import type { MlDependencies } from '../../application/app';
import { Y_AXIS_LABEL_WIDTH } from '../../application/explorer/constants';
import type { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import {
  isViewBySwimLaneData,
  SwimlaneContainer,
} from '../../application/explorer/swimlane_container';
import { HttpService } from '../../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import { SWIM_LANE_SELECTION_TRIGGER } from '../../ui_actions';
import { buildDataViewPublishingApi } from '../common/build_data_view_publishing_api';
import { useReactEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';
import { initializeSwimLaneControls, swimLaneComparators } from './initialize_swim_lane_controls';
import { initializeSwimLaneDataFetcher } from './initialize_swim_lane_data_fetcher';
import type { AnomalySwimLaneEmbeddableApi, AnomalySwimLaneEmbeddableState } from './types';
import { AnomalySwimlaneUserInput } from './anomaly_swimlane_setup_flyout';

/**
 * Provides the services required by the Anomaly Swimlane Embeddable.
 */
export const getServices = async (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
): Promise<AnomalySwimlaneEmbeddableServices> => {
  const [
    [coreStart, pluginsStart],
    { AnomalyDetectorService },
    { AnomalyTimelineService },
    { mlApiProvider },
    { mlResultsServiceProvider },
  ] = await Promise.all([
    getStartServices(),
    import('../../application/services/anomaly_detector_service'),
    import('../../application/services/anomaly_timeline_service'),
    import('../../application/services/ml_api_service'),
    import('../../application/services/results_service'),
  ]);

  const httpService = new HttpService(coreStart.http);
  const anomalyDetectorService = new AnomalyDetectorService(httpService);
  const anomalyTimelineService = new AnomalyTimelineService(
    pluginsStart.data.query.timefilter.timefilter,
    coreStart.uiSettings,
    mlResultsServiceProvider(mlApiProvider(httpService))
  );

  return [
    coreStart,
    pluginsStart as MlDependencies,
    { anomalyDetectorService, anomalyTimelineService },
  ];
};

export const getAnomalySwimLaneEmbeddableFactory = (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
) => {
  const factory: EmbeddableFactory<AnomalySwimLaneEmbeddableState, AnomalySwimLaneEmbeddableApi> = {
    type: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      if (!apiHasExecutionContext(parentApi)) {
        throw new Error('Parent API does not have execution context');
      }

      const services = await getServices(getStartServices);

      const [coreStartServices, pluginsStartServices, anomalySwimLaneServices] = services;

      const subscriptions = new Subscription();

      const interval = new BehaviorSubject<number | undefined>(undefined);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const query$ = ((initialState.rawState.query
        ? new BehaviorSubject(initialState.rawState.query)
        : (parentApi as Partial<PublishesUnifiedSearch>)?.query$) ??
        new BehaviorSubject(undefined)) as PublishesUnifiedSearch['query$'];
      const filters$ = ((initialState.rawState.filters
        ? new BehaviorSubject(initialState.rawState.filters)
        : (parentApi as Partial<PublishesUnifiedSearch>)?.filters$) ??
        new BehaviorSubject(undefined)) as PublishesUnifiedSearch['filters$'];

      const refresh$ = new BehaviorSubject<void>(undefined);

      const titleManager = initializeTitleManager(initialState.rawState);
      const timeRangeManager = initializeTimeRangeManager(initialState.rawState);

      const swimlaneManager = initializeSwimLaneControls(initialState.rawState, titleManager.api);

      // Helpers for swim lane data fetching
      const chartWidth$ = new BehaviorSubject<number | undefined>(undefined);

      function serializeState() {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            ...timeRangeManager.getLatestState(),
            ...swimlaneManager.getLatestState(),
          },
          references: [],
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<AnomalySwimLaneEmbeddableState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          timeRangeManager.anyStateChange$,
          swimlaneManager.anyStateChange$
        ),
        getComparators: () => {
          return {
            ...titleComparators,
            ...timeRangeComparators,
            ...swimLaneComparators,
            id: 'skip',
            query: 'skip',
            refreshConfig: 'skip',
            filters: 'skip',
          };
        },
        onReset: (lastSaved) => {
          timeRangeManager.reinitializeState(lastSaved?.rawState);
          titleManager.reinitializeState(lastSaved?.rawState);
          if (lastSaved) swimlaneManager.reinitializeState(lastSaved.rawState);
        },
      });

      const api = finalizeApi({
        isEditingEnabled: () => true,
        getTypeDisplayName: () =>
          i18n.translate('xpack.ml.swimlaneEmbeddable.typeDisplayName', {
            defaultMessage: 'swim lane',
          }),
        onEdit: async () => {
          openLazyFlyout({
            core: coreStartServices,
            parentApi,
            flyoutProps: {
              focusedPanelId: uuid,
            },
            loadContent: async ({ closeFlyout }) => {
              return (
                <AnomalySwimlaneUserInput
                  coreStart={coreStartServices}
                  pluginStart={pluginsStartServices}
                  onConfirm={(result) => {
                    swimlaneManager.api.updateUserInput(result);
                    closeFlyout();
                  }}
                  onCancel={closeFlyout}
                  input={{ ...titleManager.getLatestState(), ...swimlaneManager.getLatestState() }}
                />
              );
            },
          });
        },
        ...titleManager.api,
        ...timeRangeManager.api,
        ...swimlaneManager.api,
        ...unsavedChangesApi,
        query$,
        filters$,
        interval,
        setInterval: (v) => interval.next(v),
        dataViews$: buildDataViewPublishingApi(
          {
            anomalyDetectorService: services[2].anomalyDetectorService,
            dataViewsService: services[1].data.dataViews,
          },
          { jobIds: swimlaneManager.api.jobIds },
          subscriptions
        ),
        dataLoading$,
        serializeState,
      });
      const appliedTimeRange$: Observable<TimeRange | undefined> = combineLatest([
        api.timeRange$,
        apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi)
          ? api.parentApi.timeRange$
          : of(null),
        apiHasParentApi(api) && apiPublishesTimeslice(api.parentApi)
          ? api.parentApi.timeslice$
          : of(null),
      ]).pipe(
        // @ts-ignore
        map(([timeRange, parentTimeRange, parentTimeslice]) => {
          if (timeRange) {
            return timeRange;
          }
          if (parentTimeRange) {
            return parentTimeRange;
          }
          if (parentTimeslice) {
            return parentTimeslice;
          }
          return undefined;
        })
      ) as Observable<TimeRange | undefined>;

      const { swimLaneData$, onDestroy } = initializeSwimLaneDataFetcher(
        api,
        chartWidth$.asObservable(),
        dataLoading$,
        blockingError$,
        appliedTimeRange$,
        query$,
        filters$,
        refresh$,
        anomalySwimLaneServices
      );

      subscriptions.add(
        fetch$(api)
          .pipe(
            map((fetchContext) => ({
              query: fetchContext.query,
              filters: fetchContext.filters,
              timeRange: fetchContext.timeRange,
            })),
            distinctUntilChanged(fastIsEqual)
          )
          .subscribe(() => {
            api.updatePagination({ fromPage: 1 });
          })
      );

      const onRenderComplete = () => {};

      return {
        api,
        Component: () => {
          const { uiSettings } = coreStartServices;
          const { uiActions } = pluginsStartServices;

          const timeBuckets = useTimeBuckets(uiSettings);

          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          useReactEmbeddableExecutionContext(
            services[0].executionContext,
            parentApi.executionContext,
            ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
            uuid
          );

          useUnmount(() => {
            swimlaneManager.cleanup();
            onDestroy();
            subscriptions.unsubscribe();
          });

          const [fromPage, perPage, swimlaneType, swimlaneData, error] =
            useBatchedPublishingSubjects(
              api.fromPage,
              api.perPage,
              api.swimlaneType,
              swimLaneData$,
              blockingError$
            );

          const [selectedCells, setSelectedCells] = useState<AppStateSelectedCells | undefined>();

          const onCellsSelection = useCallback(
            (update?: AppStateSelectedCells) => {
              setSelectedCells(update);

              if (update) {
                uiActions.getTrigger(SWIM_LANE_SELECTION_TRIGGER).exec({
                  embeddable: api,
                  data: update,
                  updateCallback: setSelectedCells.bind(null, undefined),
                });
              }
            },
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [swimlaneData, perPage, setSelectedCells]
          );

          if (error) {
            return (
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.ml.swimlaneEmbeddable.errorMessage"
                    defaultMessage="Unable to load the data for the swim lane"
                  />
                }
                color="danger"
                iconType="warning"
                css={{ width: '100%' }}
              >
                <p>{error.message}</p>
              </EuiCallOut>
            );
          }

          return (
            <KibanaRenderContextProvider {...coreStartServices}>
              <KibanaContextProvider services={{ ...coreStartServices }}>
                <div
                  css={css`
                    width: 100%;
                    padding: 8px;
                  `}
                  data-test-subj="mlAnomalySwimlaneEmbeddableWrapper"
                  data-shared-item="" // TODO: Remove data-shared-item as part of https://github.com/elastic/kibana/issues/179376
                >
                  <SwimlaneContainer
                    id={uuid}
                    data-test-subj={`mlSwimLaneEmbeddable_${uuid}`}
                    timeBuckets={timeBuckets}
                    swimlaneData={swimlaneData!}
                    swimlaneType={swimlaneType}
                    fromPage={fromPage}
                    perPage={perPage}
                    swimlaneLimit={
                      isViewBySwimLaneData(swimlaneData) ? swimlaneData.cardinality : undefined
                    }
                    onResize={(size) => chartWidth$.next(size)}
                    selection={selectedCells}
                    onCellsSelection={onCellsSelection}
                    onPaginationChange={(update) => {
                      if (update.fromPage) {
                        api.updatePagination({ fromPage: update.fromPage });
                      }
                      if (update.perPage) {
                        api.updatePagination({ perPage: update.perPage, fromPage: 1 });
                      }
                    }}
                    isLoading={dataLoading$.value!}
                    yAxisWidth={{ max: Y_AXIS_LABEL_WIDTH }}
                    noDataWarning={
                      <EuiEmptyPrompt
                        titleSize="xxs"
                        css={{ padding: 0 }}
                        title={
                          <h2>
                            <FormattedMessage
                              id="xpack.ml.swimlaneEmbeddable.noDataFound"
                              defaultMessage="No anomalies found"
                            />
                          </h2>
                        }
                      />
                    }
                    chartsService={pluginsStartServices.charts}
                    onRenderComplete={onRenderComplete}
                  />
                </div>
              </KibanaContextProvider>
            </KibanaRenderContextProvider>
          );
        },
      };
    },
  };
  return factory;
};
