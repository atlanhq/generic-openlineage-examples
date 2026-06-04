import {
  GitBranch,
  Workflow,
  Columns3,
  Table,
  TriangleAlert,
  Database,
  Network,
  Link2,
  type LucideIcon,
} from 'lucide-react'
import {
  buildEvent,
  columnLineageFacet,
  errorMessageFacet,
  schemaFacet,
  startCompletePair,
  type OLDataset,
  type OLRunEvent,
} from '@/lib/openlineage'

export type ExampleStatus = 'ready' | 'soon'
export type ExampleCategory =
  | 'Lineage'
  | 'Run events'
  | 'Orchestration'
  | 'Advanced'

export interface DatasetSpec {
  name: string
  namespace: string
}

export interface BuildContext {
  jobName: string
  jobNamespace: string
  runId: string
  startTime: string
  endTime: string
}

export interface GraphNode {
  id: string
  label: string
  sub?: string
  kind: 'input' | 'job' | 'output'
}

export interface LineageModel {
  inputs: GraphNode[]
  job: GraphNode
  outputs: GraphNode[]
}

export interface Example {
  id: string
  title: string
  blurb: string
  description: string
  category: ExampleCategory
  status: ExampleStatus
  icon: LucideIcon
  integration: string
  jobLabel: string
  defaultInputs: DatasetSpec[]
  defaultOutputs: DatasetSpec[]
  minInputs: number
  minOutputs: number
  note?: string
  build: (inputs: DatasetSpec[], outputs: DatasetSpec[], ctx: BuildContext) => OLRunEvent[]
}

/* ---------------------------- helpers ----------------------------- */

const SNOW = 'snowflake://atlan.snowflakecomputing.com'
const PG = 'postgres://prod.db.example.com:5432'
const KAFKA = 'kafka://broker.example.com:9092'

const SCHEME_RE = /^([a-z0-9+.-]+):\/\//i

export const shortName = (name?: string) => {
  const n = (name ?? '').trim()
  if (!n) return '—'
  return n.split('.').pop() || n
}

export const shortNamespace = (ns?: string) => {
  const s = (ns ?? '').trim()
  if (!s) return ''
  const m = s.match(SCHEME_RE)
  if (m) return m[1]
  return s.length > 20 ? s.slice(0, 18) + '…' : s
}

/** Keep only datasets that have a name; map to OpenLineage datasets. */
const clean = (specs: DatasetSpec[]) =>
  specs.filter((d) => d.name.trim() !== '')

const toDatasets = (specs: DatasetSpec[]): OLDataset[] =>
  clean(specs).map((d) => ({ namespace: d.namespace, name: d.name }))

export function buildLineageModel(
  inputs: DatasetSpec[],
  outputs: DatasetSpec[],
  jobLabel: string,
): LineageModel {
  return {
    inputs: clean(inputs).map((d, i) => ({
      id: 'in' + i,
      kind: 'input',
      label: shortName(d.name),
      sub: shortNamespace(d.namespace),
    })),
    job: { id: 'job', kind: 'job', label: jobLabel, sub: '' },
    outputs: clean(outputs).map((d, i) => ({
      id: 'out' + i,
      kind: 'output',
      label: shortName(d.name),
      sub: shortNamespace(d.namespace),
    })),
  }
}

const plain =
  (integration: string) =>
  (inputs: DatasetSpec[], outputs: DatasetSpec[], ctx: BuildContext) =>
    startCompletePair(
      {
        runId: ctx.runId,
        jobName: ctx.jobName,
        jobNamespace: ctx.jobNamespace,
        integration,
        inputs: toDatasets(inputs),
        outputs: toDatasets(outputs),
      },
      ctx.startTime,
      ctx.endTime,
    )

/* ----------------------------- recipes ---------------------------- */

const tableLineage: Example = {
  id: 'table-lineage',
  title: 'Table to table lineage',
  blurb: 'One source, one target — the canonical edge.',
  description:
    'Emits a START/COMPLETE run that reads one table and writes another. The fastest way to confirm your connection is wired up. Add more sources or targets below to grow the graph.',
  category: 'Lineage',
  status: 'ready',
  icon: GitBranch,
  integration: 'SPARK',
  jobLabel: 'transform',
  minInputs: 1,
  minOutputs: 1,
  defaultInputs: [{ name: 'ANALYTICS.PUBLIC.ORDERS', namespace: SNOW }],
  defaultOutputs: [{ name: 'ANALYTICS.PUBLIC.ORDERS_ENRICHED', namespace: SNOW }],
  build: plain('SPARK'),
}

