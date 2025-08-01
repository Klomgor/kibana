/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import _ from 'lodash';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Test usage of different index patterns APIs in combination
 */
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('integration', () => {
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

    it('create an index pattern, add a runtime field, add a field formatter, then re-create the same index pattern', async () => {
      const title = `basic_index*`;
      const response1 = await supertestWithoutAuth
        .post('/api/index_patterns/index_pattern')
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          override: true,
          index_pattern: {
            title,
          },
        });
      const id = response1.body.index_pattern.id;
      const response2 = await supertestWithoutAuth
        .post(`/api/index_patterns/index_pattern/${id}/runtime_field`)
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
        .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          fields: {
            runtimeBar: {
              count: 123,
              customLabel: 'test',
            },
          },
        });

      expect(response3.status).to.be(200);

      const response4 = await supertestWithoutAuth
        .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/fields`)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          fields: {
            runtimeBar: {
              format: {
                id: 'duration',
                params: { inputFormat: 'milliseconds', outputFormat: 'humanizePrecise' },
              },
            },
          },
        });

      expect(response4.status).to.be(200);

      const response5 = await supertestWithoutAuth
        .get('/api/index_patterns/index_pattern/' + response1.body.index_pattern.id)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);

      expect(response5.status).to.be(200);

      const resultIndexPattern = response5.body.index_pattern;

      const runtimeField = resultIndexPattern.fields.runtimeBar;
      expect(runtimeField.name).to.be('runtimeBar');
      expect(runtimeField.runtimeField.type).to.be('long');
      expect(runtimeField.runtimeField.script.source).to.be("emit(doc['field_name'].value)");
      expect(runtimeField.scripted).to.be(false);

      expect(resultIndexPattern.fieldFormats.runtimeBar.id).to.be('duration');
      expect(resultIndexPattern.fieldFormats.runtimeBar.params.inputFormat).to.be('milliseconds');
      expect(resultIndexPattern.fieldFormats.runtimeBar.params.outputFormat).to.be(
        'humanizePrecise'
      );

      expect(resultIndexPattern.fieldAttrs.runtimeBar.count).to.be(123);
      expect(resultIndexPattern.fieldAttrs.runtimeBar.customLabel).to.be('test');

      // check that retrieved object is transient and a clone can be created
      const response6 = await supertestWithoutAuth
        .post('/api/index_patterns/index_pattern')
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          override: true,
          index_pattern: resultIndexPattern,
        });

      expect(response6.status).to.be(200);
      const recreatedIndexPattern = response6.body.index_pattern;

      expect(_.omit(recreatedIndexPattern, 'version', 'namespaces')).to.eql(
        _.omit(resultIndexPattern, 'version', 'namespaces')
      );
    });
  });
}
