/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { nextTick } from '@kbn/test-jest-helpers';

import { generateApiKey } from './generate_connector_api_key_api_logic';

jest.mock('@kbn/search-connectors', () => ({
  createConnectorSecret: jest.fn(),
  updateConnectorSecret: jest.fn(),
}));

describe('generateConnectorApiKeyApiLogic', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('generateApiKey for connector clients', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const result = generateApiKey({ http, indexName: 'indexName', isNative: false });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/content_connectors/indices/indexName/api_key',
        {
          body: '{"is_native":false}',
        }
      );
      await expect(result).resolves.toEqual('result');
    });
  });

  describe('generateApiKey for native connectors', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const result = generateApiKey({ http, indexName: 'indexName', isNative: true });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/content_connectors/indices/indexName/api_key',
        {
          body: '{"is_native":true}',
        }
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
