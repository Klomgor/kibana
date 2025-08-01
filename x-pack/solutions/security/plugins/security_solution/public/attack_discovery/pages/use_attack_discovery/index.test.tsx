/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLoadConnectors } from '@kbn/elastic-assistant';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

import { useKibana } from '../../../common/lib/kibana';
import { usePollApi } from './use_poll_api/use_poll_api';
import { useAttackDiscovery } from '.';
import { ERROR_GENERATING_ATTACK_DISCOVERIES } from '../translations';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { createQueryWrapperMock } from '../../../common/__mocks__/query_wrapper';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

jest.mock('../use_kibana_feature_flags');

jest.mock('../../../assistant/use_assistant_availability', () => ({
  useAssistantAvailability: jest.fn(() => ({
    hasAssistantPrivilege: true,
    isAssistantEnabled: true,
    isAssistantVisible: true,
  })),
}));

jest.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields'
);
jest.mock('./use_poll_api/use_poll_api');
jest.mock('../../../common/lib/kibana');
const mockedUseKibana = mockUseKibana();

const mockAssistantAvailability = jest.fn(() => ({
  hasAssistantPrivilege: true,
}));
const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
  },
];
jest.mock('@kbn/elastic-assistant', () => ({
  AssistantOverlay: () => <div data-test-subj="assistantOverlay" />,
  useAssistantContext: () => ({
    alertsIndexPattern: 'alerts-index-pattern',
    assistantAvailability: mockAssistantAvailability(),
    knowledgeBase: {
      latestAlerts: 20,
    },
  }),
  useLoadConnectors: jest.fn(() => ({
    isFetched: true,
    data: mockConnectors,
  })),
}));
const mockAttackDiscoveryPost = {
  timestamp: '2024-06-13T17:50:59.409Z',
  id: 'f48da2ca-b63e-4387-82d7-1423a68500aa',
  backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
  createdAt: '2024-06-13T17:50:59.409Z',
  updatedAt: '2024-06-17T15:00:39.680Z',
  lastViewedAt: '2024-06-17T15:00:39.680Z',
  users: [
    {
      id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      name: 'elastic',
    },
  ],
  namespace: 'default',
  status: 'running',
  alertsContextCount: 20,
  apiConfig: {
    connectorId: 'my-gpt4o-ai',
    actionTypeId: '.gen-ai',
  },
  attackDiscoveries: [],
  replacements: { abcd: 'hostname' },
  generationIntervals: [
    {
      date: '2024-06-13T17:52:47.619Z',
      durationMs: 108214,
    },
  ],
  averageIntervalMs: 108214,
};

const mockAttackDiscoveries = [
  {
    summaryMarkdown:
      'A critical malware incident involving {{ host.name c1f9889f-1f6b-4abc-8e65-02de89fe1054 }} and {{ user.name 71ca47cf-082e-4d35-a8e7-6e4fa4e175da }} has been detected. The malware, identified as AppPool.vbs, was executed with high privileges and attempted to evade detection.',
    id: '2204421f-bb42-4b96-a200-016a5388a029',
    title: 'Critical Malware Incident on Windows Host',
    mitreAttackTactics: ['Initial Access', 'Execution', 'Defense Evasion'],
    alertIds: [
      '43cf228ce034aeeb89a1ef41cd7fcdef1a3db574fa5237badf1fa9eaa3425c21',
      '44ae9696784b3baeee75935f889e55ce77da338241230b5c488f90a8bace43e2',
      '2479b1b1007952d3b6dc26344c89f44c1bb396de56f1655eca408135b3d05af8',
    ],
    detailsMarkdown: 'details',
    entitySummaryMarkdown:
      '{{ host.name c1f9889f-1f6b-4abc-8e65-02de89fe1054 }} and {{ user.name 71ca47cf-082e-4d35-a8e7-6e4fa4e175da }} are involved in a critical malware incident.',
    timestamp: '2024-06-07T20:04:35.715Z',
  },
];
const setLoadingConnectorId = jest.fn();
const setStatus = jest.fn();

const SIZE = 20;

const { wrapper: queryWrapper } = createQueryWrapperMock();

