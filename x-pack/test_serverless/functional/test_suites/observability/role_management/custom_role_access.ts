/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'timePicker', 'common', 'header']);
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  let roleAuthc: RoleCredentials;

  describe('With custom role', function () {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await samlAuth.setCustomRole({
        elasticsearch: {
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
        },
        kibana: [
          {
            feature: {
              discover: ['read'],
            },
            spaces: ['*'],
          },
        ],
      });
      // login with custom role
      await pageObjects.svlCommonPage.loginWithCustomRole();
      await pageObjects.svlCommonPage.assertUserAvatarExists();
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
      if (roleAuthc) {
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      }
      // delete custom role
      await samlAuth.deleteCustomRole();
    });

    it('should have limited navigation menu', async () => {
      await pageObjects.svlCommonPage.assertUserAvatarExists();
      // discover navigation link is present
      await testSubjects.existOrFail('~nav-item-id-discover');

      // all other links in navigation menu are hidden
      await testSubjects.missingOrFail('~nav-item-id-dashboards');
      await testSubjects.missingOrFail('~nav-item-id-observability-overview:alerts');
      await testSubjects.missingOrFail('~nav-item-id-observability-overview:cases');
      await testSubjects.missingOrFail('~nav-item-id-slo');
      await testSubjects.missingOrFail('~nav-item-id-aiops');
      await testSubjects.missingOrFail('~nav-item-id-inventory');
      await testSubjects.missingOrFail('~nav-item-id-apm');
      await testSubjects.missingOrFail('~nav-item-id-metrics');
      await testSubjects.missingOrFail('~nav-item-id-synthetics');

      // TODO: 'Add data' and 'Project Settings' should be hidden
      // await testSubjects.missingOrFail('~nav-item-id-observabilityOnboarding');
      // await testSubjects.missingOrFail('~nav-item-id-project_settings_project_nav');
    });

    it('should access Discover app', async () => {
      await pageObjects.common.navigateToApp('discover');
      await pageObjects.timePicker.setDefaultAbsoluteRange();
      await pageObjects.header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
      expect(await testSubjects.exists('discoverQueryHits')).to.be(true);
    });

    it('should access console with API key', async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithCustomRoleScope();
      const { body } = await supertestWithoutAuth
        .get('/api/console/api_server')
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .set({ 'kbn-xsrf': 'true' })
        .expect(200);
      expect(body.es).to.be.ok();
    });
  });
}
