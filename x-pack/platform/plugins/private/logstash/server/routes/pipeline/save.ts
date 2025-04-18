/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import { wrapRouteWithLicenseCheck } from '@kbn/licensing-plugin/server';
import { Pipeline } from '../../models/pipeline';
import { checkLicense } from '../../lib/check_license';
import type { LogstashPluginRouter } from '../../types';

export function registerPipelineSaveRoute(router: LogstashPluginRouter) {
  router.put(
    {
      path: '/api/logstash/pipeline/{id}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        access: 'public',
        summary: `Create a managed Logstash pipeline`,
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          description: schema.maybe(schema.string()),
          pipeline: schema.string(),
          settings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
        }),
      },
    },
    wrapRouteWithLicenseCheck(
      checkLicense,
      router.handleLegacyErrors(async (context, request, response) => {
        const coreContext = await context.core;
        try {
          const user = coreContext.security.authc.getCurrentUser();
          const username = user?.username;

          const { client } = coreContext.elasticsearch;
          const pipeline = Pipeline.fromDownstreamJSON(request.body, request.params.id, username);

          await client.asCurrentUser.logstash.putPipeline({
            id: pipeline.id,
            // @ts-expect-error description is required
            body: pipeline.upstreamJSON,
          });

          return response.noContent();
        } catch (err) {
          const statusCode = err.statusCode;
          // handles the permissions issue of Elasticsearch
          if (statusCode === 403) {
            return response.forbidden({
              body: i18n.translate('xpack.logstash.insufficientUserPermissionsDescription', {
                defaultMessage: 'Insufficient user permissions for managing Logstash pipelines',
              }),
            });
          }
          throw err;
        }
      })
    )
  );
}
