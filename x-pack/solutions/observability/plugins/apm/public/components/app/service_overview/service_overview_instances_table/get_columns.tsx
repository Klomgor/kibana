/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButtonIcon, RIGHT_ALIGNMENT } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React from 'react';
import { ActionMenu } from '@kbn/observability-shared-plugin/public';
import type { TypeOf } from '@kbn/typed-react-router-config';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getServiceNodeName, SERVICE_NODE_NAME_MISSING } from '../../../../../common/service_nodes';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { MetricOverviewLink } from '../../../shared/links/apm/metric_overview_link';
import { ListMetric } from '../../../shared/list_metric';
import { getLatencyColumnLabel } from '../../../shared/transactions_table/get_latency_column_label';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { InstanceActionsMenu } from './instance_actions_menu';
import { ChartType, getTimeSeriesColor } from '../../../shared/charts/helper/get_timeseries_color';
import type { ApmRoutes } from '../../../routing/apm_route_config';

type ServiceInstanceMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;
type MainStatsServiceInstanceItem = ServiceInstanceMainStatistics['currentPeriod'][0];
type ServiceInstanceDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics'>;

export function getColumns({
  serviceName,
  kuery,
  latencyAggregationType,
  detailedStatsLoading,
  detailedStatsData,
  comparisonEnabled,
  toggleRowDetails,
  itemIdToExpandedRowMap,
  toggleRowActionMenu,
  itemIdToOpenActionMenuRowMap,
  offset,
  shouldShowSparkPlots = true,
  query,
}: {
  serviceName: string;
  kuery: string;
  latencyAggregationType?: LatencyAggregationType;
  detailedStatsLoading: boolean;
  detailedStatsData?: ServiceInstanceDetailedStatistics;
  comparisonEnabled?: boolean;
  offset?: string;
  toggleRowDetails: (selectedServiceNodeName: string) => void;
  itemIdToExpandedRowMap: Record<string, ReactNode>;
  toggleRowActionMenu: (selectedServiceNodeName: string) => void;
  itemIdToOpenActionMenuRowMap: Record<string, boolean>;
  shouldShowSparkPlots?: boolean;
  query: Omit<TypeOf<ApmRoutes, '/services/{serviceName}/metrics'>['query'], 'kuery'>;
}): Array<EuiBasicTableColumn<MainStatsServiceInstanceItem>> {
  return [
    {
      field: 'serviceNodeName',
      name: i18n.translate('xpack.apm.serviceOverview.instancesTableColumnNodeName', {
        defaultMessage: 'Node name',
      }),
      width: '30%',
      render: (_, item) => {
        const { serviceNodeName } = item;
        const isMissingServiceNodeName = serviceNodeName === SERVICE_NODE_NAME_MISSING;
        const text = getServiceNodeName(serviceNodeName);

        const link = (
          <MetricOverviewLink
            serviceName={serviceName}
            query={{
              ...query,
              kuery: isMissingServiceNodeName
                ? `NOT (service.node.name:*)`
                : `service.node.name:"${item.serviceNodeName}"`,
            }}
          >
            {text}
          </MetricOverviewLink>
        );

        return <TruncateWithTooltip text={text} content={link} />;
      },
      sortable: true,
    },
    {
      field: 'latency',
      name: getLatencyColumnLabel(latencyAggregationType),
      align: RIGHT_ALIGNMENT,
      render: (_, { serviceNodeName, latency }) => {
        const currentPeriodTimestamp = detailedStatsData?.currentPeriod?.[serviceNodeName]?.latency;
        const previousPeriodTimestamp =
          detailedStatsData?.previousPeriod?.[serviceNodeName]?.latency;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.LATENCY_AVG
        );

        return (
          <ListMetric
            color={currentPeriodColor}
            valueLabel={asMillisecondDuration(latency)}
            hideSeries={!shouldShowSparkPlots}
            isLoading={detailedStatsLoading}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousPeriodTimestamp : undefined
            }
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'throughput',
      name: i18n.translate('xpack.apm.serviceOverview.instancesTableColumnThroughput', {
        defaultMessage: 'Throughput',
      }),
      align: RIGHT_ALIGNMENT,
      render: (_, { serviceNodeName, throughput }) => {
        const currentPeriodTimestamp =
          detailedStatsData?.currentPeriod?.[serviceNodeName]?.throughput;
        const previousPeriodTimestamp =
          detailedStatsData?.previousPeriod?.[serviceNodeName]?.throughput;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.THROUGHPUT
        );

        return (
          <ListMetric
            compact
            color={currentPeriodColor}
            hideSeries={!shouldShowSparkPlots}
            valueLabel={asTransactionRate(throughput)}
            isLoading={detailedStatsLoading}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousPeriodTimestamp : undefined
            }
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'errorRate',
      name: i18n.translate('xpack.apm.serviceOverview.instancesTableColumnErrorRate', {
        defaultMessage: 'Failed transaction rate',
      }),
      align: RIGHT_ALIGNMENT,
      render: (_, { serviceNodeName, errorRate }) => {
        const currentPeriodTimestamp =
          detailedStatsData?.currentPeriod?.[serviceNodeName]?.errorRate;
        const previousPeriodTimestamp =
          detailedStatsData?.previousPeriod?.[serviceNodeName]?.errorRate;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.FAILED_TRANSACTION_RATE
        );

        return (
          <ListMetric
            compact
            color={currentPeriodColor}
            hideSeries={!shouldShowSparkPlots}
            valueLabel={asPercent(errorRate, 1)}
            isLoading={detailedStatsLoading}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousPeriodTimestamp : undefined
            }
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
      sortable: true,
    },
    {
      field: 'cpuUsage',
      name: i18n.translate('xpack.apm.serviceOverview.instancesTableColumnCpuUsage', {
        defaultMessage: 'CPU usage (avg.)',
      }),
      align: RIGHT_ALIGNMENT,
      sortable: true,
      render: (_, { serviceNodeName, cpuUsage }) => {
        const currentPeriodTimestamp =
          detailedStatsData?.currentPeriod?.[serviceNodeName]?.cpuUsage;
        const previousPeriodTimestamp =
          detailedStatsData?.previousPeriod?.[serviceNodeName]?.cpuUsage;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(ChartType.CPU_USAGE);

        return (
          <ListMetric
            compact
            color={currentPeriodColor}
            hideSeries={!shouldShowSparkPlots}
            valueLabel={asPercent(cpuUsage, 1)}
            isLoading={detailedStatsLoading}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousPeriodTimestamp : undefined
            }
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    {
      field: 'memoryUsage',
      name: i18n.translate('xpack.apm.serviceOverview.instancesTableColumnMemoryUsage', {
        defaultMessage: 'Memory usage (avg.)',
      }),
      align: RIGHT_ALIGNMENT,
      sortable: true,
      render: (_, { serviceNodeName, memoryUsage }) => {
        const currentPeriodTimestamp =
          detailedStatsData?.currentPeriod?.[serviceNodeName]?.memoryUsage;
        const previousPeriodTimestamp =
          detailedStatsData?.previousPeriod?.[serviceNodeName]?.memoryUsage;

        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.MEMORY_USAGE
        );

        return (
          <ListMetric
            compact
            color={currentPeriodColor}
            hideSeries={!shouldShowSparkPlots}
            valueLabel={asPercent(memoryUsage, 1)}
            isLoading={detailedStatsLoading}
            series={currentPeriodTimestamp}
            comparisonSeries={
              comparisonEnabled && isTimeComparison(offset) ? previousPeriodTimestamp : undefined
            }
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
    {
      width: '40px',
      render: (instanceItem: MainStatsServiceInstanceItem) => {
        return (
          <ActionMenu
            id="instanceActionMenu"
            closePopover={() => toggleRowActionMenu(instanceItem.serviceNodeName)}
            isOpen={itemIdToOpenActionMenuRowMap[instanceItem.serviceNodeName]}
            anchorPosition="leftCenter"
            button={
              <EuiButtonIcon
                aria-label={i18n.translate('xpack.apm.getColumns.euiButtonIcon.editLabel', {
                  defaultMessage: 'Edit',
                })}
                data-test-subj={`instanceActionsButton_${instanceItem.serviceNodeName}`}
                iconType="boxesHorizontal"
                onClick={() => toggleRowActionMenu(instanceItem.serviceNodeName)}
              />
            }
          >
            <InstanceActionsMenu
              serviceName={serviceName}
              serviceNodeName={instanceItem.serviceNodeName}
              kuery={kuery}
              onClose={() => toggleRowActionMenu(instanceItem.serviceNodeName)}
            />
          </ActionMenu>
        );
      },
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (instanceItem: MainStatsServiceInstanceItem) => {
        return (
          <EuiButtonIcon
            data-test-subj={`instanceDetailsButton_${instanceItem.serviceNodeName}`}
            onClick={() => toggleRowDetails(instanceItem.serviceNodeName)}
            aria-label={
              itemIdToExpandedRowMap[instanceItem.serviceNodeName] ? 'Collapse' : 'Expand'
            }
            iconType={
              itemIdToExpandedRowMap[instanceItem.serviceNodeName] ? 'arrowUp' : 'arrowDown'
            }
          />
        );
      },
    },
  ];
}
