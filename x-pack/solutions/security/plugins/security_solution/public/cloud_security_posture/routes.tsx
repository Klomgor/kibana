/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CLOUD_SECURITY_POSTURE_BASE_PATH } from '@kbn/cloud-security-posture-common';
import {
  type CspSecuritySolutionContext,
  type CloudSecurityPosturePageId,
} from '@kbn/cloud-security-posture-plugin/public';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { SecurityPageName } from '../app/types';
import type { SecuritySubPluginRoutes } from '../app/types';
import { useKibana } from '../common/lib/kibana';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { FiltersGlobal } from '../common/components/filters_global';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { useOnExpandableFlyoutClose } from '../flyout/shared/hooks/use_on_expandable_flyout_close';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

// This exists only for the type signature cast
const CloudPostureSpyRoute = ({ pageName, ...rest }: { pageName?: CloudSecurityPosturePageId }) => (
  <SpyRoute pageName={pageName as SecurityPageName | undefined} {...rest} />
);

const cspSecuritySolutionContext: CspSecuritySolutionContext = {
  getFiltersGlobalComponent: () => FiltersGlobal,
  getSpyRouteComponent: () => CloudPostureSpyRoute,
  useExpandableFlyoutApi,
  useOnExpandableFlyoutClose,
};

const CloudSecurityPosture = () => {
  const { cloudSecurityPosture } = useKibana().services;
  const CloudSecurityPostureRouter = cloudSecurityPosture.getCloudSecurityPostureRouter();

  return (
    <PluginTemplateWrapper>
      <CloudSecurityPostureRouter securitySolutionContext={cspSecuritySolutionContext} />
    </PluginTemplateWrapper>
  );
};

CloudSecurityPosture.displayName = 'CloudSecurityPosture';

export const routes: SecuritySubPluginRoutes = [
  {
    path: CLOUD_SECURITY_POSTURE_BASE_PATH,
    component: withSecurityRoutePageWrapper(
      CloudSecurityPosture,
      SecurityPageName.cloudSecurityPostureDashboard,
      { omitSpyRoute: true }
    ),
  },
];
