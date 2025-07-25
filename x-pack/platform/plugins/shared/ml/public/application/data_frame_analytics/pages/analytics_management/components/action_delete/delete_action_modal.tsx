/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiConfirmModal,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EUI_MODAL_CONFIRM_BUTTON,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { DeleteAction } from './use_delete_action';

export const DeleteActionModal: FC<DeleteAction> = ({
  closeModal,
  deleteAndCloseModal,
  deleteTargetIndex,
  deleteDataView,
  dataViewExists,
  isLoading,
  item,
  toggleDeleteIndex,
  toggleDeleteDataView,
  userCanDeleteIndex,
  userCanDeleteDataView,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  if (item === undefined) {
    return null;
  }

  const indexName = item.config.dest.index;

  return (
    <EuiConfirmModal
      data-test-subj="mlAnalyticsJobDeleteModal"
      aria-labelledby={modalTitleId}
      title={i18n.translate('xpack.ml.dataframe.analyticsList.deleteModalTitle', {
        defaultMessage: 'Delete {analyticsId}?',
        values: { analyticsId: item.config.id },
      })}
      titleProps={{ id: modalTitleId }}
      onCancel={closeModal}
      onConfirm={deleteAndCloseModal}
      cancelButtonText={i18n.translate('xpack.ml.dataframe.analyticsList.deleteModalCancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.ml.dataframe.analyticsList.deleteModalDeleteButton',
        {
          defaultMessage: 'Delete',
        }
      )}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      buttonColor="danger"
      confirmButtonDisabled={isLoading}
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          {userCanDeleteIndex && (
            <EuiSwitch
              data-test-subj="mlAnalyticsJobDeleteIndexSwitch"
              style={{ paddingBottom: 10 }}
              label={i18n.translate(
                'xpack.ml.dataframe.analyticsList.deleteDestinationIndexTitle',
                {
                  defaultMessage: 'Delete destination index {indexName}',
                  values: { indexName },
                }
              )}
              checked={deleteTargetIndex}
              onChange={toggleDeleteIndex}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          {userCanDeleteIndex && dataViewExists && (
            <>
              <EuiSpacer size="s" />
              <EuiSwitch
                data-test-subj="mlAnalyticsJobDeleteDataViewSwitch"
                label={i18n.translate(
                  'xpack.ml.dataframe.analyticsList.deleteTargetDataViewTitle',
                  {
                    defaultMessage: 'Delete data view {dataView}',
                    values: { dataView: indexName },
                  }
                )}
                checked={deleteDataView}
                onChange={toggleDeleteDataView}
                disabled={userCanDeleteDataView === false}
              />
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
};
