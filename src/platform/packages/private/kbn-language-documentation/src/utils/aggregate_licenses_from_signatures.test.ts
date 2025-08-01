/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Signature } from '../types';
import { aggregateLicensesFromSignatures } from './aggregate_licenses_from_signatures';

describe('aggregateLicensesFromSignatures', () => {
  test('should groups parameter types by license', () => {
    const signatures: Signature[] = [
      {
        license: 'GOLD',
        params: [
          { name: 'param1', type: 'string' },
          { name: 'param2', type: 'number' },
        ],
      },
      {
        license: 'GOLD',
        params: [{ name: 'param3', type: 'boolean' }],
      },
      {
        license: 'PLATINUM',
        params: [{ name: 'param4', type: 'string' }],
      },
      {
        license: 'ENTERPRISE',
        params: [{ name: 'param5', type: 'object' }],
      },
      {
        license: 'BASIC',
        params: [{ name: 'param6', type: 'string' }],
      },
      {
        license: 'GOLD',
        params: [{} as any],
      },
    ];

    const result = aggregateLicensesFromSignatures(signatures);

    expect(result.size).toBe(4);
    expect(result.get('GOLD')).toEqual(new Set(['string', 'number', 'boolean']));
    expect(result.get('PLATINUM')).toEqual(new Set(['string']));
    expect(result.get('ENTERPRISE')).toEqual(new Set(['object']));
    expect(result.get('BASIC')).toEqual(new Set(['string']));
  });

  test('should returns an empty map when input is empty', () => {
    const result = aggregateLicensesFromSignatures([]);
    expect(result.size).toBe(0);
  });

  test('should handles signatures with empty params', () => {
    const signatures: Signature[] = [
      {
        license: 'GOLD',
        params: [],
      },
    ];
    const result = aggregateLicensesFromSignatures(signatures);
    expect(result.get('GOLD')).toEqual(new Set());
  });
});
