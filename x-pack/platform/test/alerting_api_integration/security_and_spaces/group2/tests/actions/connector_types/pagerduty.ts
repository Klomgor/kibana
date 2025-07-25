/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type httpProxy from 'http-proxy';
import expect from '@kbn/expect';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';

import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '@kbn/actions-simulators-plugin/server/plugin';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog } from '../../../../../common/lib';

export default function pagerdutyTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');
  const retry = getService('retry');

  describe('pagerduty action', () => {
    let simulatedActionId = '';
    let pagerdutySimulatorURL: string = '<could not determine kibana url>';
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    // need to wait for kibanaServer to settle ...
    before(async () => {
      pagerdutySimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.PAGERDUTY)
      );

      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    it('should return successfully when passed valid create parameters', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A pagerduty action',
          connector_type_id: '.pagerduty',
          config: {
            apiUrl: pagerdutySimulatorURL,
          },
          secrets: {
            routingKey: 'pager-duty-routing-key',
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        name: 'A pagerduty action',
        connector_type_id: '.pagerduty',
        is_missing_secrets: false,
        config: {
          apiUrl: pagerdutySimulatorURL,
        },
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        name: 'A pagerduty action',
        connector_type_id: '.pagerduty',
        is_missing_secrets: false,
        config: {
          apiUrl: pagerdutySimulatorURL,
        },
      });
    });

    it('should return unsuccessfully when passed invalid create parameters', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A pagerduty action',
          connector_type_id: '.pagerduty',
          config: {
            apiUrl: pagerdutySimulatorURL,
          },
          secrets: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type secrets: [routingKey]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it('should return unsuccessfully when default pagerduty url is not present in allowedHosts', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A pagerduty action',
          connector_type_id: '.pagerduty',
          secrets: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type config: error configuring pagerduty action: target url "https://events.pagerduty.com/v2/enqueue" is not added to the Kibana config xpack.actions.allowedHosts',
          });
        });
    });

    it('should create pagerduty simulator action successfully', async () => {
      const { body: createdSimulatedAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A pagerduty simulator',
          connector_type_id: '.pagerduty',
          config: {
            apiUrl: pagerdutySimulatorURL,
          },
          secrets: {
            routingKey: 'pager-duty-routing-key',
          },
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle executing with a simulated success', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            summary: 'just a test',
          },
        })
        .expect(200);

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result).to.eql({
        status: 'ok',
        connector_id: simulatedActionId,
        data: {
          message: 'Event processed',
          status: 'success',
        },
      });

      const events: IValidatedEvent[] = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'default',
          type: 'action',
          id: simulatedActionId,
          provider: 'actions',
          actions: new Map([
            ['execute-start', { equal: 1 }],
            ['execute', { equal: 1 }],
          ]),
        });
      });

      const executeEvent = events[1];
      expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(142);
    });

    it('should execute successfully with links and customDetails', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            summary: 'just a test',
            customDetails: {
              myString: 'foo',
              myNumber: 10,
              myArray: ['foo', 'baz'],
              myBoolean: true,
              myObject: {
                myNestedObject: 'foo',
              },
            },
            links: [
              {
                href: 'http://example.com',
                text: 'a link',
              },
              {
                href: 'http://example.com',
                text: 'a second link',
              },
            ],
          },
        })
        .expect(200);

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result).to.eql({
        status: 'ok',
        connector_id: simulatedActionId,
        data: {
          message: 'Event processed',
          status: 'success',
        },
      });
    });

    it('should handle a 40x pagerduty error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            summary: 'respond-with-418',
          },
        })
        .expect(200);
      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting pagerduty event: unexpected status 418/);
    });

    it('should handle a 429 pagerduty error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            summary: 'respond-with-429',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(
        /error posting pagerduty event: http status 429, retry later/
      );
      expect(result.retry).to.equal(true);
    });

    it('should handle a 500 pagerduty error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            summary: 'respond-with-502',
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting pagerduty event: http status 502/);
      expect(result.retry).to.equal(true);
    });

    after(() => {
      if (proxyServer) {
        proxyServer.close();
      }
    });
  });
}
