/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { docLinks } from '../../../common/doc_links';
import { getExampleCode, getExistingIndexExampleCode } from './code_examples';

interface ConnectToApiFlyoutProps {
  onClose: () => void;
  rulesetId: string;
}

export const ConnectToApiFlyout: React.FC<ConnectToApiFlyoutProps> = ({ onClose, rulesetId }) => {
  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>
                {i18n.translate('xpack.searchSynonyms.ConnectToApiFlyout.title', {
                  defaultMessage: 'Connect with the API',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.searchSynonyms.ConnectToApiFlyout.description', {
                  defaultMessage: 'You can access and manage this synonym set from the API.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiLink
              data-test-subj="searchSynonymsConnectToApiFlyoutViewFullApiReferenceLink"
              href={docLinks.synonymsApi}
              external
            >
              {i18n.translate('xpack.searchSynonyms.ConnectToApiFlyout.viewFullApiReference', {
                defaultMessage: 'View full API reference',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.searchSynonyms.ConnectToApiFlyout.description', {
              defaultMessage: `You can specify the analyzer that contains your synonyms set as a search time analyzer.`,
            })}
            <EuiSpacer size="s" />
            {i18n.translate('xpack.searchSynonyms.ConnectToApiFlyout.description.example', {
              defaultMessage: `The following example adds my_analyzer as a search analyzer to the title field in an index mapping`,
            })}
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiAccordion
          id="connectToIndexNewIndexAccordion"
          buttonContent={
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.searchSynonyms.ConnectToApiFlyout.exampleButton.newIndex', {
                  defaultMessage: 'Assigning to a new index',
                })}
              </h3>
            </EuiTitle>
          }
          initialIsOpen
        >
          <EuiSpacer size="m" />
          <EuiThemeProvider colorMode="dark">
            <EuiCodeBlock language="json" isCopyable fontSize="m">
              {getExampleCode(rulesetId)}
            </EuiCodeBlock>
          </EuiThemeProvider>
        </EuiAccordion>
        <EuiSpacer size="l" />
        <EuiAccordion
          id="connectToIndexExistingIndexAccordion"
          buttonContent={
            <EuiTitle size="xs">
              <h3>
                {i18n.translate(
                  'xpack.searchSynonyms.ConnectToApiFlyout.exampleButton.existingIndex',
                  {
                    defaultMessage: 'Assigning to an existing index',
                  }
                )}
              </h3>
            </EuiTitle>
          }
          initialIsOpen
        >
          <EuiSpacer size="m" />
          <EuiThemeProvider colorMode="dark">
            <EuiCodeBlock language="json" isCopyable fontSize="m">
              {getExistingIndexExampleCode(rulesetId)}
            </EuiCodeBlock>
          </EuiThemeProvider>
        </EuiAccordion>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              data-test-subj="searchSynonymsConnectToApiFlyoutButton"
              onClick={onClose}
            >
              {i18n.translate('xpack.searchSynonyms.ConnectToApiFlyout.close', {
                defaultMessage: 'Close',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
