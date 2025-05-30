/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Find Conversations API endpoint
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';
import { ArrayFromString } from '@kbn/zod-helpers';

import { SortOrder } from '../common_attributes.gen';
import { ConversationResponse } from './common_attributes.gen';

/**
 * The field by which to sort the conversations. Possible values are `created_at`, `title`, and `updated_at`.
 */
export type FindConversationsSortField = z.infer<typeof FindConversationsSortField>;
export const FindConversationsSortField = z.enum(['created_at', 'title', 'updated_at']);
export type FindConversationsSortFieldEnum = typeof FindConversationsSortField.enum;
export const FindConversationsSortFieldEnum = FindConversationsSortField.enum;

export type FindConversationsRequestQuery = z.infer<typeof FindConversationsRequestQuery>;
export const FindConversationsRequestQuery = z.object({
  /**
   * A list of fields to include in the response. If omitted, all fields are returned.
   */
  fields: ArrayFromString(z.string()).optional(),
  /**
   * A search query to filter the conversations. Can match against titles, messages, or other conversation attributes.
   */
  filter: z.string().optional(),
  /**
   * The field by which to sort the results. Valid fields are `created_at`, `title`, and `updated_at`.
   */
  sort_field: FindConversationsSortField.optional(),
  /**
   * The order in which to sort the results. Can be either `asc` for ascending or `desc` for descending.
   */
  sort_order: SortOrder.optional(),
  /**
   * The page number of the results to retrieve. Default is 1.
   */
  page: z.coerce.number().int().min(1).optional().default(1),
  /**
   * The number of conversations to return per page. Default is 20.
   */
  per_page: z.coerce.number().int().min(0).optional().default(20),
});
export type FindConversationsRequestQueryInput = z.input<typeof FindConversationsRequestQuery>;

export type FindConversationsResponse = z.infer<typeof FindConversationsResponse>;
export const FindConversationsResponse = z.object({
  /**
   * The current page of the results.
   */
  page: z.number().int(),
  /**
   * The number of results returned per page.
   */
  perPage: z.number().int(),
  /**
   * The total number of conversations matching the filter criteria.
   */
  total: z.number().int(),
  /**
   * A list of conversations.
   */
  data: z.array(ConversationResponse),
});
