/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function combineToNdJson(...parts: unknown[]): string {
  return parts.map((p) => JSON.stringify(p)).join('\n');
}

export function combineArrayToNdJson(parts: unknown[]): string {
  return parts.map((p) => JSON.stringify(p)).join('\n');
}

export function parseNdJson(ndJson: Buffer): unknown[] {
  return ndJson
    .toString()
    .split('\n')
    .filter((line) => !!line)
    .map((line) => JSON.parse(line));
}
