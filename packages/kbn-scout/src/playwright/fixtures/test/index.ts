/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeTests } from '@playwright/test';
import { browserAuthFixture } from './browser_auth';
import { scoutPageFixture } from './page';
import { pageObjectsFixture } from './page_objects';
import { validateTagsFixture } from './validate_tags';

export const scoutTestFixtures = mergeTests(
  browserAuthFixture,
  scoutPageFixture,
  pageObjectsFixture,
  validateTagsFixture
);
