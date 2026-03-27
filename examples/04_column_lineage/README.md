# Example 04: Column-level lineage

Demonstrates the `columnLineage` facet, which creates ColumnProcess assets in Atlan and enables column-level lineage in the UI. A task reads from a BigQuery raw events table and writes to a BigQuery metrics table, mapping input columns to output columns with transformation types.

## What this sends

| File | eventType | Job | Datasets |
|------|-----------|-----|----------|
| `01_dag_start.json` | START | `customer_metrics_pipeline` | — |
| `02_task_start.json` | START | `customer_metrics_pipeline.compute_metrics` | — |
| `03_task_complete.json` | COMPLETE | `customer_metrics_pipeline.compute_metrics` | BigQuery input + BigQuery output with columnLineage |
| `04_dag_complete.json` | COMPLETE | `customer_metrics_pipeline` | — |

## What appears in Atlan

- **1 parent FlowControlOperation**: `customer_metrics_pipeline`
- **1 child FlowControlOperation**: `compute_metrics`
- **1 Process**: linking the two BigQuery tables
- **BigQuery input table** (partial): `analytics_db.raw.customer_events`
- **BigQuery output table** (partial): `analytics_db.reporting.customer_metrics` with columns `customer_id`, `total_orders`, `lifetime_value`, `last_order_date`
- **4 ColumnProcess assets** (one per output column):
  - `customer_id` ← `customer_events.customer_id` (DIRECT / IDENTITY — pass-through)
  - `total_orders` ← `customer_events.order_id` (INDIRECT / AGGREGATE — COUNT)
  - `lifetime_value` ← `customer_events.order_amount` (INDIRECT / AGGREGATE — SUM)
  - `last_order_date` ← `customer_events.event_timestamp` (INDIRECT / AGGREGATE — MAX)

## Key fields

The `columnLineage` facet lives under `outputs[].facets.columnLineage.fields`. Each key is an output column name, and the value lists the input fields it was derived from:

```json
"columnLineage": {
  "fields": {
    "output_column": {
      "inputFields": [
        {
          "namespace": "<input-dataset-namespace>",
          "name": "<input-dataset-name>",
          "field": "<input-column-name>",
          "transformations": [
            { "type": "DIRECT", "subtype": "IDENTITY" }
          ]
        }
      ]
    }
  }
}
```

Transformation types:
- `DIRECT / IDENTITY` — column is copied as-is
- `INDIRECT / AGGREGATE` — column is computed from an aggregation (COUNT, SUM, MAX, etc.)
- `INDIRECT / TRANSFORM` — column is derived via a transformation

## Run it

```bash
python send_events.py examples/04_column_lineage
```
