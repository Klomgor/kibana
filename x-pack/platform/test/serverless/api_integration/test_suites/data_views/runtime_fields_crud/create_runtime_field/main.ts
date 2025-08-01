/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { InternalRequestHeader, RoleCredentials } from '../../../../../shared/services';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { configArray } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('main', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await esArchiver.load(
        'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    configArray.forEach((config) => {
      describe(config.name, () => {
        it('can create a new runtime field', async () => {
          const title = `basic_index*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              override: true,
              [config.serviceKey]: {
                title,
              },
            });
          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeBar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            });

          expect(response2.status).to.be(200);
          expect(response2.body[config.serviceKey]).to.not.be.empty();

          const field =
            config.serviceKey === 'index_pattern' ? response2.body.field : response2.body.fields[0];

          expect(field.name).to.be('runtimeBar');
          expect(field.runtimeField.type).to.be('long');
          expect(field.runtimeField.script.source).to.be("emit(doc['field_name'].value)");
          expect(field.scripted).to.be(false);
        });

        it('newly created runtime field is available in the index_pattern object', async () => {
          const title = `basic_index`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              override: true,
              [config.serviceKey]: {
                title,
              },
            });

          await supertestWithoutAuth
            .post(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeBar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            });

          const response2 = await supertestWithoutAuth
            .get(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response2.status).to.be(200);
          expect(response2.body[config.serviceKey]).to.not.be.empty();

          const field = response2.body[config.serviceKey].fields.runtimeBar;

          expect(field.name).to.be('runtimeBar');
          expect(field.runtimeField.type).to.be('long');
          expect(field.runtimeField.script.source).to.be("emit(doc['field_name'].value)");
          expect(field.scripted).to.be(false);

          const response3 = await supertestWithoutAuth
            .post(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeBar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            });

          expect(response3.status).to.be(400);

          await supertestWithoutAuth
            .delete(`${config.path}/${response1.body[config.serviceKey].id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);
        });

        it('prevents field name collisions', async () => {
          const title = `basic*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              override: true,
              [config.serviceKey]: {
                title,
              },
            });

          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeBar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            });

          expect(response2.status).to.be(200);

          const response3 = await supertestWithoutAuth
            .post(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeBar',
              runtimeField: {
                type: 'long',
                script: {
                  source: "emit(doc['field_name'].value)",
                },
              },
            });

          expect(response3.status).to.be(400);

          const response4 = await supertestWithoutAuth
            .post(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeComposite',
              runtimeField: {
                type: 'composite',
                script: {
                  source: 'emit("a","a"); emit("b","b")',
                },
                fields: {
                  a: {
                    type: 'keyword',
                  },
                  b: {
                    type: 'keyword',
                  },
                },
              },
            });

          expect(response4.status).to.be(200);

          const response5 = await supertestWithoutAuth
            .post(`${config.path}/${response1.body[config.serviceKey].id}/runtime_field`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              name: 'runtimeComposite',
              runtimeField: {
                type: 'composite',
                script: {
                  source: 'emit("a","a"); emit("b","b")',
                },
                fields: {
                  a: {
                    type: 'keyword',
                  },
                  b: {
                    type: 'keyword',
                  },
                },
              },
            });

          expect(response5.status).to.be(400);
        });
      });
    });
  });
}
