/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV4 } from './v4';

export const rawRuleDashboardsSchema = schema.arrayOf(
  schema.object({
    refId: schema.string(),
  })
);

export const artifactsSchema = schema.object({
  dashboards: schema.maybe(rawRuleDashboardsSchema),
});

export const rawRuleSchema = rawRuleSchemaV4.extends({
  artifacts: schema.maybe(artifactsSchema),
});
