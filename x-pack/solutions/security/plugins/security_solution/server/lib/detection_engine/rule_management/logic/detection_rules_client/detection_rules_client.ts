/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { ILicense } from '@kbn/licensing-plugin/server';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { MlAuthz } from '../../../../machine_learning/authz';
import type { ProductFeaturesService } from '../../../../product_features_service';
import { createPrebuiltRuleAssetsClient } from '../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { RuleImportErrorObject } from '../import/errors';
import type {
  CreateCustomRuleArgs,
  CreatePrebuiltRuleArgs,
  DeleteRuleArgs,
  IDetectionRulesClient,
  ImportRuleArgs,
  ImportRulesArgs,
  PatchRuleArgs,
  RevertPrebuiltRuleArgs,
  UpdateRuleArgs,
  UpgradePrebuiltRuleArgs,
} from './detection_rules_client_interface';
import { createRule } from './methods/create_rule';
import { deleteRule } from './methods/delete_rule';
import { importRule } from './methods/import_rule';
import { importRules } from './methods/import_rules';
import { patchRule } from './methods/patch_rule';
import { updateRule } from './methods/update_rule';
import { upgradePrebuiltRule } from './methods/upgrade_prebuilt_rule';
import { revertPrebuiltRule } from './methods/revert_prebuilt_rule';
import { MINIMUM_RULE_CUSTOMIZATION_LICENSE } from '../../../../../../common/constants';

interface DetectionRulesClientParams {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  mlAuthz: MlAuthz;
  productFeaturesService: ProductFeaturesService;
  license: ILicense;
}

export const createDetectionRulesClient = ({
  actionsClient,
  rulesClient,
  mlAuthz,
  savedObjectsClient,
  productFeaturesService,
  license,
}: DetectionRulesClientParams): IDetectionRulesClient => {
  const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient(savedObjectsClient);

  return {
    getRuleCustomizationStatus() {
      /**
       * The prebuilt rules customization feature is gated by the license level.
       *
       * The license level is verified against the minimum required level for
       * the feature (Enterprise). However, since Serverless always operates at
       * the Enterprise license level, we must also check if the feature is
       * enabled in the product features. In Serverless, for different tiers,
       * unavailable features are disabled.
       */
      const isRulesCustomizationEnabled =
        license.hasAtLeast(MINIMUM_RULE_CUSTOMIZATION_LICENSE) &&
        productFeaturesService.isEnabled(ProductFeatureKey.prebuiltRuleCustomization);

      return {
        isRulesCustomizationEnabled,
      };
    },
    async createCustomRule(args: CreateCustomRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.createCustomRule', async () => {
        return createRule({
          actionsClient,
          rulesClient,
          rule: {
            ...args.params,
            // For backwards compatibility, we default to true if not provided.
            // The default enabled value is false for prebuilt rules, and true
            // for custom rules.
            enabled: args.params.enabled ?? true,
            immutable: false,
          },
          mlAuthz,
        });
      });
    },

    async createPrebuiltRule(args: CreatePrebuiltRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.createPrebuiltRule', async () => {
        return createRule({
          actionsClient,
          rulesClient,
          rule: {
            ...args.params,
            immutable: true,
          },
          mlAuthz,
        });
      });
    },

    async updateRule({ ruleUpdate }: UpdateRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.updateRule', async () => {
        return updateRule({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          ruleUpdate,
        });
      });
    },

    async patchRule({ rulePatch }: PatchRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.patchRule', async () => {
        return patchRule({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulePatch,
        });
      });
    },

    async deleteRule({ ruleId }: DeleteRuleArgs): Promise<void> {
      return withSecuritySpan('DetectionRulesClient.deleteRule', async () => {
        return deleteRule({ rulesClient, ruleId });
      });
    },

    async upgradePrebuiltRule({ ruleAsset }: UpgradePrebuiltRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.upgradePrebuiltRule', async () => {
        return upgradePrebuiltRule({
          actionsClient,
          rulesClient,
          ruleAsset,
          mlAuthz,
          prebuiltRuleAssetClient,
        });
      });
    },

    async revertPrebuiltRule({
      ruleAsset,
      existingRule,
    }: RevertPrebuiltRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.revertPrebuiltRule', async () => {
        return revertPrebuiltRule({
          actionsClient,
          rulesClient,
          ruleAsset,
          mlAuthz,
          prebuiltRuleAssetClient,
          existingRule,
        });
      });
    },

    async importRule(args: ImportRuleArgs): Promise<RuleResponse> {
      return withSecuritySpan('DetectionRulesClient.importRule', async () => {
        return importRule({
          actionsClient,
          rulesClient,
          importRulePayload: args,
          mlAuthz,
          prebuiltRuleAssetClient,
        });
      });
    },

    async importRules(args: ImportRulesArgs): Promise<Array<RuleResponse | RuleImportErrorObject>> {
      return withSecuritySpan('DetectionRulesClient.importRules', async () => {
        return importRules({
          ...args,
          detectionRulesClient: this,
          savedObjectsClient,
        });
      });
    },
  };
};
