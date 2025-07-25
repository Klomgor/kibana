/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deanonymize } from './deanonymize';
import {
  Anonymization,
  AssistantMessage,
  Message,
  MessageRole,
  UserMessage,
} from '@kbn/inference-common';

function createMask(entityClass: string, value: string) {
  return `${entityClass}_${Buffer.from(value).toString('hex').slice(0, 40)}`;
}

describe('deanonymize', () => {
  describe('email mask', () => {
    const value = 'jorge@gmail.com';
    const mask = createMask('EMAIL', value);

    const anonymization: Anonymization = {
      entity: {
        class_name: 'EMAIL',
        value,
        mask,
      },
      rule: {
        type: 'RegExp',
      },
    };

    it('restores plain user message content and returns correct positions', () => {
      const message: UserMessage = {
        role: MessageRole.User,
        content: `My email is ${mask}.`,
      };

      const { message: deanonymized, deanonymizations } = deanonymize(message, [anonymization]);

      expect((deanonymized as UserMessage).content).toBe(`My email is ${value}.`);

      const startIndex = `My email is `.length;
      expect(deanonymizations).toEqual([
        {
          start: startIndex,
          end: startIndex + value.length,
          entity: anonymization.entity,
        },
      ]);
    });

    it('restores assistant message tool call arguments as well as content', () => {
      const toolMask = mask;
      const assistantMsg: AssistantMessage = {
        role: MessageRole.Assistant,
        content: `Your email is ${toolMask}`,
        toolCalls: [
          {
            function: {
              name: 'sendEmail',
              arguments: { to: toolMask },
            },
            toolCallId: '1',
          },
        ],
      };

      const { message: deanonymized } = deanonymize(assistantMsg, [anonymization]);

      expect(deanonymized.content).toContain(value);
      const args = (
        deanonymized as AssistantMessage & {
          toolCalls: [{ function: { arguments: { to: string } } }];
        }
      ).toolCalls?.[0].function.arguments;
      expect(args.to).toBe(value);
    });
  });

  describe('multiple entities offset regression', () => {
    it('keeps second entity indices correct after first replacement', () => {
      const name = 'Jorge';
      const city = 'Mission Viejo';

      const nameMask = createMask('PER', name);
      const cityMask = createMask('LOC', city);

      const anonymizations: Anonymization[] = [
        { entity: { class_name: 'PER', value: name, mask: nameMask }, rule: { type: 'NER' } },
        { entity: { class_name: 'LOC', value: city, mask: cityMask }, rule: { type: 'NER' } },
      ];

      const originalMsg: UserMessage = {
        role: MessageRole.User,
        content: `${nameMask} is from ${cityMask}`,
      };

      const { message: deanonymized, deanonymizations } = deanonymize(originalMsg, anonymizations);

      // content restored
      const expectedContent = `${name} is from ${city}`;
      expect(deanonymized.content).toBe(expectedContent);

      // offsets must point to correct substrings
      const nameStart = 0;
      const nameEnd = name.length;
      const cityStart = expectedContent.indexOf(city);
      const cityEnd = cityStart + city.length;

      expect(deanonymizations).toEqual(
        expect.arrayContaining([
          { start: nameStart, end: nameEnd, entity: anonymizations[0].entity },
          { start: cityStart, end: cityEnd, entity: anonymizations[1].entity },
        ])
      );
    });
  });

  it('handles no anonymizations gracefully (returns identical message)', () => {
    const msg: Message = { role: MessageRole.User, content: 'Nothing to change' } as any;
    const { message: result, deanonymizations } = deanonymize(msg, []);
    expect(result).toStrictEqual(msg);
    expect(deanonymizations.length).toBe(0);
  });
});
