/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import { RouteMap, Router } from './types';

const RouterContext = createContext<Router<any> | undefined>(undefined);

export const RouterContextProvider = ({
  router,
  children,
}: {
  router: Router<RouteMap>;
  children: React.ReactNode;
}) => <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;

export function useRouter<TRouteMap extends RouteMap = RouteMap>(): Router<TRouteMap> {
  const router = useContext(RouterContext);

  if (!router) {
    throw new Error('Router not found in context');
  }

  return router as Router<TRouteMap>;
}
