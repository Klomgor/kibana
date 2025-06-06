/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';

import { Paywall } from '../components/paywall';
import { useSecurityContext } from '../hooks/use_security_context';
import { SecuritySolutionPluginTemplateWrapper } from './security_solution_plugin_template_wrapper';

export const EnterpriseGuard = memo<PropsWithChildren<unknown>>(({ children }) => {
  const { licenseService } = useSecurityContext();

  if (licenseService.isEnterprise()) {
    return <>{children}</>;
  }

  return <SecuritySolutionPluginTemplateWrapper isEmptyState emptyPageBody={<Paywall />} />;
});

EnterpriseGuard.displayName = 'EnterpriseGuard';
