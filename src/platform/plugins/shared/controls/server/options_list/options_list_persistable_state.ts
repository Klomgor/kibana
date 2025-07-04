/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EmbeddableStateWithType,
  EmbeddablePersistableStateService,
} from '@kbn/embeddable-plugin/server';
import { SavedObjectReference } from '@kbn/core/types';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { DefaultDataControlState } from '../../common';

const dataViewReferenceName = 'optionsListDataView';

export const createOptionsListInject = (): EmbeddablePersistableStateService['inject'] => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const workingState = { ...state } as EmbeddableStateWithType;
    references.forEach((reference) => {
      if (reference.name === dataViewReferenceName) {
        (workingState as Partial<DefaultDataControlState>).dataViewId = reference.id;
      }
    });
    return workingState as EmbeddableStateWithType;
  };
};

export const createOptionsListExtract = (): EmbeddablePersistableStateService['extract'] => {
  return (state: EmbeddableStateWithType) => {
    const workingState = { ...state } as EmbeddableStateWithType;
    const references: SavedObjectReference[] = [];

    if ('dataViewId' in workingState) {
      references.push({
        name: dataViewReferenceName,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: (workingState as Partial<DefaultDataControlState>).dataViewId!,
      });
      delete workingState.dataViewId;
    }
    return { state: workingState as EmbeddableStateWithType, references };
  };
};
