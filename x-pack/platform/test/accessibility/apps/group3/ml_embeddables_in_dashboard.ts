/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datafeed, Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../ftr_provider_context';

// @ts-expect-error not full interface
const JOB_CONFIG: Job = {
  job_id: `fq_multi_1_ae`,
  description:
    'mean/min/max(responsetime) partition=airline on farequote dataset with 1h bucket span',
  groups: ['farequote', 'automated', 'multi-metric'],
  analysis_config: {
    bucket_span: '1h',
    influencers: ['airline'],
    detectors: [
      { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'min', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'max', field_name: 'responsetime', partition_field_name: 'airline' },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '20mb' },
  model_plot_config: { enabled: true },
};

// @ts-expect-error not full interface
const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_multi_1_ae',
  indices: ['ft_farequote'],
  job_id: 'fq_multi_1_ae',
  query: { bool: { must: [{ match_all: {} }] } },
};

const testDataList = [
  {
    suiteSuffix: 'with multi metric job',
    panelTitle: `ML anomaly charts for ${JOB_CONFIG.job_id}`,
    jobConfig: JOB_CONFIG,
    datafeedConfig: DATAFEED_CONFIG,
    expected: {
      influencers: [
        {
          field: 'airline',
          count: 10,
          labelsContained: ['AAL'],
        },
      ],
    },
  },
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const PageObjects = getPageObjects(['common', 'timePicker', 'dashboard']);
  const a11y = getService('a11y'); /* this is the wrapping service around axe */

  describe('machine learning embeddables anomaly charts Accessibility', function () {
    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();

      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await ml.securityUI.logout();

      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/ml/farequote');
    });

    for (const testData of testDataList) {
      describe(testData.suiteSuffix, function () {
        before(async () => {
          await ml.api.createAndRunAnomalyDetectionLookbackJob(
            testData.jobConfig,
            testData.datafeedConfig
          );
          await PageObjects.common.navigateToApp('dashboard');
        });

        after(async () => {
          await ml.api.cleanMlIndices();
        });

        it('can open job selection flyout', async () => {
          await PageObjects.dashboard.clickCreateDashboardPrompt();
          await ml.dashboardEmbeddables.assertDashboardIsEmpty();
          // FIXME remove sleep when https://github.com/elastic/kibana/issues/187587 if fixed
          await PageObjects.common.sleep(3000);
          await ml.dashboardEmbeddables.openAnomalyJobSelectionFlyout('ml_anomaly_charts');
          await a11y.testAppSnapshot();
        });

        it('can select jobs', async () => {
          await ml.alerting.selectJobs([testData.jobConfig.job_id]);
          await ml.alerting.assertJobSelection([testData.jobConfig.job_id]);
        });

        it('populates with default default info', async () => {
          await ml.dashboardEmbeddables.assertAnomalyChartsEmbeddableInitializerExists();
          await ml.dashboardEmbeddables.assertSelectMaxSeriesToPlotValue(6);
          await a11y.testAppSnapshot();
        });
        it('create new anomaly charts panel', async () => {
          await ml.dashboardEmbeddables.clickInitializerConfirmButtonEnabled();
          await ml.dashboardEmbeddables.assertDashboardPanelExists(testData.panelTitle);

          await ml.dashboardEmbeddables.assertNoMatchingAnomaliesMessageExists();
          await a11y.testAppSnapshot();
        });

        it('show anomaly charts', async () => {
          await PageObjects.timePicker.setAbsoluteRange(
            'Feb 7, 2016 @ 00:00:00.000',
            'Feb 11, 2016 @ 00:00:00.000'
          );
          await PageObjects.timePicker.pauseAutoRefresh();
          await ml.dashboardEmbeddables.assertAnomalyChartsSeverityThresholdControlExists();
          await ml.dashboardEmbeddables.assertAnomalyChartsExists();

          await a11y.testAppSnapshot();
        });
      });
    }
  });
}
