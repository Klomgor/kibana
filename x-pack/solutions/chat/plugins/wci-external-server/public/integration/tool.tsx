/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IntegrationToolComponentProps } from '@kbn/wci-browser';

const bold = css`
  font-weight: bold;
`;

const italic = css`
  font-style: italic;
`;

export const ExternalServerTool: React.FC<IntegrationToolComponentProps> = ({
  toolCall,
  toolResult,
}) => {
  const toolNode = (
    <EuiTextColor className={bold} color="success">
      {toolCall.toolName}
    </EuiTextColor>
  );
  const argsNode = (
    <EuiTextColor className={italic} color="accent">
      {JSON.stringify(toolCall.args)}
    </EuiTextColor>
  );

  if (toolResult) {
    return (
      <EuiText size="s">
        <FormattedMessage
          id="xpack.workchatApp.wci_external_server.chat.toolCall.calledToolLabel"
          defaultMessage="called external server {tool} with arguments {args}"
          values={{
            tool: toolNode,
            args: argsNode,
          }}
        />
      </EuiText>
    );
  } else {
    return (
      <EuiText size="s">
        <FormattedMessage
          id="xpack.workchatApp.wci_external_server.chat.toolCall.callingToolLabel"
          defaultMessage="called external server {tool} with arguments {args}"
          values={{
            tool: toolNode,
            args: argsNode,
          }}
        />
      </EuiText>
    );
  }
};
