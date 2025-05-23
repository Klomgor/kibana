/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { ALERT_STATUS } from '@kbn/rule-data-utils';

import { useAlertsCount } from './use_alerts_count';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { InfraClientStartDeps } from '../types';
import { coreMock } from '@kbn/core/public/mocks';
import type { CoreStart } from '@kbn/core/public';

const mockedAlertsCountResponse = {
  aggregations: {
    count: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'active',
          doc_count: 2,
        },
        {
          key: 'recovered',
          doc_count: 20,
        },
      ],
    },
  },
};

const expectedResult = {
  activeAlertCount: 2,
  recoveredAlertCount: 20,
};

jest.mock('@kbn/kibana-react-plugin/public');
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const mockedPostAPI = jest.fn();

const mockUseKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...coreMock.createStart(),
      http: { post: mockedPostAPI },
    },
  } as unknown as KibanaReactContextValue<Partial<CoreStart> & Partial<InfraClientStartDeps>>);
};

describe('useAlertsCount', () => {
  const ruleTypeIds = ['metrics.alert.inventory.threshold'];
  const consumers = ['foo'];

  beforeAll(() => {
    mockUseKibana();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the mocked data from API', async () => {
    mockedPostAPI.mockResolvedValue(mockedAlertsCountResponse);

    const { result } = renderHook(() => useAlertsCount({ ruleTypeIds }));

    expect(result.current.loading).toBe(true);
    expect(result.current.alertsCount).toEqual(undefined);

    await waitFor(() => new Promise((resolve) => resolve(null)));

    const { alertsCount, loading, error } = result.current;
    expect(alertsCount).toEqual(expectedResult);
    expect(loading).toBeFalsy();
    expect(error).toBeFalsy();
  });

  it('should call API with correct input', async () => {
    const ruleId = 'c95bc120-1d56-11ed-9cc7-e7214ada1128';
    const query = {
      term: {
        'kibana.alert.rule.uuid': ruleId,
      },
    };
    mockedPostAPI.mockResolvedValue(mockedAlertsCountResponse);

    renderHook(() =>
      useAlertsCount({
        ruleTypeIds,
        consumers,
        query,
      })
    );

    const body = JSON.stringify({
      aggs: {
        count: {
          terms: { field: ALERT_STATUS },
        },
      },
      rule_type_ids: ruleTypeIds,
      consumers,
      query,
      size: 0,
    });

    await waitFor(() =>
      expect(mockedPostAPI).toHaveBeenCalledWith(
        '/internal/rac/alerts/find',
        expect.objectContaining({ body })
      )
    );
  });

  it('should return error if API call fails', async () => {
    const error = new Error('Fetch Alerts Count Failed');
    mockedPostAPI.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAlertsCount({ ruleTypeIds }));

    await waitFor(() => expect(result.current.error?.message).toMatch(error.message));
  });
});
