/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getAlertTitle = (ruleCategory: string) => {
  return i18n.translate('xpack.observability.alertDetails.title', {
    defaultMessage:
      '{ruleCategory} {ruleCategory, select, Anomaly {detected} Inventory {threshold breached} other {breached}}',
    values: {
      ruleCategory,
    },
  });
};
