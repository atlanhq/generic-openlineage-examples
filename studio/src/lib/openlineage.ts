/**
 * Minimal OpenLineage (2.x) event model + builders.
 * Just enough to construct the RunEvents the generic-openlineage connector
 * ingests, kept readable so the live JSON preview is pleasant to look at.
 */

export type EventType = 'START' | 'COMPLETE' | 'FAIL' | 'ABORT'

export interface OLDataset {
  namespace: string
  name: string
  facets?: Record<string, unknown>
}

export interface OLRunEvent {
  eventTime: string
  eventType: EventType
  run: { runId: string; facets: Record<string, unknown> }
  job: { namespace: string; name: string; facets: Record<string, unknown> }
  inputs: OLDataset[]
  outputs: OLDataset[]
  producer: string
  schemaURL: string
}

export const PRODUCER =
  'https://github.com/atlanhq/marketplace-packages/tree/master/openlineage-studio'
export const RUN_SCHEMA_URL =
  'https://openlineage.io/spec/2-0-2/OpenLineage.json#/$defs/RunEvent'
const JOBTYPE_SCHEMA_URL =
  'https://openlineage.io/spec/facets/2-0-3/JobTypeJobFacet.json#/$defs/JobTypeJobFacet'
const COLUMN_LINEAGE_SCHEMA_URL =
  'https://openlineage.io/spec/facets/1-2-0/ColumnLineageDatasetFacet.json#/$defs/ColumnLineageDatasetFacet'
const SCHEMA_FACET_SCHEMA_URL =
  'https://openlineage.io/spec/facets/1-1-1/SchemaDatasetFacet.json#/$defs/SchemaDatasetFacet'
const ERROR_MESSAGE_SCHEMA_URL =
  'https://openlineage.io/spec/facets/1-0-0/ErrorMessageRunFacet.json#/$defs/ErrorMessageRunFacet'

export function jobTypeFacet(integration = 'SPARK', jobType = 'JOB') {
  return {
    jobType: {
      _producer: PRODUCER,
      _schemaURL: JOBTYPE_SCHEMA_URL,
      integration,
      jobType,
      processingType: 'BATCH',
    },
  }
}

export interface ColumnMapping {
  /** output column name */
  output: string
  inputs: { namespace: string; name: string; field: string }[]
}

export function columnLineageFacet(mappings: ColumnMapping[]) {
  const fields: Record<string, { inputFields: unknown[] }> = {}
  for (const m of mappings) {
    fields[m.output] = {
      inputFields: m.inputs.map((f) => ({
        namespace: f.namespace,
        name: f.name,
        field: f.field,
        transformations: [
          { type: 'DIRECT', subtype: 'IDENTITY', description: '', masking: false },
        ],
      })),
    }
  }
  return {
    columnLineage: {
      _producer: PRODUCER,
      _schemaURL: COLUMN_LINEAGE_SCHEMA_URL,
      fields,
      dataset: [],
    },
  }
}

export interface SchemaField {
  name: string
  type: string
  description?: string
}

export function schemaFacet(fields: SchemaField[]) {
  return {
    schema: {
      _producer: PRODUCER,
      _schemaURL: SCHEMA_FACET_SCHEMA_URL,
      fields,
    },
  }
}

export function errorMessageFacet(
  message: string,
  programmingLanguage = 'PYTHON',
  stackTrace?: string,
) {
  return {
    errorMessage: {
      _producer: PRODUCER,
      _schemaURL: ERROR_MESSAGE_SCHEMA_URL,
      message,
      programmingLanguage,
      ...(stackTrace ? { stackTrace } : {}),
    },
  }
}

export interface EventSpec {
  eventType: EventType
  eventTime: string
  runId: string
  jobName: string
  jobNamespace: string
  inputs: OLDataset[]
  outputs: OLDataset[]
  integration?: string
  runFacets?: Record<string, unknown>
}

export function buildEvent(spec: EventSpec): OLRunEvent {
  return {
    eventTime: spec.eventTime,
    eventType: spec.eventType,
    run: { runId: spec.runId, facets: spec.runFacets ?? {} },
    job: {
      namespace: spec.jobNamespace,
      name: spec.jobName,
      facets: jobTypeFacet(spec.integration ?? 'SPARK', 'JOB'),
    },
    inputs: spec.inputs,
    outputs: spec.outputs,
    producer: PRODUCER,
    schemaURL: RUN_SCHEMA_URL,
  }
}

/** Build the matching START + COMPLETE pair that produces lineage in Atlan. */
export function startCompletePair(
  base: Omit<EventSpec, 'eventType' | 'eventTime'>,
  startTime: string,
  endTime: string,
): OLRunEvent[] {
  return [
    buildEvent({ ...base, eventType: 'START', eventTime: startTime }),
    buildEvent({ ...base, eventType: 'COMPLETE', eventTime: endTime }),
  ]
}
