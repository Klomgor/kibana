/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { GroupingQuery, RootAggregation } from '@kbn/grouping/src';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { showErrorToast } from '@kbn/cloud-security-posture';
import type { VulnerabilitiesGroupingAggregation } from '@kbn/cloud-security-posture';
import { CDR_VULNERABILITIES_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import { useKibana } from '../../../common/hooks/use_kibana';

export type VulnerabilitiesRootGroupingAggregation =
  RootAggregation<VulnerabilitiesGroupingAggregation>;

export const getGroupedVulnerabilitiesQuery = (query: GroupingQuery) => ({
  ...query,
  index: CDR_VULNERABILITIES_INDEX_PATTERN,
  ignore_unavailable: true,
  size: 0,
});

export const useGroupedVulnerabilities = ({
  query,
  enabled = true,
}: {
  query: GroupingQuery;
  enabled: boolean;
}) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    [CDR_VULNERABILITIES_INDEX_PATTERN, 'csp_grouped_vulnerabilities', { query }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<
          {},
          IKibanaSearchResponse<SearchResponse<{}, VulnerabilitiesRootGroupingAggregation>>
        >({
          params: getGroupedVulnerabilitiesQuery(query),
        })
      );

      if (!aggregations) throw new Error('Failed to aggregate by, missing resource id');

      return aggregations;
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled,
      // This allows the UI to keep the previous data while the new data is being fetched
      keepPreviousData: true,
    }
  );
};
