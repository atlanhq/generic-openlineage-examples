# Sending events with the Python CLI

`send_events.py` is a minimal Python script for sending the sample events from a
terminal or CI pipeline. For an interactive, point-and-click experience, use
[OpenLineage Studio](../studio/) instead.

## Prerequisites

- Python 3.8+
- An Atlan tenant with the Generic OpenLineage connector configured
- An Atlan API key (Settings → API Keys)

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

## Usage

```bash
python send_events.py examples/01_simple_dag
```

The script reads all `.json` files from the example's `events/` directory in sorted
order and POSTs each one to your Atlan endpoint. Status is printed for each event.

See the [examples catalog](../README.md#examples) for what each one produces in Atlan.