const fanInOut: Example = {
  id: 'fan-in-out',
  title: 'Fan-in / fan-out',
  blurb: 'Many sources and targets in one run.',
  description:
    'A job that joins several inputs and writes several outputs. Use the + buttons to add as many datasets as you need — they all show up in the lineage graph.',
  category: 'Lineage',
  status: 'ready',
  icon: Workflow,
  integration: 'SPARK',
  jobLabel: 'join',
  minInputs: 1,
  minOutputs: 1,
  defaultInputs: [
    { name: 'RAW.SALES.ORDERS', namespace: PG },
    { name: 'RAW.SALES.CUSTOMERS', namespace: PG },
  ],
  defaultOutputs: [
    { name: 'MART.SALES.ORDER_FACTS', namespace: SNOW },
    { name: 'MART.SALES.ORDER_DAILY', namespace: SNOW },
  ],
  build: plain('SPARK'),
}

const columnLineage: Example = {
  id: 'column-lineage',
  title: 'Column-level lineage',
  blurb: 'Field-to-field edges via columnLineage.',
  description:
    'Adds a columnLineage facet to the first target so Atlan can draw column-to-column edges. Derived columns trace back to the source fields they came from.',
  category: 'Lineage',
  status: 'ready',
  icon: Columns3,
  integration: 'SPARK',
  jobLabel: 'derive',
  minInputs: 1,
  minOutputs: 1,
  defaultInputs: [{ name: 'RAW.HR.EMPLOYEES', namespace: SNOW }],
  defaultOutputs: [{ name: 'MART.HR.EMPLOYEE_DIM', namespace: SNOW }],
  build: (inputs, outputs, ctx) => {
    const ins = clean(inputs)
    const outs = clean(outputs)
    const src = ins[0]
    const outputDatasets: OLDataset[] = outs.map((d, i) => {
      if (i === 0 && src) {
        return {
          namespace: d.namespace,
          name: d.name,
          facets: columnLineageFacet([
            {
              output: 'FULL_NAME',
              inputs: [
                { namespace: src.namespace, name: src.name, field: 'FIRST_NAME' },
                { namespace: src.namespace, name: src.name, field: 'LAST_NAME' },
              ],
            },
            {
              output: 'WORK_EMAIL',
              inputs: [
                { namespace: src.namespace, name: src.name, field: 'EMAIL' },
              ],
            },
          ]),
        }
      }
      return { namespace: d.namespace, name: d.name }
    })
    const base = {
      runId: ctx.runId,
      jobName: ctx.jobName,
      jobNamespace: ctx.jobNamespace,
      integration: 'SPARK',
      inputs: toDatasets(ins),
      outputs: outputDatasets,
    }
    return [
      buildEvent({ ...base, eventType: 'START', eventTime: ctx.startTime }),
      buildEvent({ ...base, eventType: 'COMPLETE', eventTime: ctx.endTime }),
    ]
  },
}

const schemaExample: Example = {
  id: 'schema-facet',
  title: 'Dataset with a schema',
  blurb: 'Attach columns + types (SchemaDatasetFacet).',
  description:
    'Sends a run whose targets carry a schema facet — the columns and their types. Atlan uses this to populate the asset’s column list even before profiling.',
  category: 'Lineage',
  status: 'ready',
  icon: Table,
  integration: 'SPARK',
  jobLabel: 'load',
  minInputs: 1,
  minOutputs: 1,
  defaultInputs: [{ name: 'RAW.FINANCE.INVOICES_RAW', namespace: SNOW }],
  defaultOutputs: [{ name: 'MART.FINANCE.INVOICES', namespace: SNOW }],
  build: (inputs, outputs, ctx) => {
    const facet = schemaFacet([
      { name: 'INVOICE_ID', type: 'NUMBER', description: 'Primary key' },
      { name: 'CUSTOMER_ID', type: 'NUMBER', description: 'FK to customers' },
      { name: 'AMOUNT', type: 'DECIMAL(12,2)', description: 'Invoice total' },
      { name: 'ISSUED_AT', type: 'TIMESTAMP_NTZ' },
      { name: 'STATUS', type: 'VARCHAR' },
    ])
    const outputDatasets: OLDataset[] = clean(outputs).map((d) => ({
      namespace: d.namespace,
      name: d.name,
      facets: facet,
    }))
    const base = {
      runId: ctx.runId,
      jobName: ctx.jobName,
      jobNamespace: ctx.jobNamespace,
      integration: 'SPARK',
      inputs: toDatasets(inputs),
      outputs: outputDatasets,
    }
    return [
      buildEvent({ ...base, eventType: 'START', eventTime: ctx.startTime }),
      buildEvent({ ...base, eventType: 'COMPLETE', eventTime: ctx.endTime }),
    ]
  },
}

