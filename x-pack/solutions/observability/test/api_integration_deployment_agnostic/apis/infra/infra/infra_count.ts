/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  GetInfraEntityCountRequestBodyPayloadClient,
  GetInfraEntityCountRequestParamsPayload,
  GetInfraEntityCountResponsePayload,
} from '@kbn/infra-plugin/common/http_api';
import type { SupertestWithRoleScopeType } from '../../../services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

import { DATES } from '../utils/constants';

const timeRange = {
  from: new Date(DATES['8.0.0'].logs_and_metrics.min).toISOString(),
  to: new Date(DATES['8.0.0'].logs_and_metrics.max).toISOString(),
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe('API /api/infra/{entityType}/count', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const fetchHostsCount = async ({
      params,
      body,
    }: {
      params: GetInfraEntityCountRequestParamsPayload;
      body: GetInfraEntityCountRequestBodyPayloadClient;
    }): Promise<GetInfraEntityCountResponsePayload | undefined> => {
      const { entityType } = params;
      const response = await supertestWithAdminScope
        .post(`/api/infra/${entityType}/count`)
        .send(body)
        .expect(200);
      return response.body;
    };

    describe('works', () => {
      describe('with host', () => {
        before(async () => {
          supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
            withInternalHeaders: true,
            useCookieHeader: true,
          });
          await esArchiver.load(
            'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
          );
        });
        after(async () => {
          await esArchiver.unload(
            'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
          );
          await supertestWithAdminScope.destroy();
        });

        it('received data', async () => {
          const infraHosts = await fetchHostsCount({
            params: { entityType: 'host' },
            body: {
              query: {
                bool: {
                  must: [],
                  filter: [],
                  should: [],
                  must_not: [],
                },
              },
              from: timeRange.from,
              to: timeRange.to,
            },
          });

          if (infraHosts) {
            const { count, entityType: assetType } = infraHosts;
            expect(count).to.equal(3);
            expect(assetType).to.be('host');
          } else {
            throw new Error('Hosts count response should not be empty');
          }
        });
      });
    });
  });
}
