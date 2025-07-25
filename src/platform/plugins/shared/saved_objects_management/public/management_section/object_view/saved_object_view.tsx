/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { get } from 'lodash';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  Capabilities,
  OverlayStart,
  NotificationsStart,
  ScopedHistory,
  HttpSetup,
  IUiSettingsClient,
  DocLinksStart,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { css } from '@emotion/react';
import { Header, Inspect, NotFoundErrors } from './components';
import { bulkDeleteObjects, bulkGetObjects } from '../../lib';
import { SavedObjectWithMetadata } from '../../types';

export interface SavedObjectEditionProps {
  id: string;
  savedObjectType: string;
  http: HttpSetup;
  capabilities: Capabilities;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  notFoundType?: string;
  history: ScopedHistory;
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart['links'];
  settings: SettingsStart;
  theme: ThemeServiceStart;
}
export interface SavedObjectEditionState {
  type: string;
  object?: SavedObjectWithMetadata<any>;
}

const unableFindSavedObjectNotificationMessage = i18n.translate(
  'savedObjectsManagement.objectView.unableFindSavedObjectNotificationMessage',
  { defaultMessage: 'Unable to find saved object' }
);
export class SavedObjectEdition extends Component<
  SavedObjectEditionProps,
  SavedObjectEditionState
> {
  constructor(props: SavedObjectEditionProps) {
    super(props);

    const { savedObjectType: type } = props;

    this.state = {
      object: undefined,
      type,
    };
  }

  componentDidMount() {
    const { http, id, notifications } = this.props;
    const { type } = this.state;
    bulkGetObjects(http, [{ type, id }])
      .then(([object]) => {
        if (object.error) {
          const { message } = object.error;
          notifications.toasts.addDanger({
            title: unableFindSavedObjectNotificationMessage,
            text: message,
          });
        } else {
          this.setState({ object });
        }
      })
      .catch((err) => {
        notifications.toasts.addDanger({
          title: unableFindSavedObjectNotificationMessage,
          text: err.message ?? 'Unknown error',
        });
      });
  }

  canViewInApp(capabilities: Capabilities, obj?: SavedObjectWithMetadata<any>) {
    return obj && obj.meta.inAppUrl
      ? get(capabilities, obj?.meta.inAppUrl?.uiCapabilitiesPath, false) &&
          Boolean(obj?.meta.inAppUrl?.path)
      : false;
  }

  render() {
    const { capabilities, notFoundType, http, uiSettings, docLinks, settings, theme } = this.props;
    const { object } = this.state;
    const { delete: canDelete } = capabilities.savedObjectsManagement as Record<string, boolean>;
    const canView = this.canViewInApp(capabilities, object);
    return (
      <KibanaContextProvider services={{ uiSettings, settings, theme }}>
        <EuiFlexGroup direction="column" data-test-subject="savedObjectsEdit" css={styles}>
          <EuiFlexItem grow={false}>
            <Header
              canDelete={canDelete && !object?.meta.hiddenType}
              canViewInApp={canView}
              onDeleteClick={() => this.delete()}
              viewUrl={http.basePath.prepend(object?.meta.inAppUrl?.path || '')}
              title={object?.meta.title}
            />
          </EuiFlexItem>
          {notFoundType && (
            <EuiFlexItem grow={false}>
              <NotFoundErrors type={notFoundType} docLinks={docLinks} />
            </EuiFlexItem>
          )}
          {object && (
            <EuiFlexItem grow={true}>
              <Inspect object={object} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </KibanaContextProvider>
    );
  }

  async delete() {
    const { http, id, overlays, notifications } = this.props;
    const { type, object } = this.state;

    const confirmed = await overlays.openConfirm(
      i18n.translate('savedObjectsManagement.deleteConfirm.modalDescription', {
        defaultMessage: 'This action permanently removes the object from Kibana.',
      }),
      {
        confirmButtonText: i18n.translate(
          'savedObjectsManagement.deleteConfirm.modalDeleteButtonLabel',
          {
            defaultMessage: 'Delete',
          }
        ),
        title: i18n.translate('savedObjectsManagement.deleteConfirm.modalTitle', {
          defaultMessage: `Delete ''{title}''?`,
          values: {
            title: object?.meta?.title || 'saved Kibana object',
          },
        }),
        buttonColor: 'danger',
      }
    );
    if (!confirmed) {
      return;
    }

    const [{ success, error }] = await bulkDeleteObjects(http, [{ id, type }]);
    if (!success) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'savedObjectsManagement.objectView.unableDeleteSavedObjectNotificationMessage',
          {
            defaultMessage: `Failed to delete ''{title}'' {type} object`,
            values: {
              type,
              title: object?.meta?.title,
            },
          }
        ),
        text: error?.message,
      });

      return;
    }

    notifications.toasts.addSuccess(
      i18n.translate('savedObjectsManagement.objectView.deleteSavedObjectNotificationMessage', {
        defaultMessage: `Deleted ''{title}'' {type} object`,
        values: {
          type,
          title: object?.meta?.title,
        },
      })
    );
    this.redirectToListing();
  }

  redirectToListing() {
    this.props.history.push('/');
  }
}

const styles = css({
  height: '100%',
});
