/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ConnectorTypesResponseV1 } from '../../../../common/routes/connector/response';
import type { ConnectorTypesRequestQueryV1 } from '../../../../common/routes/connector/apis/connector_types';
import { connectorTypesQuerySchemaV1 } from '../../../../common/routes/connector/apis/connector_types';
import { transformListTypesResponseV1 } from './transforms';
import type { ActionsRequestHandlerContext } from '../../../types';
import { BASE_ACTION_API_PATH } from '../../../../common';
import type { ILicenseState } from '../../../lib';
import { verifyAccessAndContext } from '../../verify_access_and_context';

export const listTypesRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector_types`,
      security: {
        authz: {
          enabled: false,
          reason: 'This API does not require any Kibana feature privileges.',
        },
      },
      options: {
        access: 'public',
        summary: `Get connector types`,
        description: 'You do not need any Kibana feature privileges to run this API.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        query: connectorTypesQuerySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();

        // Assert versioned inputs
        const query: ConnectorTypesRequestQueryV1 = req.query;

        const connectorTypes = await actionsClient.listTypes({
          featureId: query?.feature_id,
        });

        const responseBody: ConnectorTypesResponseV1[] =
          transformListTypesResponseV1(connectorTypes);

        return res.ok({ body: responseBody });
      })
    )
  );
};