const ingest: Example = {
  id: 'ingest-source',
  title: 'Ingest with no upstream',
  blurb: 'A source that produces data from nothing.',
  description:
    'Not every run reads a table — an ingest job may have zero inputs and only produce outputs. Add inputs with the + button if yours does.',
  category: 'Run events',
  status: 'ready',
  icon: Database,
  integration: 'SPARK',
  jobLabel: 'ingest',
  minInputs: 0,
  minOutputs: 1,
  note: 'This recipe starts with no sources — that is valid OpenLineage.',
  defaultInputs: [],
  defaultOutputs: [{ name: 'RAW.STREAM.CLICKSTREAM', namespace: KAFKA }],
  build: plain('SPARK'),
}

const failedRun: Example = {
  id: 'failed-run',
  title: 'A run that failed',
  blurb: 'Report a failure with FAIL + errorMessage.',
  description:
    'Sends a START followed by a FAIL event carrying an errorMessage run facet. Useful for confirming Atlan records failed runs, not just successful ones.',
  category: 'Run events',
  status: 'ready',
  icon: TriangleAlert,
  integration: 'SPARK',
  jobLabel: 'run · failed',
  minInputs: 1,
  minOutputs: 1,
  defaultInputs: [{ name: 'RAW.WEB.EVENTS', namespace: PG }],
  defaultOutputs: [{ name: 'MART.WEB.SESSIONS', namespace: SNOW }],
  build: (inputs, outputs, ctx) => {
    const base = {
      runId: ctx.runId,
      jobName: ctx.jobName,
      jobNamespace: ctx.jobNamespace,
      integration: 'SPARK',
      inputs: toDatasets(inputs),
      outputs: toDatasets(outputs),
    }
    return [
      buildEvent({ ...base, eventType: 'START', eventTime: ctx.startTime }),
      buildEvent({
        ...base,
        eventType: 'FAIL',
        eventTime: ctx.endTime,
        runFacets: errorMessageFacet(
          'AnalysisException: Table or view not found: ' +
            (clean(inputs)[0]?.name ?? 'unknown'),
          'PYTHON',
          'Traceback (most recent call last):\n  File "etl/job.py", line 42, in run\n    df = spark.table(src)\nAnalysisException: Table or view not found',
        ),
      }),
    ]
  },
}

/* --------------------------- coming soon -------------------------- */

const soon = (
  id: string,
  title: string,
  blurb: string,
  description: string,
  category: ExampleCategory,
  icon: LucideIcon,
): Example => ({
  id,
  title,
  blurb,
  description,
  category,
  status: 'soon',
  icon,
  integration: 'AIRFLOW',
  jobLabel: title,
  minInputs: 0,
  minOutputs: 0,
  defaultInputs: [],
  defaultOutputs: [],
  build: () => [],
})

const airflowDag = soon(
  'airflow-dag-tasks',
  'Airflow DAG → tasks',
  'Represent a DAG and its task runs.',
  'Emit a parent DAG run with child task runs so Atlan can show the orchestration hierarchy.',
  'Orchestration',
  Network,
)

const airflowSpark = soon(
  'airflow-spark-link',
  'Link an Airflow DAG to a Spark job',
  'Connect orchestration to the work it triggers.',
  'Tie an Airflow task to the Spark job it launches via a parent run facet, so lineage spans both systems.',
  'Advanced',
  Link2,
)

export const EXAMPLES: Example[] = [
  tableLineage,
  fanInOut,
  columnLineage,
  schemaExample,
  ingest,
  failedRun,
  airflowDag,
  airflowSpark,
]

export const CATEGORY_ORDER: ExampleCategory[] = [
  'Lineage',
  'Run events',
  'Orchestration',
  'Advanced',
]

export function getExample(id: string): Example {
  return EXAMPLES.find((e) => e.id === id) ?? EXAMPLES[0]
}
