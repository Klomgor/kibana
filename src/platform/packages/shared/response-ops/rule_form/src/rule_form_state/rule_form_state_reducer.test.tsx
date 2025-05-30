/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useReducer } from 'react';
import { renderHook, act } from '@testing-library/react';
import { ruleFormStateReducer } from './rule_form_state_reducer';
import { RuleFormState } from '../types';
import { getAction } from '../common/test_utils/actions_test_utils';

jest.mock('../validation/validate_form', () => ({
  validateRuleBase: jest.fn(),
  validateRuleParams: jest.fn(),
}));

const { validateRuleBase, validateRuleParams } = jest.requireMock('../validation/validate_form');

validateRuleBase.mockReturnValue({});
validateRuleParams.mockReturnValue({});

const indexThresholdRuleType = {
  enabledInLicense: true,
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  actionGroups: [],
  defaultActionGroupId: 'threshold met',
  minimumLicenseRequired: 'basic',
  authorizedConsumers: {
    stackAlerts: {
      read: true,
      all: true,
    },
  },
  ruleTaskTimeout: '5m',
  doesSetRecoveryContext: true,
  hasAlertsMappings: true,
  id: '.index-threshold',
  name: 'Index threshold',
  category: 'management',
  producer: 'stackAlerts',
  alerts: {},
  is_exportable: true,
} as unknown as RuleFormState['selectedRuleType'];

const indexThresholdRuleTypeModel = {
  id: '.index-threshold',
  description: 'Alert when an aggregated query meets the threshold.',
  iconClass: 'alert',
  ruleParamsExpression: () => <div />,
  defaultActionMessage:
    'Rule {{rule.name}} is active for group {{context.group}}:\n\n- Value: {{context.value}}\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\n- Timestamp: {{context.date}}',
  requiresAppContext: false,
} as unknown as RuleFormState['selectedRuleTypeModel'];

const initialState: RuleFormState = {
  formData: {
    name: 'test-rule',
    tags: [],
    actions: [],
    params: {
      paramsValue: 'value-1',
    },
    schedule: { interval: '5m' },
    consumer: 'stackAlerts',
    notifyWhen: 'onActionGroupChange',
  },
  plugins: {} as unknown as RuleFormState['plugins'],
  selectedRuleType: indexThresholdRuleType,
  selectedRuleTypeModel: indexThresholdRuleTypeModel,
  multiConsumerSelection: 'stackAlerts',
  availableRuleTypes: [],
  validConsumers: [],
  connectors: [],
  connectorTypes: [],
  alertFields: [],
};

