/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiLinkAnchorProps } from '@elastic/eui';
import type { IBasePath } from '@kbn/core/public';
import { pick } from 'lodash';
import { useLocation } from 'react-router-dom';
import url from 'url';
import { encodePath } from '@kbn/typed-react-router-config';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import type { APMQueryParams } from '../url_helpers';
import { fromQuery, toQuery } from '../url_helpers';

interface Props extends EuiLinkAnchorProps {
  path?: string;
  query?: APMQueryParams;
  mergeQuery?: (query: APMQueryParams) => APMQueryParams;
  children?: React.ReactNode;
}

export type APMLinkExtendProps = Omit<Props, 'path'>;

export const PERSISTENT_APM_PARAMS: Array<keyof APMQueryParams> = [
  'kuery',
  'rangeFrom',
  'rangeTo',
  'refreshPaused',
  'refreshInterval',
  'environment',
  'serviceGroup',
  'comparisonEnabled',
];

/**
 * Hook to get a link for a path with persisted filters
 */
export function useAPMHref({
  path,
  persistedFilters,
  query,
  pathParams,
}: {
  path: string;
  persistedFilters?: Array<keyof APMQueryParams>;
  query?: APMQueryParams;
  pathParams?: Record<string, string>;
}) {
  const { urlParams } = useLegacyUrlParams();
  const { basePath } = useApmPluginContext().core.http;
  const { search } = useLocation();
  const nextQuery = {
    ...pickKeys(urlParams as APMQueryParams, ...(persistedFilters ?? [])),
    ...query,
  };

  const encodedPath = encodePath(path, pathParams);

  return getLegacyApmHref({ basePath, path: encodedPath, query: nextQuery, search });
}

/**
 * Get an APM link for a path.
 */
export function getLegacyApmHref({
  basePath,
  path = '',
  search,
  query = {},
}: {
  basePath: IBasePath;
  path?: string;
  search?: string;
  query?: APMQueryParams;
}) {
  const currentQuery = toQuery(search);
  const nextQuery = {
    ...pick(currentQuery, PERSISTENT_APM_PARAMS),
    ...query,
  };
  const nextSearch = fromQuery(nextQuery);

  return url.format({
    pathname: basePath.prepend(`/app/apm${path}`),
    search: nextSearch,
  });
}
