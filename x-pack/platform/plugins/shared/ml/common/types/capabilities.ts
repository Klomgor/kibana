/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { DEPRECATED_ALERTING_CONSUMERS } from '@kbn/rule-data-utils';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { PLUGIN_ID } from '../constants/app';
import {
  ML_JOB_SAVED_OBJECT_TYPE,
  ML_MODULE_SAVED_OBJECT_TYPE,
  ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
} from './saved_objects';
import { ML_ALERT_TYPES } from '../constants/alerts';

export const apmUserMlCapabilities = {
  canGetJobs: false,
};

export const featureMlCapabilities = {
  isADEnabled: true,
  isDFAEnabled: true,
  isNLPEnabled: true,
};

export const userMlCapabilities = {
  // Anomaly Detection
  canGetJobs: false,
  canGetDatafeeds: false,
  // Calendars
  canGetCalendars: false,
  // File Data Visualizer
  canFindFileStructure: false,
  // Data Frame Analytics
  canGetDataFrameAnalytics: false,
  // Annotations
  canGetAnnotations: false,
  canCreateAnnotation: false,
  canDeleteAnnotation: false,
  // Alerts
  canUseMlAlerts: false,
  // Trained models
  canGetTrainedModels: false,
  canTestTrainedModels: false,
  canGetFieldInfo: false,
  canGetMlInfo: false,
  // AIOps
  canUseAiops: false,
};

export const adminMlCapabilities = {
  // Anomaly Detection
  canCreateJob: false,
  canDeleteJob: false,
  canOpenJob: false,
  canCloseJob: false,
  canResetJob: false,
  canUpdateJob: false,
  canForecastJob: false,
  canDeleteForecast: false,
  canCreateDatafeed: false,
  canDeleteDatafeed: false,
  canStartStopDatafeed: false,
  canUpdateDatafeed: false,
  canPreviewDatafeed: false,
  // Filters
  canGetFilters: false,
  // Calendars
  canCreateCalendar: false,
  canDeleteCalendar: false,
  // Filters
  canCreateFilter: false,
  canDeleteFilter: false,
  // Data Frame Analytics
  canCreateDataFrameAnalytics: false,
  canDeleteDataFrameAnalytics: false,
  canStartStopDataFrameAnalytics: false,
  // Alerts
  canCreateMlAlerts: false,
  canUseMlAlerts: false,
  // Model management
  canViewMlNodes: false,
  // Trained models
  canCreateTrainedModels: false,
  canDeleteTrainedModels: false,
  canStartStopTrainedModels: false,
  // Inference models
  canCreateInferenceEndpoint: false,
};

export type FeatureMlCapabilities = typeof featureMlCapabilities;
export type UserMlCapabilities = typeof userMlCapabilities;
export type AdminMlCapabilities = typeof adminMlCapabilities;
export type MlCapabilities = FeatureMlCapabilities & UserMlCapabilities & AdminMlCapabilities;
export type MlCapabilitiesKey = keyof MlCapabilities;

export const basicLicenseMlCapabilities: MlCapabilitiesKey[] = [
  'canFindFileStructure',
  'canGetFieldInfo',
  'canGetMlInfo',
];

export function getDefaultCapabilities(): MlCapabilities {
  return {
    ...featureMlCapabilities,
    ...userMlCapabilities,
    ...adminMlCapabilities,
  };
}

export const alertingFeatures = Object.values(ML_ALERT_TYPES).map((ruleTypeId) => ({
  ruleTypeId,
  consumers: [PLUGIN_ID, ALERTING_FEATURE_ID, ...DEPRECATED_ALERTING_CONSUMERS],
}));

