/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/platform/packages/private/security/role_management_model',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/packages/private/security/role_management_model/**/*.{ts,tsx}',
  ],
  preset: '@kbn/test',
  rootDir: '../../../../../..',
  roots: ['<rootDir>/x-pack/platform/packages/private/security/role_management_model'],
};
