/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useMemo } from 'react';

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiBetaBadge,
  EuiTextAlign,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { isFullLicense } from '../license';
import { useMlKibana, useNavigateToPath } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';
import { MlPageHeader } from '../components/page_header';
import { ML_PAGES } from '../../locator';

function startTrialDescription() {
  return (
    <span>
      <FormattedMessage
        id="xpack.ml.datavisualizer.startTrial.fullMLFeaturesDescription"
        defaultMessage="To experience the full Machine Learning features that a {subscriptionsLink} offers, start a 30-day trial."
        values={{
          subscriptionsLink: (
            <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
              <FormattedMessage
                id="xpack.ml.datavisualizer.startTrial.subscriptionsLinkText"
                defaultMessage="Platinum or Enterprise subscription"
              />
            </EuiLink>
          ),
        }}
      />
    </span>
  );
}

export const DatavisualizerSelector: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const {
    services: {
      licenseManagement,
      http: { basePath },
      docLinks,
      dataVisualizer,
      uiSettings,
    },
  } = useMlKibana();
  const isEsqlEnabled = useMemo(() => uiSettings.get(ENABLE_ESQL), [uiSettings]);
  const helpLink = docLinks.links.ml.guide;
  const navigateToPath = useNavigateToPath();

  const startTrialVisible =
    licenseManagement !== undefined &&
    licenseManagement.enabled === true &&
    isFullLicense() === false;

  if (dataVisualizer === undefined) {
    // eslint-disable-next-line no-console
    console.error('File data visualizer plugin not available');
    return null;
  }
  const maxFileSize = dataVisualizer.getMaxBytesFormatted();

  return (
    <>
      <div data-test-subj="mlPageDataVisualizerSelector">
        <MlPageHeader>
          <FormattedMessage
            id="xpack.ml.datavisualizer.selector.dataVisualizerTitle"
            defaultMessage="Data Visualizer"
          />
        </MlPageHeader>

        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.ml.datavisualizer.selector.dataVisualizerDescription"
                defaultMessage="The Machine Learning Data Visualizer tool helps you understand your data,
                  by analyzing the metrics and fields in a log file or an existing Elasticsearch index."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGrid gutterSize="xl" columns={2} style={{ maxWidth: '1000px' }}>
          <EuiFlexItem>
            <EuiCard
              hasBorder
              icon={<EuiIcon size="xxl" type="addDataApp" />}
              title={
                <FormattedMessage
                  id="xpack.ml.datavisualizer.selector.importDataTitle"
                  defaultMessage="Visualize data from a file"
                />
              }
              description={
                <FormattedMessage
                  id="xpack.ml.datavisualizer.selector.importDataDescription"
                  defaultMessage="Import data from a log file. You can upload files up to {maxFileSize}."
                  values={{ maxFileSize }}
                />
              }
              footer={
                <EuiButton
                  target="_self"
                  onClick={() => navigateToPath('/filedatavisualizer')}
                  data-test-subj="mlDataVisualizerUploadFileButton"
                >
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.selector.uploadFileButtonLabel"
                    defaultMessage="Select file"
                  />
                </EuiButton>
              }
              data-test-subj="mlDataVisualizerCardImportData"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              hasBorder
              icon={<EuiIcon size="xxl" type="dataVisualizer" />}
              title={
                <FormattedMessage
                  id="xpack.ml.datavisualizer.selector.selectDataViewTitle"
                  defaultMessage="Visualize data from a data view"
                />
              }
              description={''}
              footer={
                <EuiButton
                  target="_self"
                  onClick={() => navigateToPath('/datavisualizer_index_select')}
                  data-test-subj="mlDataVisualizerSelectIndexButton"
                >
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.selector.selectDataViewButtonLabel"
                    defaultMessage="Select data view"
                  />
                </EuiButton>
              }
              data-test-subj="mlDataVisualizerCardIndexData"
            />
          </EuiFlexItem>
          {isEsqlEnabled ? (
            <EuiFlexItem>
              <EuiCard
                hasBorder
                icon={<EuiIcon size="xxl" type="dataVisualizer" />}
                title={
                  <EuiTextAlign textAlign="center">
                    <>
                      <FormattedMessage
                        id="xpack.ml.datavisualizer.selector.selectESQLTitle"
                        defaultMessage="Visualize data using ES|QL"
                      />{' '}
                      <EuiBetaBadge
                        label=""
                        iconType="beaker"
                        size="m"
                        color="hollow"
                        tooltipContent={
                          <FormattedMessage
                            id="xpack.ml.datavisualizer.selector.esqlTechnicalPreviewBadge.titleMsg"
                            defaultMessage="ES|QL data visualizer is in technical preview."
                          />
                        }
                        tooltipPosition={'right'}
                      />
                    </>
                  </EuiTextAlign>
                }
                description={
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.selector.technicalPreviewBadge.contentMsg"
                    defaultMessage="Use ES|QL queries to visualize information about any data set."
                  />
                }
                footer={
                  <EuiButton
                    target="_self"
                    onClick={() => navigateToPath(ML_PAGES.DATA_VISUALIZER_ESQL)}
                    data-test-subj="mlDataVisualizerSelectESQLButton"
                  >
                    <FormattedMessage
                      id="xpack.ml.datavisualizer.selector.useESQLButtonLabel"
                      defaultMessage="Use ES|QL"
                    />
                  </EuiButton>
                }
                data-test-subj="mlDataVisualizerCardESQLData"
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGrid>
        {startTrialVisible === true && (
          <Fragment>
            <EuiSpacer size="xxl" />
            <EuiSpacer size="xxl" />
            <EuiFlexGrid gutterSize="xl" columns={2} style={{ maxWidth: '1000px' }}>
              <EuiFlexItem>
                <EuiCard
                  hasBorder
                  title={
                    <FormattedMessage
                      id="xpack.ml.datavisualizer.selector.startTrialTitle"
                      defaultMessage="Start trial"
                    />
                  }
                  description={startTrialDescription()}
                  footer={
                    <EuiButton
                      target="_blank"
                      href={`${basePath.get()}/app/management/stack/license_management/home`}
                      data-test-subj="mlDataVisualizerStartTrialButton"
                    >
                      <FormattedMessage
                        id="xpack.ml.datavisualizer.selector.startTrialButtonLabel"
                        defaultMessage="Start trial"
                      />
                    </EuiButton>
                  }
                  data-test-subj="mlDataVisualizerCardStartTrial"
                />
              </EuiFlexItem>
            </EuiFlexGrid>
          </Fragment>
        )}
      </div>
      <HelpMenu docLink={helpLink} />
    </>
  );
};
