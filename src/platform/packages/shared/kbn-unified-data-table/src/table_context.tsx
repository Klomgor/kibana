/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { ValueToStringConverter } from './types';
import type { UseSelectedDocsState } from './hooks/use_selected_docs';

export interface DataTableContext {
  expanded?: DataTableRecord | undefined;
  setExpanded?: (hit?: DataTableRecord) => void;
  getRowByIndex: (index: number) => DataTableRecord | undefined;
  onFilter?: DocViewFilterFn;
  dataView: DataView;
  selectedDocsState: UseSelectedDocsState;
  valueToStringConverter: ValueToStringConverter;
  componentsTourSteps?: Record<string, string>;
  isPlainRecord?: boolean;
  pageIndex: number | undefined; // undefined when the pagination is disabled
  pageSize: number | undefined;
}

const defaultContext = {} as unknown as DataTableContext;

export const UnifiedDataTableContext = React.createContext<DataTableContext>(defaultContext);