describe('useAttackDiscovery', () => {
  const mockPollApi = {
    cancelAttackDiscovery: jest.fn(),
    data: null,
    pollApi: jest.fn(),
    status: 'succeeded',
    stats: null,
    setStatus,
    didInitialFetch: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(mockedUseKibana);
    (useFetchAnonymizationFields as jest.Mock).mockReturnValue({ data: [] });
    (usePollApi as jest.Mock).mockReturnValue(mockPollApi);
    (useKibanaFeatureFlags as jest.Mock).mockReturnValue({
      attackDiscoveryAlertsEnabled: false,
    });
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(
      () =>
        useAttackDiscovery({
          connectorId: 'test-id',
          setLoadingConnectorId,
          size: 20,
        }),
      {
        wrapper: queryWrapper,
      }
    );

    expect(result.current.alertsContextCount).toBeNull();
    expect(result.current.approximateFutureTime).toBeNull();
    expect(result.current.attackDiscoveries).toEqual([]);
    expect(result.current.failureReason).toBeNull();
    expect(result.current.generationIntervals).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastUpdated).toBeNull();
    expect(result.current.replacements).toEqual({});
    expect(mockPollApi.pollApi).toHaveBeenCalled();
    expect(setLoadingConnectorId).toHaveBeenCalledWith(null);
  });

  it('fetches attack discoveries and updates state correctly', async () => {
    (mockedUseKibana.services.http.fetch as jest.Mock).mockResolvedValue(mockAttackDiscoveryPost);

    const { result } = renderHook(
      () => useAttackDiscovery({ connectorId: 'test-id', size: SIZE }),
      {
        wrapper: queryWrapper,
      }
    );

    await act(async () => {
      await result.current.fetchAttackDiscoveries();
    });
    expect(mockedUseKibana.services.http.post).toHaveBeenCalledWith(
      '/internal/elastic_assistant/attack_discovery',
      {
        body: `{"alertsIndexPattern":"alerts-index-pattern","anonymizationFields":[],"replacements":{},"size":${SIZE},"subAction":"invokeAI","apiConfig":{"connectorId":"test-id","actionTypeId":".gen-ai"},"connectorName":"OpenAI connector"}`,
        version: '1',
      }
    );
    // called on mount
    expect(mockPollApi.pollApi).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith('running');
    expect(result.current.isLoadingPost).toBe(false);
  });

  it('handles fetch errors correctly', async () => {
    const errorMessage = 'Fetch error';
    const error = new Error(errorMessage);
    (mockedUseKibana.services.http.post as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => useAttackDiscovery({ connectorId: 'test-id', size: SIZE }),
      {
        wrapper: queryWrapper,
      }
    );

    await act(async () => {
      await result.current.fetchAttackDiscoveries();
    });

    expect(mockedUseKibana.services.notifications.toasts.addDanger).toHaveBeenCalledWith(error, {
      title: ERROR_GENERATING_ATTACK_DISCOVERIES,
      text: errorMessage,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoadingPost).toBe(false);
  });

  it('sets loading state based on poll status', async () => {
    (usePollApi as jest.Mock).mockReturnValue({ ...mockPollApi, status: 'running' });
    const { result } = renderHook(
      () =>
        useAttackDiscovery({
          connectorId: 'test-id',
          setLoadingConnectorId,
          size: SIZE,
        }),
      {
        wrapper: queryWrapper,
      }
    );

    expect(result.current.isLoading).toBe(true);
    expect(setLoadingConnectorId).toHaveBeenCalledWith('test-id');
  });

  it('sets state based off of poll data', () => {
    (usePollApi as jest.Mock).mockReturnValue({
      ...mockPollApi,
      data: {
        ...mockAttackDiscoveryPost,
        status: 'succeeded',
        attackDiscoveries: mockAttackDiscoveries,
        connectorId: 'test-id',
      },
      status: 'succeeded',
    });
    const { result } = renderHook(
      () => useAttackDiscovery({ connectorId: 'test-id', size: SIZE }),
      {
        wrapper: queryWrapper,
      }
    );

    expect(result.current.alertsContextCount).toEqual(20);
    // this is set from usePollApi
    expect(result.current.approximateFutureTime).toBeNull();

    expect(result.current.attackDiscoveries).toEqual(mockAttackDiscoveries);
    expect(result.current.failureReason).toBeNull();
    expect(result.current.generationIntervals).toEqual(mockAttackDiscoveryPost.generationIntervals);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastUpdated).toEqual(new Date(mockAttackDiscoveries[0].timestamp));
    expect(result.current.replacements).toEqual(mockAttackDiscoveryPost.replacements);
  });

  it('sets state based off of failed poll data', () => {
    (usePollApi as jest.Mock).mockReturnValue({
      ...mockPollApi,
      data: {
        ...mockAttackDiscoveryPost,
        status: 'failed',
        failureReason: 'something bad',
        connectorId: 'test-id',
      },
      status: 'failed',
    });
    const { result } = renderHook(
      () => useAttackDiscovery({ connectorId: 'test-id', size: SIZE }),
      {
        wrapper: queryWrapper,
      }
    );

    expect(result.current.failureReason).toEqual('something bad');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastUpdated).toEqual(null);
  });

  describe('when zero connectors are configured', () => {
    beforeEach(() => {
      (useLoadConnectors as jest.Mock).mockReturnValue({
        isFetched: true,
        data: [], // <-- zero connectors configured
      });

      renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: SIZE,
          }),
        {
          wrapper: queryWrapper,
        }
      );
    });

    afterEach(() => {
      (useLoadConnectors as jest.Mock).mockReturnValue({
        isFetched: true,
        data: mockConnectors,
      });
    });

    it('does NOT call pollApi when zero connectors are configured', () => {
      expect(mockPollApi.pollApi).not.toHaveBeenCalled();
    });
  });
});
