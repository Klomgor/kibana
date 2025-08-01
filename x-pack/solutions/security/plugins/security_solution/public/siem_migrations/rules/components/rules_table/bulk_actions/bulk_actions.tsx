/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';
import { ReprocessFailedRulesButton } from './reprocess_failed_rules';

export interface BulkActionsProps {
  isTableLoading: boolean;
  numberOfFailedRules: number;
  numberOfTranslatedRules: number;
  numberOfSelectedRules: number;
  installTranslatedRule?: () => void;
  installSelectedRule?: () => void;
  reprocessFailedRules?: () => void;
}

/**
 * Collection of buttons to perform bulk actions on migration rules within the SIEM Rules Migrations table.
 */
export const BulkActions: React.FC<BulkActionsProps> = React.memo(
  ({
    isTableLoading,
    numberOfFailedRules,
    numberOfTranslatedRules,
    numberOfSelectedRules,
    installTranslatedRule,
    installSelectedRule,
    reprocessFailedRules,
  }) => {
    const disableInstallTranslatedRulesButton = isTableLoading || !numberOfTranslatedRules;
    const showInstallSelectedRulesButton = numberOfSelectedRules > 0;
    const showRetryFailedRulesButton = numberOfFailedRules > 0;
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
        {showInstallSelectedRulesButton && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="plusInCircle"
              color={'primary'}
              onClick={() => installSelectedRule?.()}
              disabled={isTableLoading}
              isLoading={isTableLoading}
              data-test-subj="installSelectedRulesButton"
              aria-label={i18n.INSTALL_SELECTED_ARIA_LABEL}
            >
              {i18n.INSTALL_SELECTED_RULES(numberOfSelectedRules)}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {showRetryFailedRulesButton && (
          <EuiFlexItem grow={false}>
            <ReprocessFailedRulesButton
              onClick={() => reprocessFailedRules?.()}
              isDisabled={isTableLoading}
              isLoading={isTableLoading}
              numberOfFailedRules={numberOfFailedRules}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plusInCircle"
            onClick={() => installTranslatedRule?.()}
            disabled={disableInstallTranslatedRulesButton}
            isLoading={isTableLoading}
            data-test-subj="installTranslatedRulesButton"
            aria-label={i18n.INSTALL_TRANSLATED_ARIA_LABEL}
          >
            {numberOfTranslatedRules > 0
              ? i18n.INSTALL_TRANSLATED_RULES(numberOfTranslatedRules)
              : i18n.INSTALL_TRANSLATED_RULES_EMPTY_STATE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
BulkActions.displayName = 'BulkActions';
