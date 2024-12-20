/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import type { Capabilities as UICapabilities } from '@kbn/core/server';
import { uiCapabilitiesRegex } from '@kbn/features-plugin/server';
import type { UIActions as UIActionsType } from '@kbn/security-plugin-types-server';

export class UIActions implements UIActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `ui:`;
  }

  public get(featureId: keyof UICapabilities, ...uiCapabilityParts: string[]) {
    if (!featureId || !isString(featureId)) {
      throw new Error('featureId is required and must be a string');
    }

    if (!uiCapabilityParts || !Array.isArray(uiCapabilityParts)) {
      throw new Error('uiCapabilityParts is required and must be an array');
    }

    if (
      uiCapabilityParts.length === 0 ||
      uiCapabilityParts.findIndex(
        (part) => !part || !isString(part) || !uiCapabilitiesRegex.test(part)
      ) >= 0
    ) {
      throw new Error(
        `UI capabilities are required, and must all be strings matching the pattern ${uiCapabilitiesRegex}`
      );
    }

    return `${this.prefix}${featureId}/${uiCapabilityParts.join('/')}`;
  }

  /**
   * Checks if the action is a valid UI action.
   * @param action The action string to check.
   */
  public isValid(action: string) {
    return action.startsWith(this.prefix);
  }
}
