/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { ISearchSource, EsQuerySortValue } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { DiscoverServices } from '../../../build_services';
import { createDataSource } from '../../../../common/data_sources';
import type { ScopedProfilesManager } from '../../../context_awareness';

export async function fetchAnchor(
  anchorId: string,
  dataView: DataView,
  searchSource: ISearchSource,
  sort: EsQuerySortValue[],
  services: DiscoverServices,
  scopedProfilesManager: ScopedProfilesManager
): Promise<{
  anchorRow: DataTableRecord;
  interceptedWarnings: SearchResponseWarning[];
}> {
  await scopedProfilesManager.resolveDataSourceProfile({
    dataSource: createDataSource({ dataView, query: undefined }),
    dataView,
    query: { query: '', language: 'kuery' },
  });

  updateSearchSource(searchSource, anchorId, sort, dataView);

  const adapter = new RequestAdapter();
  const { rawResponse } = await lastValueFrom(
    searchSource.fetch$({
      disableWarningToasts: true,
      inspector: {
        adapter,
        title: 'anchor',
      },
    })
  );
  const doc = rawResponse.hits?.hits?.[0] as EsHitRecord;

  if (!doc) {
    throw new Error(
      i18n.translate('discover.context.failedToLoadAnchorDocumentErrorDescription', {
        defaultMessage: 'Failed to load anchor document.',
      })
    );
  }

  const interceptedWarnings: SearchResponseWarning[] = [];
  services.data.search.showWarnings(adapter, (warning) => {
    interceptedWarnings.push(warning);
    return true; // suppress the default behaviour
  });

  return {
    anchorRow: scopedProfilesManager.resolveDocumentProfile({
      record: buildDataTableRecord(doc, dataView, true),
    }),
    interceptedWarnings,
  };
}

export function updateSearchSource(
  searchSource: ISearchSource,
  anchorId: string,
  sort: EsQuerySortValue[],
  dataView: DataView
) {
  searchSource
    .setParent(undefined)
    .setField('index', dataView)
    .setField('version', true)
    .setField('size', 1)
    .setField('query', {
      query: {
        constant_score: {
          filter: {
            ids: {
              values: [anchorId],
            },
          },
        },
      },
      language: 'lucene',
    })
    .setField('sort', sort)
    .setField('trackTotalHits', false);

  searchSource.removeField('fieldsFromSource');
  searchSource.setField('fields', [{ field: '*', include_unmapped: true }]);

  return searchSource;
}
