/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  rawAdHocRunParamsSchemaV1,
  rawAdHocRunParamsSchemaV2,
} from '../schemas/raw_ad_hoc_run_params';

export const adHocRunParamsModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawAdHocRunParamsSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawAdHocRunParamsSchemaV1,
    },
  },
  '2': {
    changes: [],
    schemas: {
      forwardCompatibility: rawAdHocRunParamsSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawAdHocRunParamsSchemaV2,
    },
  },
};
