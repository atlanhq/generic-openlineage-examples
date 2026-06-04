# OpenLineage Studio

A small local app for trying the **generic-openlineage** connector against your
Atlan tenant. Pick an example, see the OpenLineage event payload prefilled, hit
**Send**, and watch assets land under your connection in Atlan. The curl is one
tab away if you want to copy it. The run name is auto-generated and every field
is prefilled — no copy-paste-and-pray.

## Run it

Requires **Node 20+**. Don't have it (or yours is older)? `brew install node`
(macOS) or grab the LTS installer at <https://nodejs.org/en/download>. Check with `node -v`.

```bash
git clone https://github.com/atlanhq/generic-openlineage-examples
cd generic-openlineage-examples/studio
node serve.mjs
```

Working from source? `npm install && npm run build` regenerates `dist/` first.

It opens at <http://localhost:5174> and walks you through a one-time setup:

1. Your Atlan URL — the part before `.atlan.com`.
2. An API key — there's a link in the form to generate one in Atlan.
3. The connection you want to send events to.

Then pick any example, hit **Send**, and click **View assets in Atlan** to see
what landed.

## Start over

Click the avatar dropdown in the header → **Reconnect to a different Atlan**.
Or wipe everything from DevTools console: `localStorage.clear(); location.reload()`.

## Behind a corporate TLS proxy?

If you see TLS errors reaching Atlan, run it as
`node --use-system-ca serve.mjs` so Node trusts your corporate CA.

## Docs

[Generic OpenLineage connector — Atlan docs](https://docs.atlan.com/apps/connectors/lineage/generic-openlineage/how-tos/integrate-generic-openlineage)
