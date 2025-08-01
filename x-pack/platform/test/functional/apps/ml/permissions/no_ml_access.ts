/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USER } from '../../../services/ml/security_common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'error', 'dashboard']);
  const ml = getService('ml');
  const esArchiver = getService('esArchiver');

  const testUsers = [{ user: USER.ML_UNAUTHORIZED, discoverAvailable: true }];

  describe('for user with no ML access', function () {
    this.tags(['skipFirefox', 'ml']);

    for (const testUser of testUsers) {
      describe(`(${testUser.user})`, function () {
        before(async () => {
          await ml.securityUI.loginAs(testUser.user);
        });

        after(async () => {
          // NOTE: Logout needs to happen before anything else to avoid flaky behavior
          await ml.securityUI.logout();
        });

        it('should not allow access to the ML app', async () => {
          await ml.testExecution.logTestStep('should not load the ML overview page');
          await PageObjects.common.navigateToUrl('ml', '', {
            shouldLoginIfPrompted: false,
            ensureCurrentUrl: false,
          });

          await PageObjects.error.expectForbidden();
        });

        it('should not allow access to the ML sections in Stack Management', async () => {
          await ml.testExecution.logTestStep(
            'should not load the ML stack management overview page'
          );
          // Management ML sections are not registered and don't show up at all in the side nav when user does not have authorization.
          await ml.navigation.assertStackManagementMlSectionNotExist();
        });

        it('should not display the ML entry in Kibana app menu', async () => {
          await ml.testExecution.logTestStep('should open the Kibana app menu');
          await ml.navigation.navigateToKibanaHome();
          await ml.navigation.openKibanaNav();

          await ml.testExecution.logTestStep('should not display the ML nav link');
          await ml.navigation.assertKibanaNavMLEntryNotExists();
        });
      });
    }

    describe('for user with no ML access and Kibana features access', function () {
      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
        await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
        await ml.securityUI.loginAs(USER.ML_DISABLED);
        await ml.api.cleanMlIndices();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await ml.securityUI.logout();
      });

      it('should not register ML embeddables in the dashboard', async () => {
        await ml.testExecution.logTestStep(
          'should not contain ML embeddable in the Add panel list'
        );
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.clickCreateDashboardPrompt();
        await ml.dashboardEmbeddables.assertMlSectionExists(false);
      });
    });
  });
}
