/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import { useDefinedLocalStorage } from '../../../../hooks/use_stored_state';
import type { OnboardingCardComponent } from '../../../../../types';
import * as i18n from './translations';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { ConnectorCards } from '../../common/connectors/connector_cards';
import { CardSubduedText } from '../../common/card_subdued_text';
import type { AIConnectorCardMetadata } from './types';
import { MissingPrivilegesCallOut } from '../../common/connectors/missing_privileges';
import type { AIConnector } from '../../common/connectors/types';

export const AIConnectorCard: OnboardingCardComponent<AIConnectorCardMetadata> = ({
  checkCompleteMetadata,
  checkComplete,
  setComplete,
}) => {
  const { siemMigrations } = useKibana().services;
  const [storedConnectorId, setStoredConnectorId] = useDefinedLocalStorage<string>(
    siemMigrations.rules.connectorIdStorage.key,
    ''
  );
  const setSelectedConnector = useCallback(
    (connector: AIConnector) => {
      setStoredConnectorId(connector.id);
      setComplete(true);
    },
    [setComplete, setStoredConnectorId]
  );

  if (!checkCompleteMetadata) {
    return (
      <OnboardingCardContentPanel>
        <CenteredLoadingSpinner />
      </OnboardingCardContentPanel>
    );
  }

  const { connectors, canExecuteConnectors, canCreateConnectors } = checkCompleteMetadata;

  return (
    <OnboardingCardContentPanel>
      {canExecuteConnectors ? (
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <CardSubduedText size="s">{i18n.AI_CONNECTOR_CARD_DESCRIPTION}</CardSubduedText>
          </EuiFlexItem>
          <EuiFlexItem>
            <ConnectorCards
              canCreateConnectors={canCreateConnectors}
              connectors={connectors}
              onNewConnectorSaved={checkComplete}
              selectedConnectorId={storedConnectorId}
              onConnectorSelected={setSelectedConnector}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <MissingPrivilegesCallOut />
      )}
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AIConnectorCard;
