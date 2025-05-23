/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { encode } from '@kbn/rison';
import {
  ALL_VALUE,
  type CreateSLOInput,
  type CreateSLOResponse,
  type FindSLOResponse,
} from '@kbn/slo-schema';
import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { EuiLink } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { useKibana } from './use_kibana';
import { paths } from '../../common/locators/paths';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useCreateSlo() {
  const {
    i18n: i18nStart,
    theme,
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();
  const services = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<
    CreateSLOResponse,
    ServerError,
    { slo: CreateSLOInput },
    { previousData?: FindSLOResponse; queryKey?: QueryKey }
  >(
    ['createSlo'],
    ({ slo }) => {
      return sloClient.fetch(`POST /api/observability/slos 2023-10-31`, { params: { body: slo } });
    },
    {
      onSuccess: (data, { slo }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });

        const sloEditUrl = http.basePath.prepend(paths.sloEdit(data.id));
        const sloViewUrl = http.basePath.prepend(paths.sloDetails(data.id, ALL_VALUE));

        toasts.addSuccess(
          {
            title: toMountPoint(
              <RedirectAppLinks coreStart={services} data-test-subj="observabilityMainContainer">
                <FormattedMessage
                  id="xpack.slo.create.successNotification"
                  defaultMessage="Successfully created {name}. {editSLO} or {viewSLO}"
                  values={{
                    name: slo.name,
                    editSLO: (
                      <EuiLink data-test-subj="o11yUseCreateSloEditSloLink" href={sloEditUrl}>
                        {i18n.translate('xpack.slo.useCreateSlo.editSLOLinkLabel', {
                          defaultMessage: 'Edit SLO',
                        })}
                      </EuiLink>
                    ),
                    viewSLO: (
                      <EuiLink data-test-subj="o11yUseCreateSloViewSloLink" href={sloViewUrl}>
                        {i18n.translate('xpack.slo.useCreateSlo.viewSLOLinkLabel', {
                          defaultMessage: 'View SLO',
                        })}
                      </EuiLink>
                    ),
                  }}
                />
              </RedirectAppLinks>,
              {
                i18n: i18nStart,
                theme,
              }
            ),
          },
          {
            toastLifeTimeMs: 30000,
          }
        );
      },
      onError: (error, { slo }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.create.errorNotification', {
            defaultMessage: 'Something went wrong while creating {name}',
            values: { name: slo.name },
          }),
        });

        navigateToUrl(http.basePath.prepend(paths.sloCreateWithEncodedForm(encode(slo))));
      },
    }
  );
}
