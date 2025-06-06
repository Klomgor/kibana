/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';

import { templatesConfigurationMock } from '../../containers/mock';
import { TemplatesList } from './templates_list';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../common/mock';

// FLAKY: https://github.com/elastic/kibana/issues/208265
describe.skip('TemplatesList', () => {
  const onDeleteTemplate = jest.fn();
  const onEditTemplate = jest.fn();

  const props = {
    templates: templatesConfigurationMock,
    onDeleteTemplate,
    onEditTemplate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    renderWithTestingProviders(<TemplatesList {...props} />);

    expect(screen.getByTestId('templates-list')).toBeInTheDocument();
  });

  it('renders all templates', async () => {
    renderWithTestingProviders(
      <TemplatesList {...{ ...props, templates: templatesConfigurationMock }} />
    );

    expect(await screen.findByTestId('templates-list')).toBeInTheDocument();

    templatesConfigurationMock.forEach((template) =>
      expect(screen.getByTestId(`template-${template.key}`)).toBeInTheDocument()
    );
  });

  it('renders template details correctly', async () => {
    renderWithTestingProviders(
      <TemplatesList {...{ ...props, templates: [templatesConfigurationMock[3]] }} />
    );

    const list = await screen.findByTestId('templates-list');

    expect(list).toBeInTheDocument();
    expect(
      await screen.findByTestId(`template-${templatesConfigurationMock[3].key}`)
    ).toBeInTheDocument();
    expect(await screen.findByText(`${templatesConfigurationMock[3].name}`)).toBeInTheDocument();

    const tags = templatesConfigurationMock[3].tags;

    tags?.forEach((tag, index) =>
      expect(
        screen.getByTestId(`${templatesConfigurationMock[3].key}-tag-${index}`)
      ).toBeInTheDocument()
    );
  });

  it('renders empty state correctly', () => {
    renderWithTestingProviders(<TemplatesList {...{ ...props, templates: [] }} />);

    expect(screen.queryAllByTestId(`template-`, { exact: false })).toHaveLength(0);
  });

  it('renders edit button', async () => {
    renderWithTestingProviders(
      <TemplatesList {...{ ...props, templates: [templatesConfigurationMock[0]] }} />
    );

    expect(
      await screen.findByTestId(`${templatesConfigurationMock[0].key}-template-edit`)
    ).toBeInTheDocument();
  });

  it('renders delete button', async () => {
    renderWithTestingProviders(
      <TemplatesList {...{ ...props, templates: [templatesConfigurationMock[0]] }} />
    );

    expect(
      await screen.findByTestId(`${templatesConfigurationMock[0].key}-template-delete`)
    ).toBeInTheDocument();
  });

  it('renders delete modal', async () => {
    renderWithTestingProviders(
      <TemplatesList {...{ ...props, templates: [templatesConfigurationMock[0]] }} />
    );

    await userEvent.click(
      await screen.findByTestId(`${templatesConfigurationMock[0].key}-template-delete`)
    );

    expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();
    expect(await screen.findByText('Delete')).toBeInTheDocument();
    expect(await screen.findByText('Cancel')).toBeInTheDocument();
  });

  it('calls onEditTemplate correctly', async () => {
    renderWithTestingProviders(<TemplatesList {...props} />);

    const list = await screen.findByTestId('templates-list');

    await userEvent.click(
      await within(list).findByTestId(`${templatesConfigurationMock[0].key}-template-edit`)
    );

    await waitFor(() => {
      expect(props.onEditTemplate).toHaveBeenCalledWith(templatesConfigurationMock[0].key);
    });
  });

  it('calls onDeleteTemplate correctly', async () => {
    renderWithTestingProviders(<TemplatesList {...props} />);

    const list = await screen.findByTestId('templates-list');

    await userEvent.click(
      await within(list).findByTestId(`${templatesConfigurationMock[0].key}-template-delete`)
    );

    expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByText('Delete'));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-delete-modal')).not.toBeInTheDocument();
    });

    expect(props.onDeleteTemplate).toHaveBeenCalledWith(templatesConfigurationMock[0].key);
  });
});
