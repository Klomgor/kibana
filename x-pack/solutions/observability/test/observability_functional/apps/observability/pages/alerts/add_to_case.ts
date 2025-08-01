/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const observability = getService('observability');
  const retry = getService('retry');

  describe('Observability alerts / Add to case >', function () {
    this.tags('includeFirefox');

    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/infra/simple_logs'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/infra/simple_logs'
      );
      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
    });

    describe('When user has all privileges for cases', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityCasesV3: ['all'],
            logs: ['all'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('renders case options in the overflow menu', async () => {
        await observability.alerts.common.openActionsMenuForRow(0);

        await retry.try(async () => {
          await observability.alerts.addToCase.getAddToExistingCaseSelectorOrFail();
          await observability.alerts.addToCase.getAddToNewCaseSelectorOrFail();
        });
      });

      it('opens a flyout when "Add to new case" is clicked', async () => {
        await retry.try(async () => {
          await observability.alerts.addToCase.addToNewCaseButtonClick();
        });

        await retry.try(async () => {
          await observability.alerts.addToCase.getCreateCaseFlyoutOrFail();
          await observability.alerts.addToCase.closeFlyout();
        });
      });

      it('opens a modal when Add to existing case is clicked', async () => {
        await observability.alerts.common.openActionsMenuForRow(0);

        await retry.try(async () => {
          await observability.alerts.addToCase.addToExistingCaseButtonClick();
          await observability.alerts.addToCase.getAddToExistingCaseModalOrFail();
        });
      });
    });

    describe('When user has read permissions for cases', () => {
      this.tags('skipFIPS');
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityCasesV3: ['read'],
            logs: ['all'],
          })
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('does not render case options in the overflow menu', async () => {
        await observability.alerts.common.openActionsMenuForRow(0);

        await retry.try(async () => {
          await observability.alerts.addToCase.missingAddToExistingCaseSelectorOrFail();
          await observability.alerts.addToCase.missingAddToNewCaseSelectorOrFail();
        });
      });
    });
  });
};
