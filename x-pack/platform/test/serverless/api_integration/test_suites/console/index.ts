/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Console APIs', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./autocomplete_entities'));
    loadTestFile(require.resolve('./es_config'));
    loadTestFile(require.resolve('./proxy_route'));
    loadTestFile(require.resolve('./spec_definitions'));
  });
}
