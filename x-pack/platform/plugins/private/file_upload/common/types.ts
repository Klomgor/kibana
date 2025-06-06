/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ES_FIELD_TYPES } from '@kbn/data-plugin/common';

export interface InputOverrides {
  [key: string]: string | undefined;
}

export type FormattedOverrides = InputOverrides & {
  column_names?: string[] | string;
  has_header_row?: boolean | string;
  should_trim_fields?: boolean | string;
};

export interface AnalysisResult {
  results: FindFileStructureResponse;
  overrides?: FormattedOverrides;
}

export interface FindFileStructureResponse {
  charset: string;
  has_header_row: boolean;
  has_byte_order_marker: boolean;
  format: string;
  document_type?: string;
  field_stats: {
    [fieldName: string]: {
      count: number;
      cardinality: number;
      top_hits: Array<{ count: number; value: any }>;
      mean_value?: number;
      median_value?: number;
      max_value?: number;
      min_value?: number;
      earliest?: string;
      latest?: string;
    };
  };
  sample_start: string;
  num_messages_analyzed: number;
  mappings: {
    properties: {
      [fieldName: string]: {
        // including all possible Elasticsearch types
        // since find_file_structure API can be enhanced to include new fields in the future
        type: Exclude<
          ES_FIELD_TYPES,
          ES_FIELD_TYPES._ID | ES_FIELD_TYPES._INDEX | ES_FIELD_TYPES._SOURCE | ES_FIELD_TYPES._TYPE
        >;
        format?: string;
      };
    };
  };
  ingest_pipeline: IngestPipeline;
  quote: string;
  delimiter: string;
  need_client_timezone: boolean;
  num_lines_analyzed: number;
  column_names?: string[];
  explanation?: string[];
  grok_pattern?: string;
  multiline_start_pattern?: string;
  exclude_lines_pattern?: string;
  java_timestamp_formats?: string[];
  joda_timestamp_formats?: string[];
  timestamp_field?: string;
  should_trim_fields?: boolean;
  ecs_compatibility?: string;
}

export interface FindFileStructureErrorResponse {
  body: {
    statusCode: number;
    error: string;
    message: string;
    attributes?: ErrorAttribute;
  };
  name: string;
}

interface ErrorAttribute {
  body: {
    error: {
      suppressed: Array<{ reason: string }>;
    };
  };
}

export interface HasImportPermission {
  hasImportPermission: boolean;
}

export type InputData = any[];

export interface InitializeImportResponse {
  success: boolean;
  id: string;
  index: string;
  pipelineIds: Array<string | undefined>;
  error?: {
    error: estypes.ErrorCause;
  };
}

export interface ImportResponse {
  success: boolean;
  index: string;
  pipelineId?: string;
  docCount: number;
  failures: ImportFailure[];
  error?: {
    error: estypes.ErrorCause;
  };
  ingestError?: boolean;
}

export interface ImportFailure {
  item: number;
  reason: string;
  caused_by?: {
    type: string;
    reason: string;
  };
  doc: ImportDoc;
}

export interface ImportDocMessage {
  message: string;
}

export interface ImportDocTika {
  data: string;
}

export type ImportDoc = ImportDocMessage | ImportDocTika | string | object;

export interface IngestPipelineWrapper {
  id: string;
  pipeline?: IngestPipeline;
}

export interface IngestPipeline {
  description: string;
  processors: any[];
  isManaged?: boolean;
  name?: string;
}

export interface PreviewTikaResponse {
  date?: string;
  content_type: string;
  author?: string;
  format: string;
  modified: string;
  language: string;
  creator_tool?: string;
  content: string;
  content_length: number;
}
