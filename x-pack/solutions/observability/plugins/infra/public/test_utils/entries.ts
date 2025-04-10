/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import type { LogEntry, LogViewColumnConfiguration } from '@kbn/logs-shared-plugin/common';

export function generateFakeEntries(
  count: number,
  startTimestamp: number,
  endTimestamp: number,
  columns: LogViewColumnConfiguration[]
): LogEntry[] {
  const entries: LogEntry[] = [];
  const timestampStep = Math.floor((endTimestamp - startTimestamp) / count);
  for (let i = 0; i < count; i++) {
    const timestamp = i === count - 1 ? endTimestamp : startTimestamp + timestampStep * i;
    const date = new Date(timestamp).toISOString();

    entries.push({
      id: `entry-${i}`,
      index: 'logs-fake',
      context: {},
      cursor: { time: date, tiebreaker: i },
      columns: columns.map((column) => {
        if ('timestampColumn' in column) {
          return { columnId: column.timestampColumn.id, time: date };
        } else if ('messageColumn' in column) {
          return {
            columnId: column.messageColumn.id,
            message: [{ field: 'message', value: [fakeColumnValue('message')], highlights: [] }],
          };
        } else {
          return {
            columnId: column.fieldColumn.id,
            field: column.fieldColumn.field,
            value: [fakeColumnValue(column.fieldColumn.field)],
            highlights: [],
          };
        }
      }),
    });
  }

  return entries;
}

function fakeColumnValue(field: string): string {
  switch (field) {
    case 'message':
      return faker.helpers.fake(
        '{{internet.ip}} - [{{date.past}}] "GET {{internet.url}} HTTP/1.1" 200 {{number.int}} "-" "{{internet.userAgent}}"'
      );
    case 'event.dataset':
      return faker.helpers.fake('{{hacker.noun}}.{{hacker.noun}}');
    case 'log.file.path':
      return faker.system.filePath();
    case 'log.level':
      return faker.helpers.arrayElement(['debug', 'info', 'warn', 'error']);
    case 'host.name':
      return faker.hacker.noun();
    default:
      return faker.lorem.sentence();
  }
}
