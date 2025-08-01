/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const createQueryWrapperMock = (): {
  queryClient: QueryClient;
  wrapper: React.FC<{ children: React.ReactNode }>;
} => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      error: () => undefined,
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      log: () => undefined,
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      warn: () => undefined,
    },
  });

  return {
    queryClient,
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
};