describe('ruleFormStateReducer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize properly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));
    expect(result.current[0]).toEqual(initialState);
  });

  test('setRule works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    const updatedRule = {
      name: 'test-rule-updated',
      tags: ['tag'],
      params: {
        test: 'hello',
      },
      actions: [],
      schedule: { interval: '2m' },
      consumer: 'logs',
    };

    act(() => {
      dispatch({
        type: 'setRule',
        payload: updatedRule,
      });
    });

    expect(result.current[0].formData).toEqual(updatedRule);
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setRuleProperty works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setRuleProperty',
        payload: {
          property: 'name',
          value: 'test-rule-name-updated',
        },
      });
    });

    expect(result.current[0].formData).toEqual({
      ...initialState.formData,
      name: 'test-rule-name-updated',
    });
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setName works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setName',
        payload: 'test-rule-name-updated',
      });
    });

    expect(result.current[0].formData).toEqual({
      ...initialState.formData,
      name: 'test-rule-name-updated',
    });
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setTags works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setTags',
        payload: ['tag1', 'tag2'],
      });
    });

    expect(result.current[0].formData).toEqual({
      ...initialState.formData,
      tags: ['tag1', 'tag2'],
    });
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setParams works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setParams',
        payload: {
          anotherParamsValue: 'value-2',
        },
      });
    });

    expect(result.current[0].formData).toEqual({
      ...initialState.formData,
      params: {
        anotherParamsValue: 'value-2',
      },
    });
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setParamsProperty works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setParamsProperty',
        payload: {
          property: 'anotherParamsValue',
          value: 'value-2',
        },
      });
    });

    expect(result.current[0].formData).toEqual({
      ...initialState.formData,
      params: {
        ...initialState.formData.params,
        anotherParamsValue: 'value-2',
      },
    });
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setSchedule works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setSchedule',
        payload: { interval: '10m' },
      });
    });

    expect(result.current[0].formData).toEqual({
      ...initialState.formData,
      schedule: { interval: '10m' },
    });
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setAlertDelay works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setAlertDelay',
        payload: { active: 5 },
      });
    });

    expect(result.current[0].formData).toEqual({
      ...initialState.formData,
      alertDelay: { active: 5 },
    });
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setNotifyWhen works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setNotifyWhen',
        payload: 'onActiveAlert',
      });
    });

    expect(result.current[0].formData).toEqual({
      ...initialState.formData,
      notifyWhen: 'onActiveAlert',
    });
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setConsumer works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setConsumer',
        payload: 'logs',
      });
    });

    expect(result.current[0].formData).toEqual({
      ...initialState.formData,
      consumer: 'logs',
    });
    expect(validateRuleBase).toHaveBeenCalled();
    expect(validateRuleParams).toHaveBeenCalled();
  });

  test('setMultiConsumer works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setMultiConsumer',
        payload: 'logs',
      });
    });

    expect(result.current[0].multiConsumerSelection).toEqual('logs');
    expect(validateRuleBase).not.toHaveBeenCalled();
    expect(validateRuleParams).not.toHaveBeenCalled();
  });

  test('setMetadata works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setMetadata',
        payload: {
          value1: 'value1',
          value2: 'value2',
        },
      });
    });

    expect(result.current[0].metadata).toEqual({
      value1: 'value1',
      value2: 'value2',
    });
    expect(validateRuleBase).not.toHaveBeenCalled();
    expect(validateRuleParams).not.toHaveBeenCalled();
  });

  test('addAction works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    const action = getAction('1');

    act(() => {
      dispatch({
        type: 'addAction',
        payload: action,
      });
    });

    expect(result.current[0].formData.actions).toEqual([action]);

    expect(validateRuleBase).toHaveBeenCalledWith(
      expect.objectContaining({
        formData: expect.objectContaining({ actions: [action] }),
      })
    );
    expect(validateRuleParams).toHaveBeenCalledWith(
      expect.objectContaining({
        formData: expect.objectContaining({ actions: [action] }),
      })
    );
  });

  test('removeAction works correctly', () => {
    const action1 = getAction('1');
    const action2 = getAction('2');

    const { result } = renderHook(() =>
      useReducer(ruleFormStateReducer, {
        ...initialState,
        formData: {
          ...initialState.formData,
          actions: [action1, action2],
        },
      })
    );

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'removeAction',
        payload: {
          uuid: action1.uuid!,
        },
      });
    });

    expect(result.current[0].formData.actions).toEqual([action2]);

    expect(validateRuleBase).toHaveBeenCalledWith(
      expect.objectContaining({
        formData: expect.objectContaining({ actions: [action2] }),
      })
    );
    expect(validateRuleParams).toHaveBeenCalledWith(
      expect.objectContaining({
        formData: expect.objectContaining({ actions: [action2] }),
      })
    );
  });

  test('setActionProperty works correctly', () => {
    const action = getAction('1');

    const { result } = renderHook(() =>
      useReducer(ruleFormStateReducer, {
        ...initialState,
        formData: {
          ...initialState.formData,
          actions: [action],
        },
      })
    );

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setActionProperty',
        payload: {
          uuid: action.uuid!,
          key: 'params',
          value: {
            test: 'value',
          },
        },
      });
    });

    const updatedAction = {
      ...action,
      params: {
        test: 'value',
      },
    };

    expect(result.current[0].formData.actions).toEqual([updatedAction]);

    expect(validateRuleBase).toHaveBeenCalledWith(
      expect.objectContaining({
        formData: expect.objectContaining({ actions: [updatedAction] }),
      })
    );
    expect(validateRuleParams).toHaveBeenCalledWith(
      expect.objectContaining({
        formData: expect.objectContaining({ actions: [updatedAction] }),
      })
    );
  });

  test('setActionParams works correctly', () => {
    const action = getAction('1');

    const { result } = renderHook(() =>
      useReducer(ruleFormStateReducer, {
        ...initialState,
        formData: {
          ...initialState.formData,
          actions: [action],
        },
      })
    );

    const dispatch = result.current[1];

    act(() => {
      dispatch({
        type: 'setActionParams',
        payload: {
          uuid: action.uuid!,
          value: {
            test: 'value',
          },
        },
      });
    });

    const updatedAction = {
      ...action,
      params: {
        test: 'value',
      },
    };

    expect(result.current[0].formData.actions).toEqual([updatedAction]);

    expect(validateRuleBase).toHaveBeenCalledWith(
      expect.objectContaining({
        formData: expect.objectContaining({ actions: [updatedAction] }),
      })
    );
    expect(validateRuleParams).toHaveBeenCalledWith(
      expect.objectContaining({
        formData: expect.objectContaining({ actions: [updatedAction] }),
      })
    );
  });

  test('setActionError works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    const action = getAction('1');

    act(() => {
      dispatch({
        type: 'setActionError',
        payload: {
          uuid: action.uuid!,
          errors: { ['property' as string]: 'something went wrong' },
        },
      });
    });

    expect(result.current[0].actionsErrors).toEqual({
      'uuid-action-1': { property: 'something went wrong' },
    });

    expect(validateRuleBase).not.toHaveBeenCalled();
    expect(validateRuleParams).not.toHaveBeenCalled();
  });

  test('setActionParamsError works correctly', () => {
    const { result } = renderHook(() => useReducer(ruleFormStateReducer, initialState));

    const dispatch = result.current[1];

    const action = getAction('1');

    act(() => {
      dispatch({
        type: 'setActionParamsError',
        payload: {
          uuid: action.uuid!,
          errors: { ['property' as string]: 'something went wrong' },
        },
      });
    });

    expect(result.current[0].actionsParamsErrors).toEqual({
      'uuid-action-1': { property: 'something went wrong' },
    });

    expect(validateRuleBase).not.toHaveBeenCalled();
    expect(validateRuleParams).not.toHaveBeenCalled();
  });
});
