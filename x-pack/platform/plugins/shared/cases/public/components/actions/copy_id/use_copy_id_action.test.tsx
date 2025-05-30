/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useCopyIDAction } from './use_copy_id_action';

import { basicCase } from '../../../containers/mock';
import { TestProviders } from '../../../common/mock';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';

jest.mock('../../../containers/api');

describe('useCopyIDAction', () => {
  const onActionSuccess = jest.fn();
  const originalClipboard = global.window.navigator.clipboard;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  it('renders a copy ID action with one case', async () => {
    const { result } = renderHook(() => useCopyIDAction({ onActionSuccess }), {
      wrapper: TestProviders,
    });

    expect(result.current.getAction(basicCase)).toMatchInlineSnapshot(`
      Object {
        "data-test-subj": "cases-action-copy-id",
        "icon": <EuiIcon
          size="m"
          type="copyClipboard"
        />,
        "key": "cases-action-copy-id",
        "name": <EuiTextColor>
          Copy case ID
        </EuiTextColor>,
        "onClick": [Function],
      }
    `);
  });

  it('copies the id of the selected case to the clipboard', async () => {
    const { result } = renderHook(() => useCopyIDAction({ onActionSuccess }), {
      wrapper: TestProviders,
    });

    const action = result.current.getAction(basicCase);

    action.onClick();

    await waitFor(() => {
      expect(onActionSuccess).toHaveBeenCalled();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicCase.id);
  });

  it('shows the success toaster correctly when copying the case id', async () => {
    const coreStart = coreMock.createStart();

    const { result } = renderHook(() => useCopyIDAction({ onActionSuccess }), {
      wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
    });

    const action = result.current.getAction(basicCase);

    action.onClick();

    await waitFor(() => {
      expect(onActionSuccess).toHaveBeenCalled();
    });

    expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Copied case ID to clipboard',
      className: 'eui-textBreakWord',
    });
  });
});
