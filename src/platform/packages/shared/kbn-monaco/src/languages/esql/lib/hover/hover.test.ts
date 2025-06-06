/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ESQLFieldWithMetadata,
  getFunctionDefinition,
  getFunctionSignatures,
} from '@kbn/esql-validation-autocomplete';
import { modeDescription } from '@kbn/esql-validation-autocomplete/src/autocomplete/commands/enrich/util';
import { ENRICH_MODES } from '@kbn/esql-validation-autocomplete/src/definitions/commands_helpers';
import { FieldType } from '@kbn/esql-validation-autocomplete/src/definitions/types';
import { monaco } from '../../../../monaco_imports';
import { getHoverItem } from './hover';

const types: FieldType[] = ['keyword', 'double', 'date', 'boolean', 'ip'];

const fields: Array<ESQLFieldWithMetadata & { suggestedAs?: string }> = [
  ...types.map((type) => ({
    name: `${type}Field`,
    type,
  })),
  { name: 'any#Char$Field', type: 'double', suggestedAs: '`any#Char$Field`' },
  { name: 'kubernetes.something.something', type: 'double' },
];

const indexes = (
  [] as Array<{ name: string; hidden: boolean; suggestedAs: string | undefined }>
).concat(
  ['a', 'index', 'otherIndex', '.secretIndex', 'my-index'].map((name) => ({
    name,
    hidden: name.startsWith('.'),
    suggestedAs: undefined,
  })),
  ['my-index[quoted]', 'my-index$', 'my_index{}'].map((name) => ({
    name,
    hidden: false,
    suggestedAs: `\`${name}\``,
  }))
);
const policies = [
  {
    name: 'policy',
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: undefined,
  },
  ...['my-policy[quoted]', 'my-policy$', 'my_policy{}'].map((name) => ({
    name,
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: `\`${name}\``,
  })),
];

function createCustomCallbackMocks(
  customFields: ESQLFieldWithMetadata[] | undefined,
  customSources: Array<{ name: string; hidden: boolean }> | undefined,
  customPolicies:
    | Array<{
        name: string;
        sourceIndices: string[];
        matchField: string;
        enrichFields: string[];
      }>
    | undefined
) {
  const finalFields = customFields || fields;
  const finalSources = customSources || indexes;
  const finalPolicies = customPolicies || policies;
  return {
    getFieldsFor: jest.fn(async () => finalFields),
    getSources: jest.fn(async () => finalSources),
    getPolicies: jest.fn(async () => finalPolicies),
  };
}

function createModelAndPosition(text: string, string: string) {
  return {
    model: {
      getValue: () => text,
      getLineCount: () => text.split('\n').length,
      getLineMaxColumn: (lineNumber: number) => text.split('\n')[lineNumber - 1].length,
    } as unknown as monaco.editor.ITextModel,
    // bumo the column by one as the internal logic has a -1 offset when converting frmo monaco
    position: { lineNumber: 1, column: text.lastIndexOf(string) + 1 } as monaco.Position,
  };
}

describe('hover', () => {
  type TestArgs = [
    string,
    string,
    (n: string) => string[],
    Parameters<typeof createCustomCallbackMocks>?
  ];

  const testHoverFn = (
    statement: string,
    triggerString: string,
    contentFn: (name: string) => string[],
    customCallbacksArgs: Parameters<typeof createCustomCallbackMocks> = [
      undefined,
      undefined,
      undefined,
    ],
    { only, skip }: { only?: boolean; skip?: boolean } = {}
  ) => {
    const { model, position } = createModelAndPosition(statement, triggerString);
    const testFn = only ? test.only : skip ? test.skip : test;
    const expected = contentFn(triggerString);

    testFn(
      `${statement} (hover: "${triggerString}" @ ${position.column} - ${
        position.column + triggerString.length
      })=> ["${expected.join('","')}"]`,
      async () => {
        const callbackMocks = createCustomCallbackMocks(...customCallbacksArgs);
        const { contents } = await getHoverItem(model, position, callbackMocks);
        expect(contents.map(({ value }) => value)).toEqual(expected);
      }
    );
  };

  // Enrich the function to work with .only and .skip as regular test function
  const testHover = Object.assign(testHoverFn, {
    skip: (...args: TestArgs) => {
      const paddingArgs = [[undefined, undefined, undefined]].slice(args.length - 1);
      return testHoverFn(...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs), {
        skip: true,
      });
    },
    only: (...args: TestArgs) => {
      const paddingArgs = [[undefined, undefined, undefined]].slice(args.length - 1);
      return testHoverFn(...((args.length > 1 ? [...args, ...paddingArgs] : args) as TestArgs), {
        only: true,
      });
    },
  });

  describe('policies', () => {
    function createPolicyContent(
      policyName: string,
      customPolicies: Array<(typeof policies)[number]> = policies
    ) {
      const policyHit = customPolicies.find((p) => p.name === policyName);
      if (!policyHit) {
        return [];
      }
      return [
        `**Indexes**: ${policyHit.sourceIndices.join(', ')}`,
        `**Matching field**: ${policyHit.matchField}`,
        `**Fields**: ${policyHit.enrichFields.join(', ')}`,
      ];
    }
    testHover(`from a | enrich policy on b with var0 = stringField`, 'policy', createPolicyContent);
    testHover(`from a | enrich policy`, 'policy', createPolicyContent);
    testHover(`from a | enrich policy on b `, 'policy', createPolicyContent);
    testHover(`from a | enrich policy on b `, 'non-policy', createPolicyContent);

    describe('ccq mode', () => {
      for (const mode of ENRICH_MODES) {
        testHover(`from a | enrich _${mode.name}:policy`, `_${mode.name}`, () => [
          modeDescription,
          `**${mode.name}**: ${mode.description}`,
        ]);
      }
    });
  });
  describe('functions', () => {
    function createFunctionContent(fn: string) {
      const fnDefinition = getFunctionDefinition(fn);
      if (!fnDefinition) {
        return [];
      }
      return [getFunctionSignatures(fnDefinition)[0].declaration, fnDefinition.description];
    }
    testHover(`from a | eval round(numberField)`, 'round', createFunctionContent);
    testHover(`from a | eval nonExistentFn(numberField)`, 'nonExistentFn', createFunctionContent);
    testHover(`from a | stats avg(round(numberField))`, 'round', () => {
      return [
        '**Acceptable types**: **double** | **integer** | **long**',
        ...createFunctionContent('round'),
      ];
    });
    testHover(`from a | stats avg(round(numberField))`, 'avg', createFunctionContent);
    testHover(`from a | stats avg(nonExistentFn(numberField))`, 'nonExistentFn', () => [
      '**Acceptable types**: **double** | **integer** | **long**',
      ...createFunctionContent('nonExistentFn'),
    ]);
    testHover(`from a | where round(numberField) > 0`, 'round', createFunctionContent);
  });
});
