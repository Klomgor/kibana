/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createPackagePolicy } from '../helper';

const currentTimeMinusNineMinutes = new Date(Date.now() - 300000).toISOString();

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  describe.skip('GET /internal/cloud_security_posture/status', () => {
    let agentPolicyId: string;

    describe('STATUS = WAITING_FOR_RESULT TEST', () => {
      before(async () => {
        await fleetAndAgents.setup();
      });
      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        const getPkRes = await supertest
          .get(`/api/fleet/epm/packages/fleet_server`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        const pkgVersion = getPkRes.body.item.version;
        await supertest
          .post(`/api/fleet/epm/packages/fleet_server/${pkgVersion}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);

        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy a1',
            namespace: 'default',
          });

        agentPolicyId = agentPolicyResponse.item.id;

        await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: 'test-default-a1',
            name: 'Default',
            is_default: true,
            host_urls: ['https://test.com:8080', 'https://test.com:8081'],
          })
          .expect(200);
        await fleetAndAgents.generateAgent('healthy', `Agent policy test 2`, agentPolicyId);
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      it(`Should return waiting_for_result when installed kspm, has no findings and it has been less than 10 minutes since the installation`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'kspm',
          'cloudbeat/cis_k8s',
          'vanilla',
          'kspm'
        );

        await kibanaServer.savedObjects.update({
          id: 'cloud_security_posture',
          type: 'epm-packages',
          attributes: {
            install_started_at: currentTimeMinusNineMinutes,
          },
        });

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        expect(res.kspm.status).to.eql(
          'waiting_for_results',
          `expected kspm status to be waiting_for_results but got ${res.kspm.status} instead`
        );
      });

      it(`Should return waiting_for_result when installed cspm, has no findings and it has been less than 10 minutes since the installation`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'cspm',
          'cloudbeat/cis_aws',
          'aws',
          'cspm'
        );

        await kibanaServer.savedObjects.update({
          id: 'cloud_security_posture',
          type: 'epm-packages',
          attributes: {
            install_started_at: currentTimeMinusNineMinutes,
          },
        });

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        expect(res.cspm.status).to.eql(
          'waiting_for_results',
          `expected cspm status to be waiting_for_results but got ${res.cspm.status} instead`
        );
      });

      it(`Should return waiting_for_result when installed cnvm, has no findings and it has been less than 4 hours minutes since the installation`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'vuln_mgmt',
          'cloudbeat/vuln_mgmt_aws',
          'aws',
          'vuln_mgmt'
        );

        await kibanaServer.savedObjects.update({
          id: 'cloud_security_posture',
          type: 'epm-packages',
          attributes: {
            install_started_at: currentTimeMinusNineMinutes,
          },
        });

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        expect(res.vuln_mgmt.status).to.eql(
          'waiting_for_results',
          `expected vuln_mgmt status to be waiting_for_results but got ${res.vuln_mgmt.status} instead`
        );
      });
    });
  });
}
