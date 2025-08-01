/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { Router } from '@kbn/shared-ux-router';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { TestProviders } from '../../common/mock';
import { ATTACK_DISCOVERY_PATH, SECURITY_FEATURE_ID } from '../../../common/constants';
import { mockHistory } from '../../common/utils/route/mocks';
import { AttackDiscoveryPage } from '.';
import { mockTimelines } from '../../common/mock/mock_timelines_plugin';
import { UpsellingProvider } from '../../common/components/upselling_provider';
import { mockFindAnonymizationFieldsResponse } from './mock/mock_find_anonymization_fields_response';
import {
  getMockUseAttackDiscoveriesWithCachedAttackDiscoveries,
  getMockUseAttackDiscoveriesWithNoAttackDiscoveriesLoading,
} from './mock/mock_use_attack_discovery';
import { ATTACK_DISCOVERY_PAGE_TITLE } from './page_title/translations';
import { useAttackDiscovery } from './use_attack_discovery';
import { useLoadConnectors } from '@kbn/elastic-assistant/impl/connectorland/use_load_connectors';

const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
  },
];

jest.mock('react-use/lib/useLocalStorage', () =>
  jest.fn().mockImplementation((key, defaultValue) => {
    // Return different values based on the localStorage key
    if (key.includes('START_LOCAL_STORAGE_KEY')) {
      return ['now-24h', jest.fn()];
    }
    if (key.includes('END_LOCAL_STORAGE_KEY')) {
      return ['now', jest.fn()];
    }
    if (key.includes('CONNECTOR_ID_LOCAL_STORAGE_KEY')) {
      return ['test-id', jest.fn()];
    }
    // For other keys, return the default value or 'test-id'
    return [defaultValue || 'test-id', jest.fn()];
  })
);
jest.mock('react-use/lib/useSessionStorage', () =>
  jest.fn().mockReturnValue([undefined, jest.fn()])
);

jest.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields',
  () => ({
    useFetchAnonymizationFields: jest.fn(() => mockFindAnonymizationFieldsResponse),
  })
);

jest.mock('@kbn/elastic-assistant/impl/connectorland/use_load_connectors', () => ({
  useLoadConnectors: jest.fn(() => ({
    isFetched: true,
    data: mockConnectors,
  })),
}));

jest.mock(
  '@kbn/elastic-assistant/impl/connectorland/connector_selector_inline/connector_selector_inline',
  () => ({
    ConnectorSelectorInline: () => null,
  })
);

const mockSecurityCapabilities = [`${SECURITY_FEATURE_ID}.show`];

jest.mock('../../common/links', () => ({
  useLinkInfo: () =>
    jest.fn().mockReturnValue({
      capabilities: mockSecurityCapabilities,
      globalNavPosition: 4,
      globalSearchKeywords: ['Attack discovery'],
      id: 'attack_discovery',
      path: '/attack_discovery',
      title: 'Attack discovery',
    }),
}));

jest.mock('./use_attack_discovery', () => ({
  useAttackDiscovery: jest.fn().mockReturnValue({
    approximateFutureTime: null,
    attackDiscoveries: [],
    cachedAttackDiscoveries: {},
    didInitialFetch: true,
    fetchAttackDiscoveries: jest.fn(),
    failureReason: null,
    generationIntervals: undefined,
    isLoading: false,
    isLoadingPost: false,
    lastUpdated: null,
    replacements: {},
  }),
}));

const mockFilterManager = createFilterManagerMock();

const stubSecurityDataView = createStubDataView({
  spec: {
    id: 'security',
    title: 'security',
  },
});

const mockDataViewsService = {
  ...dataViewPluginMocks.createStartContract(),
  get: () => Promise.resolve(stubSecurityDataView),
  clearInstanceCache: () => Promise.resolve(),
};

const mockUpselling = new UpsellingService();

const mockUseKibanaReturnValue = {
  services: {
    application: {
      capabilities: {
        [SECURITY_FEATURE_ID]: { crud_alerts: true, read_alerts: true },
      },
      navigateToUrl: jest.fn(),
    },
    cases: {
      helpers: {
        canUseCases: jest.fn().mockReturnValue({
          all: true,
          connectors: true,
          create: true,
          delete: true,
          push: true,
          read: true,
          settings: true,
          update: true,
        }),
      },
      hooks: {
        useCasesAddToExistingCase: jest.fn(),
        useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: jest.fn() }),
        useCasesAddToNewCaseFlyout: jest.fn(),
      },
      ui: { getCasesContext: mockCasesContext },
    },
    data: {
      query: {
        filterManager: mockFilterManager,
      },
    },
    dataViews: mockDataViewsService,
    docLinks: {
      links: {
        [SECURITY_FEATURE_ID]: {
          privileges: 'link',
        },
      },
    },
    featureFlags: {
      getBooleanValue: jest.fn().mockReturnValue(false), // legacy view enabled
    },
    notifications: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    }),
    sessionView: {
      getSessionView: jest.fn(() => <div />),
    },
    storage: {
      get: jest.fn(),
      set: jest.fn(),
    },
    theme: {
      getTheme: jest.fn().mockReturnValue({ darkMode: false }),
    },
    timelines: { ...mockTimelines },
    triggersActionsUi: {
      alertsTableConfigurationRegistry: {},
      getAlertsStateTable: () => <></>,
    },
    uiSettings: {
      get: jest.fn(),
    },
  },
};
jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => mockUseKibanaReturnValue,
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      addInfo: jest.fn(),
      remove: jest.fn(),
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
  };
});

