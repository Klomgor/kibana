/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ElasticsearchConfigType {
  elasticsearch_url?: string;
}

export type SolutionType = 'search' | 'elasticsearch' | 'observability' | 'security';
export interface CloudDataAttributes {
  onboardingData: {
    solutionType?: SolutionType;
    token: string;
    security?: CloudSecurityAnswer;
  };
  resourceData?: ResourceData;
}

export interface ResourceData {
  project?: {
    search?: {
      type: 'general' | 'vector' | 'timeseries';
    };
  };
}
export interface CloudSecurityAnswer {
  useCase: 'siem' | 'cloud' | 'edr' | 'other';
  migration?: {
    value: boolean;
    type?: 'splunk' | 'other';
  };
}
