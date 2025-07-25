/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asBigNumber } from '../../../../common/utils/formatters';

export const TOGGLE_BUTTON_WIDTH = 20;
interface Props {
  isOpen: boolean;
  childrenCount: number;
  onClick: () => void;
}
export function ToggleAccordionButton({ isOpen, childrenCount, onClick }: Props) {
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      justifyContent="center"
      responsive={false}
      css={{ position: 'relative', width: `${TOGGLE_BUTTON_WIDTH}px` }}
      data-test-subj="toggleAccordionButton"
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault(); // Prevent scroll if Space is pressed
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={i18n.translate('xpack.apm.toggleAccordionButton', {
        defaultMessage: 'Toggle accordion',
      })}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type={isOpen ? 'arrowDown' : 'arrowRight'} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translate(0, -50%)',
          }}
        >
          <EuiToolTip content={childrenCount} delay="long">
            <EuiText size="xs">{asBigNumber(childrenCount)}</EuiText>
          </EuiToolTip>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
