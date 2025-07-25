/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiHighlight, EuiToolTip } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { getDataViewFieldSubtypeMulti } from '@kbn/es-query';
import { getFieldTypeName } from '@kbn/field-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldIcon, FieldIconProps } from '@kbn/react-field';
import React from 'react';

interface Props {
  fieldName: string;
  displayNameOverride?: string;
  fieldType?: string;
  fieldMapping?: DataViewField;
  fieldIconProps?: Omit<FieldIconProps, 'type'>;
  scripted?: boolean;
  highlight?: string;
}

export function FieldName({
  fieldName,
  fieldMapping,
  fieldType,
  fieldIconProps,
  displayNameOverride,
  scripted = false,
  highlight = '',
}: Props) {
  const typeName = getFieldTypeName(fieldType);
  const fieldMappingDisplayName = fieldMapping?.displayName ? fieldMapping.displayName : fieldName;
  const fieldDisplayName = displayNameOverride ?? fieldMappingDisplayName;

  const tooltip = fieldDisplayName !== fieldName ? `${fieldDisplayName} (${fieldName})` : fieldName;
  const subTypeMulti = fieldMapping && getDataViewFieldSubtypeMulti(fieldMapping.spec);
  const isMultiField = !!subTypeMulti?.multi;

  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          responsive={false}
          alignItems="center"
          direction="row"
          wrap={false}
          className="kbnDocViewer__fieldName_icon"
        >
          <EuiFlexItem grow={false}>
            <FieldIcon type={fieldType!} label={typeName} scripted={scripted} {...fieldIconProps} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center" direction="row" wrap>
          <EuiFlexItem
            className="kbnDocViewer__fieldName eui-textBreakAll"
            grow={false}
            data-test-subj={`tableDocViewRow-${fieldName}-name`}
          >
            <EuiToolTip
              position="top"
              content={tooltip}
              delay="long"
              anchorClassName="eui-textBreakAll"
            >
              <EuiHighlight search={highlight}>{fieldDisplayName}</EuiHighlight>
            </EuiToolTip>
          </EuiFlexItem>

          {isMultiField && (
            <EuiToolTip
              position="top"
              delay="long"
              content={i18n.translate(
                'unifiedDocViewer.fieldChooser.discoverField.multiFieldTooltipContent',
                {
                  defaultMessage: 'Multi-fields can have multiple values per field',
                }
              )}
            >
              <EuiBadge
                title=""
                className="kbnDocViewer__fieldName_multiFieldBadge"
                color="default"
                data-test-subj={`tableDocViewRow-${fieldName}-multifieldBadge`}
              >
                <FormattedMessage
                  id="unifiedDocViewer.fieldChooser.discoverField.multiField"
                  defaultMessage="multi-field"
                />
              </EuiBadge>
            </EuiToolTip>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
