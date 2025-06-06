/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';
import { buildPhrasesFilter, PhrasesFilter } from '@kbn/es-query';

import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { EuiLink, EuiSpacer, EuiText, EuiButton } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  APPS_WITH_DEPRECATION_LOGS,
  DEPRECATION_LOGS_ORIGIN_FIELD,
} from '../../../../../common/constants';
import { DataPublicPluginStart } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';
import { uiMetricService, UIM_DISCOVER_CLICK } from '../../../lib/ui_metric';

import { DEPRECATION_LOGS_INDEX_PATTERN } from '../../../../../common/constants';

interface Props {
  checkpoint: string;
  deprecationDataView: DataView;
  isButtonFormat: boolean;
  showInfoParagraph: boolean;
}

export const getDeprecationDataView = async (dataService: DataPublicPluginStart) => {
  const results = await dataService.dataViews.find(DEPRECATION_LOGS_INDEX_PATTERN);
  // Since the find might return also results with wildcard matchers we need to find the
  // index pattern that has an exact match with our title.
  const deprecationDataView = results.find(
    (result) => result.title === DEPRECATION_LOGS_INDEX_PATTERN
  );

  if (deprecationDataView) {
    return deprecationDataView;
  } else {
    // When creating the data view, we need to be careful when creating a data view
    // for an index that doesnt exist. Since the deprecation logs data stream is only created
    // when a deprecation log is indexed it could be possible that it might not exist at the
    // time we need to render the DiscoveryAppLink.
    // So in order to avoid those errors we need to make sure that the data view is created
    // with allowNoIndex and that we skip fetching fields to from the source index.
    const override = false;
    const skipFetchFields = true;
    // prettier-ignore
    const newDataView = await dataService.dataViews.createAndSave({
      title: DEPRECATION_LOGS_INDEX_PATTERN,
      allowNoIndex: true,
    }, override, skipFetchFields);

    return newDataView;
  }
};

const DiscoverAppLink: FunctionComponent<Omit<Props, 'showInfoParagraph'>> = ({
  checkpoint,
  deprecationDataView,
  isButtonFormat,
}) => {
  const {
    services: { data: dataService },
    plugins: { share },
  } = useAppContext();

  const [discoveryUrl, setDiscoveryUrl] = useState<string | undefined>();

  useEffect(() => {
    const getDiscoveryUrl = async () => {
      const locator = share.url.locators.get('DISCOVER_APP_LOCATOR');
      if (!locator) {
        return;
      }

      const field = deprecationDataView.getFieldByName(DEPRECATION_LOGS_ORIGIN_FIELD);

      let filters: PhrasesFilter[] = [];

      if (field !== undefined) {
        const filter = buildPhrasesFilter(
          field!,
          [...APPS_WITH_DEPRECATION_LOGS],
          deprecationDataView
        );
        filter.meta.negate = true;
        filters = [filter];
      }

      const url = await locator?.getUrl({
        indexPatternId: deprecationDataView.id,
        query: {
          language: 'kuery',
          query: `@timestamp > "${checkpoint}"`,
        },
        filters,
      });

      setDiscoveryUrl(url);
    };

    getDiscoveryUrl();
  }, [dataService, checkpoint, share.url.locators, deprecationDataView]);

  if (discoveryUrl === undefined) {
    return null;
  }

  const handleClick = () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DISCOVER_CLICK);
  };

  const content = (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.viewDiscoverResultsAction"
      defaultMessage="Analyze logs in Discover"
    />
  );

  return isButtonFormat ? (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiButton
      href={discoveryUrl}
      onClick={handleClick}
      data-test-subj="viewDiscoverLogsButton"
      fill
    >
      {content}
    </EuiButton>
  ) : (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={discoveryUrl} onClick={handleClick} data-test-subj="viewDiscoverLogs">
      <EuiText> {content}</EuiText>
    </EuiLink>
  );
};

export const DiscoverExternalLinks: FunctionComponent<Omit<Props, 'deprecationDataView'>> = ({
  checkpoint,
  showInfoParagraph,
  isButtonFormat,
}) => {
  const {
    services: { data: dataService },
    plugins: { share },
  } = useAppContext();

  const [deprecationDataView, setDeprecationDataView] = useState<DataView | undefined>();

  useEffect(() => {
    const getDataView = async () => {
      const dataView = await getDeprecationDataView(dataService);
      setDeprecationDataView(dataView);
    };
    getDataView();
  }, [dataService, checkpoint, share.url.locators]);

  return (
    <React.Fragment>
      {showInfoParagraph && (
        <>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.overview.observe.discoveryDescription"
                defaultMessage="Search and filter the deprecation logs to understand the types of changes you need to make."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      {deprecationDataView ? (
        <DiscoverAppLink
          checkpoint={checkpoint}
          deprecationDataView={deprecationDataView}
          isButtonFormat={isButtonFormat}
        />
      ) : null}
    </React.Fragment>
  );
};