export function getPluginPrivileges() {
  const apmUserMlCapabilitiesKeys = Object.keys(apmUserMlCapabilities);
  const userMlCapabilitiesKeys = Object.keys(userMlCapabilities);
  const featureMlCapabilitiesKeys = Object.keys(featureMlCapabilities);
  const adminMlCapabilitiesKeys = Object.keys(adminMlCapabilities);
  const allMlCapabilitiesKeys = [
    ...featureMlCapabilitiesKeys,
    ...adminMlCapabilitiesKeys,
    ...userMlCapabilitiesKeys,
  ];

  const savedObjects = [
    'index-pattern',
    'dashboard',
    'search',
    'visualization',
    ML_JOB_SAVED_OBJECT_TYPE,
    ML_MODULE_SAVED_OBJECT_TYPE,
    ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
  ];
  const privilege = {
    app: [PLUGIN_ID, 'kibana'],
    excludeFromBasePrivileges: false,
    management: {
      insightsAndAlerting: ['jobsListLink', 'triggersActions'],
    },
    catalogue: [PLUGIN_ID],
  };

  return {
    admin: {
      ...privilege,
      api: ['fileUpload:analyzeFile', ...allMlCapabilitiesKeys.map((k) => `ml:${k}`)],
      catalogue: [PLUGIN_ID, `${PLUGIN_ID}_file_data_visualizer`],
      ui: allMlCapabilitiesKeys,
      savedObject: {
        all: savedObjects,
        read: savedObjects,
      },
      alerting: {
        rule: {
          all: alertingFeatures,
        },
        alert: {
          all: alertingFeatures,
        },
      },
    },
    user: {
      ...privilege,
      api: [
        'fileUpload:analyzeFile',
        ...[...featureMlCapabilitiesKeys, ...userMlCapabilitiesKeys].map((k) => `ml:${k}`),
      ],
      catalogue: [PLUGIN_ID],
      management: { insightsAndAlerting: ['triggersActions'] },
      ui: [...featureMlCapabilitiesKeys, ...userMlCapabilitiesKeys],
      savedObject: {
        all: [],
        read: savedObjects,
      },
      alerting: {
        rule: {
          read: alertingFeatures,
        },
        alert: {
          read: alertingFeatures,
        },
      },
    },
    apmUser: {
      excludeFromBasePrivileges: true,
      app: [],
      catalogue: [],
      savedObject: {
        all: [],
        read: [ML_JOB_SAVED_OBJECT_TYPE],
      },
      api: apmUserMlCapabilitiesKeys.map((k) => `ml:${k}`),
      ui: apmUserMlCapabilitiesKeys,
    },
  };
}

export interface MlCapabilitiesResponse {
  capabilities: MlCapabilities;
  upgradeInProgress: boolean;
  isPlatinumOrTrialLicense: boolean;
  mlFeatureEnabledInSpace: boolean;
}

export type ResolveMlCapabilities = (request: KibanaRequest) => Promise<MlCapabilities | null>;

interface FeatureCapabilities {
  ad: MlCapabilitiesKey[];
  dfa: MlCapabilitiesKey[];
  nlp: MlCapabilitiesKey[];
}

export const featureCapabilities: FeatureCapabilities = {
  ad: [
    'canGetJobs',
    'canGetDatafeeds',
    'canGetCalendars',
    'canGetAnnotations',
    'canCreateAnnotation',
    'canDeleteAnnotation',
    'canCreateJob',
    'canDeleteJob',
    'canOpenJob',
    'canCloseJob',
    'canResetJob',
    'canUpdateJob',
    'canForecastJob',
    'canDeleteForecast',
    'canCreateDatafeed',
    'canDeleteDatafeed',
    'canStartStopDatafeed',
    'canUpdateDatafeed',
    'canPreviewDatafeed',
    'canGetFilters',
    'canCreateCalendar',
    'canDeleteCalendar',
    'canCreateFilter',
    'canDeleteFilter',
  ],
  dfa: [
    'canGetDataFrameAnalytics',
    'canCreateDataFrameAnalytics',
    'canDeleteDataFrameAnalytics',
    'canStartStopDataFrameAnalytics',
  ],
  nlp: [
    'canGetTrainedModels',
    'canTestTrainedModels',
    'canCreateTrainedModels',
    'canDeleteTrainedModels',
    'canStartStopTrainedModels',
    'canCreateInferenceEndpoint',
  ],
};
