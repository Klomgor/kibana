/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boolean } from 'io-ts';
import { i18n } from '@kbn/i18n';
import { useState } from 'react';
import { API_BASE_PATH as LICENSE_MANAGEMENT_API_BASE_PATH } from '@kbn/license-management-plugin/common/constants';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useTrackedPromise } from './use_tracked_promise';
import { useKibanaContextForPlugin } from './use_kibana';

interface UseTrialStatusState {
  loadState: 'uninitialized' | 'pending' | 'resolved' | 'rejected';
  isTrialAvailable: boolean;
  checkTrialAvailability: () => void;
}

export function useTrialStatus(): UseTrialStatusState {
  const { services } = useKibanaContextForPlugin();
  const [isTrialAvailable, setIsTrialAvailable] = useState<boolean>(false);

  const [loadState, checkTrialAvailability] = useTrackedPromise(
    {
      createPromise: async () => {
        // since license_management plugin is not available in serverless this is to avoid the below api call
        if (services?.serverless) {
          return false;
        }
        const response = await services.http.get(`${LICENSE_MANAGEMENT_API_BASE_PATH}/start_trial`);
        return decodeOrThrow(boolean)(response);
      },
      onResolve: (response) => {
        setIsTrialAvailable(response);
      },
      onReject: () => {
        services.notifications.toasts.addDanger(
          i18n.translate('xpack.infra.trialStatus.trialStatusNetworkErrorMessage', {
            defaultMessage: 'We could not determine if the trial license is available',
          })
        );
      },
    },
    [services]
  );

  return {
    loadState: loadState.state,
    isTrialAvailable,
    checkTrialAvailability,
  };
}
