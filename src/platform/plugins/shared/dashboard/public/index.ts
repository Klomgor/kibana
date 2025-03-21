/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext } from '@kbn/core/public';

import { DashboardPlugin } from './plugin';
export {
  DASHBOARD_APP_ID,
  LEGACY_DASHBOARD_APP_ID,
  PanelPlacementStrategy,
} from './plugin_constants';
export { DASHBOARD_GRID_COLUMN_COUNT } from '../common/content_management';
export type {
  DashboardApi,
  DashboardCreationOptions,
  DashboardLocatorParams,
} from './dashboard_api/types';
export { DASHBOARD_API_TYPE } from './dashboard_api/types';
export type { DashboardRendererProps } from './dashboard_renderer/dashboard_renderer';
export { LazyDashboardRenderer as DashboardRenderer } from './dashboard_renderer/lazy_dashboard_renderer';
export type { DashboardStart } from './plugin';

export { DashboardListingTable } from './dashboard_listing';
export { DashboardTopNav } from './dashboard_top_nav';
export type { RedirectToProps } from './dashboard_app/types';
export { type DashboardAppLocator, cleanEmptyKeys } from './dashboard_app/locator/locator';
export { getDashboardLocatorParamsFromEmbeddable } from './dashboard_app/locator/get_dashboard_locator_params';

export { type SearchDashboardsResponse } from './services/dashboard_content_management_service/lib/find_dashboards';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardPlugin(initializerContext);
}
