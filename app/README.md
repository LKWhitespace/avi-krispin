# Quote-to-Build — MVP 1 core loop

Frontend-only build of the core loop from `docs/prd-quote-to-build.md`:
Settings · Library · Jobs · Unit Builder · Pricing · Revisions & Change Impact.
No backend. State lives in the browser's localStorage, with JSON export/import in Settings.

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm test           # engine tests (vitest)
npm run build      # static output in dist/
```

## Layout

| Path | What |
|---|---|
| `src/model/types.ts` | Data model: Job, Unit (parametric / area / freeform), Dimension with confidence, Revision snapshot |
| `src/model/presets.ts` | Israeli material & hardware presets, default workshop settings, sample job |
| `src/engine/parametric.ts` | Parts derivation from W/H/D + bays + doors; hardware rules |
| `src/engine/pricing.ts` | Sheets, edge banding, labor, overhead, risk, recommended price, margin, warnings |
| `src/engine/impact.ts` | Change impact between two snapshots |
| `src/store/store.tsx` | Reducer + localStorage persistence, revision & production-lock actions |
| `src/pages/*` | Screens S1, S2, S5, S6, S7, S9, S11 from the PRD |

## Not in this build (next pass)

Intake draft (S3), Measurements (S4), Quote Builder (S8), Client Portal (S10), BOM, cut list.
The tabs exist but are disabled.
