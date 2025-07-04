/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// FORM
export const RULES_BULK_EDIT_FORM_TITLE = '[data-test-subj="rulesBulkEditFormTitle"]';

export const RULES_BULK_EDIT_FORM_CONFIRM_BTN = '[data-test-subj="rulesBulkEditFormSaveBtn"]';

// INDEX PATTERNS
export const INDEX_PATTERNS_RULE_BULK_MENU_ITEM = '[data-test-subj="indexPatternsBulkEditRule"]';

export const ADD_INDEX_PATTERNS_RULE_BULK_MENU_ITEM =
  '[data-test-subj="addIndexPatternsBulkEditRule"]';

export const DELETE_INDEX_PATTERNS_RULE_BULK_MENU_ITEM =
  '[data-test-subj="deleteIndexPatternsBulkEditRule"]';

export const RULES_BULK_EDIT_INDEX_PATTERNS = '[data-test-subj="bulkEditRulesIndexPatterns"]';

export const RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX =
  '[data-test-subj="bulkEditRulesOverwriteIndexPatterns"]';

export const RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX =
  '[data-test-subj="bulkEditRulesOverwriteRulesWithDataViews"]';

export const RULES_BULK_EDIT_INDEX_PATTERNS_WARNING =
  '[data-test-subj="bulkEditRulesIndexPatternsWarning"]';

export const RULES_BULK_EDIT_DATA_VIEWS_WARNING =
  '[data-test-subj="bulkEditRulesDataViewsWarning"]';

// SCHEDULE
export const UPDATE_SCHEDULE_MENU_ITEM = '[data-test-subj="setScheduleBulk"]';

export const RULES_BULK_EDIT_SCHEDULES_WARNING = '[data-test-subj="bulkEditRulesSchedulesWarning"]';

export const UPDATE_SCHEDULE_INTERVAL_INPUT =
  '[data-test-subj="bulkEditRulesScheduleIntervalSelector"]';

export const UPDATE_SCHEDULE_LOOKBACK_INPUT =
  '[data-test-subj="bulkEditRulesScheduleLookbackSelector"]';

export const UPDATE_SCHEDULE_TIME_UNIT_SELECT = '[data-test-subj="timeType"]';

// ACTIONS
export const ADD_RULE_ACTIONS_MENU_ITEM = '[data-test-subj="addRuleActionsBulk"]';

export const RULES_BULK_EDIT_ACTIONS_INFO = '[data-test-subj="bulkEditRulesRuleActionInfo"]';

export const RULES_BULK_EDIT_ACTIONS_WARNING = '[data-test-subj="bulkEditRulesRuleActionsWarning"]';

export const RULES_BULK_EDIT_OVERWRITE_ACTIONS_CHECKBOX =
  '[data-test-subj="bulkEditRulesOverwriteRuleActions"]';

export const BULK_ACTIONS_BTN = '[data-test-subj="bulkActions"] span';

export const BULK_ACTIONS_PROGRESS_BTN = '[data-test-subj="bulkActions-progress"]';

// TIMELINE
export const APPLY_TIMELINE_RULE_BULK_MENU_ITEM = '[data-test-subj="applyTimelineTemplateBulk"]';

export const RULES_BULK_EDIT_TIMELINE_TEMPLATES_SELECTOR =
  '[data-test-subj="bulkEditRulesTimelineTemplateSelector"]';

export const RULES_BULK_EDIT_TIMELINE_TEMPLATES_WARNING =
  '[data-test-subj="bulkEditRulesTimelineTemplateWarning"]';

// TAGS
export const TAGS_RULE_BULK_MENU_ITEM = '[data-test-subj="tagsBulkEditRule"]';

export const ADD_TAGS_RULE_BULK_MENU_ITEM = '[data-test-subj="addTagsBulkEditRule"]';

export const DELETE_TAGS_RULE_BULK_MENU_ITEM = '[data-test-subj="deleteTagsBulkEditRule"]';

export const RULES_BULK_EDIT_TAGS = '[data-test-subj="bulkEditRulesTags"]';

export const RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX =
  '[data-test-subj="bulkEditRulesOverwriteTags"]';

export const RULES_BULK_EDIT_TAGS_WARNING = '[data-test-subj="bulkEditRulesTagsWarning"]';

// INVESTIGATION FIELDS
export const INVESTIGATION_FIELDS_RULE_BULK_MENU_ITEM =
  '[data-test-subj="investigationFieldsBulkEditRule"]';

export const ADD_INVESTIGATION_FIELDS_RULE_BULK_MENU_ITEM =
  '[data-test-subj="addInvestigationFieldsBulkEditRule"]';

export const DELETE_INVESTIGATION_FIELDS_RULE_BULK_MENU_ITEM =
  '[data-test-subj="deleteInvestigationFieldsBulkEditRule"]';

export const RULES_BULK_EDIT_INVESTIGATION_FIELDS =
  '[data-test-subj="bulkEditRulesInvestigationFields"]';

export const RULES_BULK_EDIT_OVERWRITE_INVESTIGATION_FIELDS_CHECKBOX =
  '[data-test-subj="bulkEditRulesOverwriteInvestigationFields"]';

export const RULES_BULK_EDIT_INVESTIGATION_FIELDS_WARNING =
  '[data-test-subj="bulkEditRulesInvestigationFieldsWarning"]';

// ALERT SUPPRESSION
export const ALERT_SUPPRESSION_RULE_BULK_MENU_ITEM =
  '[data-test-subj="alertSuppressionBulkEditRule"]';

export const SET_ALERT_SUPPRESSION_RULE_BULK_MENU_ITEM =
  '[data-test-subj="setAlertSuppressionBulkEditRule"]';

export const SET_ALERT_SUPPRESSION_FOR_THRESHOLD_BULK_MENU_ITEM =
  '[data-test-subj="setAlertSuppressionForThresholdBulkEditRule"]';

export const DELETE_ALERT_SUPPRESSION_RULE_BULK_MENU_ITEM =
  '[data-test-subj="deleteAlertSuppressionBulkEditRule"]';

// ENABLE/DISABLE
export const ENABLE_RULE_BULK_BTN = '[data-test-subj="enableRuleBulk"]';

export const DISABLE_RULE_BULK_BTN = '[data-test-subj="disableRuleBulk"]';

// DELETE
export const DELETE_RULE_BULK_BTN = '[data-test-subj="deleteRuleBulk"]';

// DUPLICATE
export const DUPLICATE_RULE_BULK_BTN = '[data-test-subj="duplicateRuleBulk"]';

// EXPORT
export const BULK_EXPORT_ACTION_BTN = '[data-test-subj="exportRuleBulk"]';

// SCHEDULE MANUAL RULE RUN
export const BULK_MANUAL_RULE_RUN_BTN = '[data-test-subj="scheduleRuleRunBulk"]';

// SCHEDULE BULK FILL GAPS
export const BULK_FILL_RULE_GAPS_BTN = '[data-test-subj="scheduleFillGaps"]';

export const BULK_MANUAL_RULE_RUN_WARNING_MODAL = '[data-test-subj="bulkActionConfirmationModal"]';

export const BULK_FILL_RULE_GAPS_WARNING_MODAL = '[data-test-subj="bulkActionConfirmationModal"]';
