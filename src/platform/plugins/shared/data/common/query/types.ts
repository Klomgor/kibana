/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Query, Filter } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-service-server';
import type { TimeRange } from './timefilter/types';

export type { TimeRange, TimeRangeBounds } from './timefilter/types';
export type { Query, AggregateQuery } from '@kbn/es-query';
export type { RefreshInterval } from '@kbn/data-service-server';

export type SavedQueryTimeFilter = TimeRange & {
  refreshInterval: RefreshInterval;
};

export interface SavedQuery {
  id: string;
  attributes: SavedQueryAttributes;
  namespaces: string[];
}

export interface SavedQueryAttributes {
  title: string;
  description: string;
  query: Query;
  filters?: Filter[];
  timefilter?: SavedQueryTimeFilter;
}