const historyMock = {
  ...mockHistory,
  location: {
    hash: '',
    pathname: ATTACK_DISCOVERY_PATH,
    search: '',
    state: '',
  },
};

describe('AttackDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useLoadConnectors as jest.Mock).mockReturnValue({
      isFetched: true,
      data: mockConnectors,
    });
  });

  describe('page layout', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('renders the expected page title', () => {
      expect(screen.getByTestId('attackDiscoveryPageTitle')).toHaveTextContent(
        ATTACK_DISCOVERY_PAGE_TITLE
      );
    });

    it('renders the header', () => {
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('when there are no attack discoveries', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('does NOT render the animated logo', () => {
      expect(screen.queryByTestId('animatedLogo')).toBeNull();
    });

    it('does NOT render the summary', () => {
      expect(screen.queryByTestId('summary')).toBeNull();
    });

    it('does NOT render the loading callout', () => {
      expect(screen.queryByTestId('loadingCallout')).toBeNull();
    });

    it('renders the empty prompt', () => {
      expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
    });

    it('does NOT render attack discoveries', () => {
      expect(screen.queryAllByTestId('attackDiscovery')).toHaveLength(0);
    });

    it('does NOT render the upgrade call to action', () => {
      expect(screen.queryByTestId('upgrade')).toBeNull();
    });
  });

  describe('when connectors are configured and didInitialFetch is false', () => {
    beforeEach(() => {
      (useAttackDiscovery as jest.Mock).mockReturnValue({
        approximateFutureTime: null,
        attackDiscoveries: [],
        cachedAttackDiscoveries: {},
        didInitialFetch: false, // <-- didInitialFetch is false
        fetchAttackDiscoveries: jest.fn(),
        failureReason: null,
        generationIntervals: undefined,
        isLoading: false,
        isLoadingPost: false,
        lastUpdated: null,
        replacements: {},
      });

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('renders the animated logo, because connectors are configured and the initial fetch is pending', () => {
      expect(screen.getByTestId('animatedLogo')).toBeInTheDocument();
    });

    it('does NOT render the summary', () => {
      expect(screen.queryByTestId('summary')).toBeNull();
    });

    it('does NOT render the loading callout', () => {
      expect(screen.queryByTestId('loadingCallout')).toBeNull();
    });

    it('does NOT render the empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).toBeNull();
    });

    it('does NOT render attack discoveries', () => {
      expect(screen.queryAllByTestId('attackDiscovery')).toHaveLength(0);
    });

    it('does NOT render the upgrade call to action', () => {
      expect(screen.queryByTestId('upgrade')).toBeNull();
    });
  });

  describe('when connectors are configured, connectorId is undefined, and didInitialFetch is false', () => {
    // At least two connectors are required for this scenario,
    // because a single connector will be automatically selected,
    // which will set connectorId to a non-undefined value:
    const multipleMockConnectors: unknown[] = [
      {
        id: 'mock-connector-1',
        name: 'OpenAI connector 1',
        actionTypeId: '.gen-ai',
      },
      {
        id: 'mock-connector-2',
        name: 'OpenAI connector 2',
        actionTypeId: '.gen-ai',
      },
    ];

    beforeEach(() => {
      (useLoadConnectors as jest.Mock).mockReturnValue({
        isFetched: true,
        data: multipleMockConnectors, // <-- multiple connectors, so none are auto-selected
      });

      (useLocalStorage as jest.Mock).mockReturnValue([undefined, jest.fn()]); // <-- connectorId is undefined

      (useAttackDiscovery as jest.Mock).mockReturnValue({
        approximateFutureTime: null,
        attackDiscoveries: [],
        cachedAttackDiscoveries: {},
        didInitialFetch: false, // <-- didInitialFetch is false
        fetchAttackDiscoveries: jest.fn(),
        failureReason: null,
        generationIntervals: undefined,
        isLoading: false,
        isLoadingPost: false,
        lastUpdated: null,
        replacements: {},
      });

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('does NOT render the animated logo, because connectorId is undefined', () => {
      expect(screen.queryByTestId('animatedLogo')).toBeNull();
    });

    it('does NOT render the summary', () => {
      expect(screen.queryByTestId('summary')).toBeNull();
    });

    it('does NOT render the loading callout', () => {
      expect(screen.queryByTestId('loadingCallout')).toBeNull();
    });

    it('renders the empty prompt', () => {
      expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
    });

    it('does NOT render attack discoveries', () => {
      expect(screen.queryAllByTestId('attackDiscovery')).toHaveLength(0);
    });

    it('does NOT render the upgrade call to action', () => {
      expect(screen.queryByTestId('upgrade')).toBeNull();
    });
  });

  describe('when connectors are NOT configured and didInitialFetch is false', () => {
    beforeEach(() => {
      (useLoadConnectors as jest.Mock).mockReturnValue({
        isFetched: true,
        data: [], // <-- connectors are NOT configured
      });

      (useAttackDiscovery as jest.Mock).mockReturnValue({
        approximateFutureTime: null,
        attackDiscoveries: [],
        cachedAttackDiscoveries: {},
        didInitialFetch: false, // <-- didInitialFetch is false
        fetchAttackDiscoveries: jest.fn(),
        failureReason: null,
        generationIntervals: undefined,
        isLoading: false,
        isLoadingPost: false,
        lastUpdated: null,
        replacements: {},
      });

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('does NOT render the animated logo, because connectors are NOT configured', () => {
      expect(screen.queryByTestId('animatedLogo')).toBeNull();
    });

    it('does NOT render the summary', () => {
      expect(screen.queryByTestId('summary')).toBeNull();
    });

    it('does NOT render the loading callout', () => {
      expect(screen.queryByTestId('loadingCallout')).toBeNull();
    });

    it('does NOT render the empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).toBeNull();
    });

    it('does NOT render attack discoveries', () => {
      expect(screen.queryAllByTestId('attackDiscovery')).toHaveLength(0);
    });

    it('does NOT render the upgrade call to action', () => {
      expect(screen.queryByTestId('upgrade')).toBeNull();
    });
  });

  describe('when there are attack discoveries', () => {
    const mockUseAttackDiscoveriesResults = getMockUseAttackDiscoveriesWithCachedAttackDiscoveries(
      jest.fn()
    );
    const { attackDiscoveries } = mockUseAttackDiscoveriesResults;

    beforeEach(() => {
      (useAttackDiscovery as jest.Mock).mockReturnValue(mockUseAttackDiscoveriesResults);

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('does NOT render the animated logo', () => {
      expect(screen.queryByTestId('animatedLogo')).toBeNull();
    });

    it('renders the summary', () => {
      expect(screen.getByTestId('summary')).toBeInTheDocument();
    });

    it('does NOT render the loading callout', () => {
      expect(screen.queryByTestId('loadingCallout')).toBeNull();
    });

    it('renders the expected number of attack discoveries', () => {
      expect(screen.queryAllByTestId('attackDiscovery')).toHaveLength(attackDiscoveries.length);
    });

    it('does NOT render the empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).toBeNull();
    });

    it('does NOT render the upgrade call to action', () => {
      expect(screen.queryByTestId('upgrade')).toBeNull();
    });
  });

  describe('Alerts filtering feature', () => {
    let fetchAttackDiscoveriesMock: jest.Mock;
    beforeEach(() => {
      fetchAttackDiscoveriesMock = jest.fn();
      (useAttackDiscovery as jest.Mock).mockReturnValue({
        ...getMockUseAttackDiscoveriesWithCachedAttackDiscoveries(fetchAttackDiscoveriesMock),
      });

      // Override the localStorage mock to return proper values for this test
      (useLocalStorage as jest.Mock).mockImplementation((key: string) => {
        if (key.includes('attackDiscovery.start')) {
          return ['now-24h', jest.fn()];
        }
        if (key.includes('attackDiscovery.end')) {
          return ['now', jest.fn()];
        }
        if (key.includes('attackDiscovery.connectorId')) {
          return ['test-id', jest.fn()];
        }
        return [undefined, jest.fn()];
      });

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('invokes fetchAttackDiscoveries with the end, filter, size, and start parameters when the generate button is clicked,', () => {
      const generate = screen.getAllByTestId('generate');

      fireEvent.click(generate[0]);

      expect(fetchAttackDiscoveriesMock).toHaveBeenCalledWith({
        end: 'now',
        filter: undefined,
        overrideConnectorId: undefined,
        overrideEnd: undefined,
        overrideFilter: undefined,
        overrideSize: undefined,
        overrideStart: undefined,
        size: 100,
        start: 'now-24h',
      });
    });
  });

  describe('when loading', () => {
    beforeEach(() => {
      (useAttackDiscovery as jest.Mock).mockReturnValue(
        getMockUseAttackDiscoveriesWithNoAttackDiscoveriesLoading(jest.fn()) // <-- loading
      );

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('does NOT render the animated logo, because didInitialFetch is true', () => {
      expect(screen.queryByTestId('animatedLogo')).toBeNull();
    });

    it('does NOT render the summary', () => {
      expect(screen.queryByTestId('summary')).toBeNull();
    });

    it('renders the loading callout', () => {
      expect(screen.getByTestId('loadingCallout')).toBeInTheDocument();
    });

    it('does NOT render attack discoveries', () => {
      expect(screen.queryAllByTestId('attackDiscovery')).toHaveLength(0);
    });

    it('does NOT render the empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).toBeNull();
    });

    it('does NOT render the upgrade call to action', () => {
      expect(screen.queryByTestId('upgrade')).toBeNull();
    });
  });
});
