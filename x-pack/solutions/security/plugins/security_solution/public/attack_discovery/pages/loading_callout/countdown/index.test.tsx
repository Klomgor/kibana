/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { Countdown } from '.';
import { TestProviders } from '../../../../common/mock';
import { INFORMATION } from '../translations';
import { APPROXIMATE_TIME_REMAINING } from './translations';
import { useKibanaFeatureFlags } from '../../use_kibana_feature_flags';

jest.mock('../../use_kibana_feature_flags');

describe('Countdown', () => {
  const connectorIntervals: GenerationInterval[] = [
    {
      date: '2024-05-16T14:13:09.838Z',
      durationMs: 173648,
    },
    {
      date: '2024-05-16T13:59:49.620Z',
      durationMs: 146605,
    },
    {
      date: '2024-05-16T13:47:00.629Z',
      durationMs: 255163,
    },
  ];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllTimers();

    (useKibanaFeatureFlags as jest.Mock).mockReturnValue({
      attackDiscoveryAlertsEnabled: false,
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns null when connectorIntervals is empty', () => {
    const { container } = render(
      <TestProviders>
        <Countdown approximateFutureTime={null} connectorIntervals={[]} />
      </TestProviders>
    );

    expect(container.innerHTML).toEqual('');
  });

  it('renders the expected prefix', () => {
    render(
      <TestProviders>
        <Countdown approximateFutureTime={null} connectorIntervals={connectorIntervals} />
      </TestProviders>
    );

    expect(screen.getByTestId('prefix')).toHaveTextContent(APPROXIMATE_TIME_REMAINING);
  });

  it('renders the expected the timer text', () => {
    const approximateFutureTime = moment().add(1, 'minute').toDate();

    render(
      <TestProviders>
        <Countdown
          approximateFutureTime={approximateFutureTime}
          connectorIntervals={connectorIntervals}
        />
      </TestProviders>
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('timerText')).toHaveTextContent('00:59');
  });

  it('renders an accessible information button icon', () => {
    render(
      <TestProviders>
        <Countdown approximateFutureTime={null} connectorIntervals={connectorIntervals} />
      </TestProviders>
    );

    expect(screen.getByRole('button', { name: INFORMATION })).toBeInTheDocument();
  });
});
