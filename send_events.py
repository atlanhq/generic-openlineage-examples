#!/usr/bin/env python3
"""
Send OpenLineage sample events to an Atlan endpoint.

Usage:
    python send_events.py examples/01_simple_dag
    python send_events.py examples/02_dag_with_lineage
"""

import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

ENDPOINT = os.environ.get("OL_ENDPOINT")
API_KEY = os.environ.get("API_KEY")


def validate_config():
    if not ENDPOINT or "<your-tenant>" in ENDPOINT:
        print("ERROR: OL_ENDPOINT not set. Copy .env.example to .env and fill in your values.")
        sys.exit(1)
    if not API_KEY or "<your-api-key>" in API_KEY:
        print("ERROR: API_KEY not set. Copy .env.example to .env and fill in your values.")
        sys.exit(1)


def send_events(example_dir: str):
    events_dir = Path(example_dir) / "events"
    if not events_dir.exists():
        print(f"ERROR: No events/ directory found at {events_dir}")
        sys.exit(1)

    event_files = sorted(events_dir.glob("*.json"))
    if not event_files:
        print(f"ERROR: No JSON files found in {events_dir}")
        sys.exit(1)

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }

    print(f"Sending {len(event_files)} events from {example_dir} to {ENDPOINT}\n")

    for event_file in event_files:
        with open(event_file) as f:
            event = json.load(f)

        try:
            resp = requests.post(ENDPOINT, json=event, headers=headers, timeout=30)
            if resp.ok:
                print(f"[OK]   {event_file.name}  →  {resp.status_code}")
            else:
                print(f"[FAIL] {event_file.name}  →  {resp.status_code}: {resp.text[:200]}")
        except requests.exceptions.RequestException as e:
            print(f"[ERR]  {event_file.name}  →  {e}")

        time.sleep(0.5)

    print("\nDone. Check your Atlan tenant for the resulting assets.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python send_events.py <example_dir>")
        print("Example: python send_events.py examples/01_simple_dag")
        sys.exit(1)

    validate_config()
    send_events(sys.argv[1])
