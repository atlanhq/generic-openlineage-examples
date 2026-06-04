# OpenLineage Sample Events for Atlan

Sample OpenLineage events — and an app to send them — for testing and validating your
Atlan Generic OpenLineage connector. Send events to your tenant and watch
FlowControlOperations, Processes, and lineage assets appear in the UI.

---

## OpenLineage Studio

The easiest way to send these events is **[OpenLineage Studio](studio/)** — a small local
app. Pick an example, see the OpenLineage payload prefilled, hit **Send**, and watch
assets land under your connection in Atlan. No terminal, no copy-paste, and no
`npm install`.

```bash
cd studio
node serve.mjs        # opens http://localhost:5174
```

Requires **Node 20+**. It walks you through a one-time setup — your Atlan URL, an API
key, and the connection to send to — then you pick any example and send. Full details in
[studio/README.md](studio/).

---

## Examples

Studio and the Python CLI both send the same sample events:

| # | Example | Events | What appears in Atlan |
|---|---------|--------|----------------------|
| 01 | [Simple DAG](examples/01_simple_dag/) | 4 | Parent + child FlowControlOperation, no datasets |
| 02 | [DAG with table lineage](examples/02_dag_with_lineage/) | 4 | FCOs + Process + Postgres input → Snowflake output |
| 03 | [Multi-task DAG](examples/03_multi_task_dag/) | 8 | 3 child FCOs, Postgres → S3 → S3 → Snowflake lineage chain |
| 04 | [Column-level lineage](examples/04_column_lineage/) | 4 | FCOs + Process + ColumnProcess assets (BigQuery → BigQuery) |
| 05 | [Spark multi-job application](examples/05_spark_multi_job/) | 8 | Parent Application FCO + 3 job FCOs, MySQL ×2 → BigQuery lineage |
| 06 | [Spark column-level lineage](examples/06_spark_cll/) | 4 | Application + job FCO + Process + ColumnProcess (PostgreSQL ×2 → Redshift) |

---

## Send from a script (Python CLI)

Prefer a terminal or CI pipeline? `send_events.py` POSTs an example's events to your
endpoint:

```bash
python send_events.py examples/01_simple_dag
```

See [docs/send-events-cli.md](docs/send-events-cli.md) for setup (Python dependencies
and `.env`).

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
