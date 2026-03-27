# Example 03: Multi-task DAG

Demonstrates a DAG with three sequential tasks, each producing a Process and a lineage edge. The full chain is: Postgres → S3 (raw) → S3 (processed) → Snowflake.

## What this sends

| File | eventType | Job | Datasets |
|------|-----------|-----|----------|
| `01_dag_start.json` | START | `orders_pipeline` | — |
| `02_task1_start.json` | START | `orders_pipeline.extract_from_source` | — |
| `03_task1_complete.json` | COMPLETE | `orders_pipeline.extract_from_source` | Postgres input → S3 raw output |
| `04_task2_start.json` | START | `orders_pipeline.transform_orders` | — |
| `05_task2_complete.json` | COMPLETE | `orders_pipeline.transform_orders` | S3 raw input → S3 processed output |
| `06_task3_start.json` | START | `orders_pipeline.load_to_warehouse` | — |
| `07_task3_complete.json` | COMPLETE | `orders_pipeline.load_to_warehouse` | S3 processed input → Snowflake output |
| `08_dag_complete.json` | COMPLETE | `orders_pipeline` | — |

## What appears in Atlan

- **1 parent FlowControlOperation**: `orders_pipeline`
- **3 child FlowControlOperations**: `extract_from_source`, `transform_orders`, `load_to_warehouse`
- **3 Processes**: one per task, each with its own input/output datasets
- **Dataset assets** (partial):
  - Postgres: `sales.public.raw_orders`
  - S3: `s3://atlan-data-lake/raw/orders/2025-01-15`
  - S3: `s3://atlan-data-lake/processed/orders/2025-01-15`
  - Snowflake: `analytics.public.orders_final`
- **Lineage chain**: Postgres → S3 raw → S3 processed → Snowflake

## Key fields

- Each child event references the same parent `runId` via `run.facets.parent`
- S3 datasets use `namespace: "s3://atlan-data-lake"` — the connector maps the bucket to an S3 connection
- All three tasks share the same parent DAG run ID, so they are grouped under one FCO

## Run it

```bash
python send_events.py examples/03_multi_task_dag
```
