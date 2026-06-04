# OpenLineage Sample Events for Atlan

A collection of runnable OpenLineage event examples for testing and validating your Atlan Generic OpenLineage connector setup.

Send these events to your Atlan tenant to see FlowControlOperations, Processes, and lineage assets appear in the UI.

There are two ways to send them:

- **[OpenLineage Studio](studio/)** — an interactive local UI. Pick an example, see the
  payload prefilled, hit **Send**, and watch assets land in Atlan. No terminal,
  no copy-paste. Runs with zero `npm install`: `cd studio && node serve.mjs`.
- **`send_events.py`** — a minimal Python CLI for scripted/CI use (below).

---

## Prerequisites

- Python 3.8+
- An Atlan tenant with the Generic OpenLineage connector configured
- An Atlan API key (Settings → API Keys)

---

## Setup

```bash
# 1. Clone this repo
git clone https://github.com/atlanhq/generic-openlineage-examples
cd generic-openlineage-examples

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure your endpoint
cp .env.example .env
# Edit .env and fill in OL_ENDPOINT and API_KEY
```

---

## Usage

```bash
python send_events.py examples/01_simple_dag
```

The script reads all `.json` files from the example's `events/` directory in sorted order and POSTs each one to your Atlan endpoint. Status is printed for each event.

---

## Examples

| # | Example | Events | What appears in Atlan |
|---|---------|--------|----------------------|
| 01 | [Simple DAG](examples/01_simple_dag/) | 4 | Parent + child FlowControlOperation, no datasets |
| 02 | [DAG with table lineage](examples/02_dag_with_lineage/) | 4 | FCOs + Process + Postgres input → Snowflake output |
| 03 | [Multi-task DAG](examples/03_multi_task_dag/) | 8 | 3 child FCOs, Postgres → S3 → S3 → Snowflake lineage chain |
| 04 | [Column-level lineage](examples/04_column_lineage/) | 4 | FCOs + Process + ColumnProcess assets (BigQuery → BigQuery) |

---

## Event format

Events are raw [OpenLineage RunEvent](https://openlineage.io/spec/2-0-2/OpenLineage.json) JSON — no additional envelope needed. Each file contains a single event.

The minimal required fields per event are:

```json
{
  "eventTime": "2025-01-15T10:00:00.000Z",
  "eventType": "START",
  "producer": "...",
  "schemaURL": "https://openlineage.io/spec/2-0-2/OpenLineage.json#/$defs/RunEvent",
  "run": { "runId": "<uuid>" },
  "job": { "name": "<job-name>", "namespace": "<namespace>" },
  "inputs": [],
  "outputs": []
}
```

Parent events (DAG/APPLICATION level) use `job.facets.jobType.jobType: "DAG"` or `"APPLICATION"`.
Child events (task level) include `run.facets.parent` linking back to the parent run ID.

---

## Connector documentation

For connector setup instructions and configuration options, see the [Atlan OpenLineage connector documentation](https://ask.atlan.com/hc/en-us/sections/8910785010065-Generic-OpenLineage).
