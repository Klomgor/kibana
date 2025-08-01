/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand } from '../../../types';
import { type ISuggestionItem, type ICommandContext, ICommandCallbacks } from '../../types';
import { pipeCompleteItem } from '../../complete_items';
import { buildConstantsDefinitions } from '../../../definitions/utils/literals';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  // test for a number and at least one whitespace char at the end of the query
  if (/[0-9]\s+$/.test(innerText)) {
    return [pipeCompleteItem];
  }

  return buildConstantsDefinitions(['.1', '.01', '.001'], '', undefined, {
    advanceCursorAndOpenSuggestions: true,
  });
}
