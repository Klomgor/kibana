/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiIconTip,
  EuiText,
  EuiCodeBlock,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { msToPretty } from '../../lib';
import { HighlightDetailsTable } from './highlight_details_table';
import { Operation } from '../../types';

export interface Props {
  operation: Omit<Operation, 'children' | 'parent'>;
  shardName: string;
  indexName: string;
  onClose: () => void;
}

const FlyoutEntry = ({
  title,
  body,
}: {
  title: string | JSX.Element;
  body: string | JSX.Element;
}) => (
  <>
    <dt>{title}</dt>
    <dd>{body}</dd>
  </>
);

export const HighlightDetailsFlyout = ({ indexName, operation, shardName, onClose }: Props) => {
  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <EuiFlyout
      className="prfDevTool__details"
      onClose={() => onClose()}
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder={true}>
        <EuiText size="s" id={flyoutTitleId}>
          {indexName}
        </EuiText>
        <EuiText>{shardName}</EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <dl>
            {/* Type Entry */}
            <FlyoutEntry
              title={i18n.translate('xpack.searchProfiler.highlightDetails.typeTitle', {
                defaultMessage: 'Type',
              })}
              body={operation.query_type!}
            />
            {/* Description Entry */}
            <FlyoutEntry
              title={i18n.translate('xpack.searchProfiler.highlightDetails.descriptionTitle', {
                defaultMessage: 'Description',
              })}
              body={<EuiCodeBlock paddingSize="s">{operation.lucene!}</EuiCodeBlock>}
            />
            {/* Total Time Entry */}
            <FlyoutEntry
              title={
                <>
                  {i18n.translate('xpack.searchProfiler.highlightDetails.totalTimeTitle', {
                    defaultMessage: 'Total time',
                  })}{' '}
                  <EuiIconTip
                    type="info"
                    color="subdued"
                    content={i18n.translate(
                      'xpack.searchProfiler.highlightDetails.totalTimeTooltip',
                      {
                        defaultMessage:
                          'The total time spent at this query component, inclusive of children',
                      }
                    )}
                  />
                </>
              }
              body={msToPretty(operation.time, 3)}
            />
            {/* Self Time Entry */}
            <FlyoutEntry
              title={
                <>
                  {i18n.translate('xpack.searchProfiler.highlightDetails.selfTimeTitle', {
                    defaultMessage: 'Self time',
                  })}{' '}
                  <EuiIconTip
                    type="info"
                    color="subdued"
                    content={i18n.translate(
                      'xpack.searchProfiler.highlightDetails.selfTimeTooltip',
                      {
                        defaultMessage:
                          'The time spent by this query component alone, exclusive of children',
                      }
                    )}
                  />
                </>
              }
              body={msToPretty(operation.selfTime || 0, 3)}
            />
            {/* Breakdown Table Entry */}
            <FlyoutEntry
              title={i18n.translate('xpack.searchProfiler.highlightDetails.timingBreakdownTitle', {
                defaultMessage: 'Timing breakdown',
              })}
              body={<HighlightDetailsTable breakdown={operation.breakdown} />}
            />
          </dl>
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
