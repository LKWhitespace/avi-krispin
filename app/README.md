# Quote-to-Build — MVP 1 core loop

Frontend-only build of MVP 1 from `docs/prd-quote-to-build.md`, all eleven screens:
Jobs · Job Overview · Intake · Measurements · Unit Builder · Pricing · Library · Quote Builder ·
Revisions & Change Impact · Client Portal · Workshop Settings.
No backend. State lives in the browser's localStorage, with JSON export/import in Settings.
Photos are downscaled before storage; the client portal link therefore only works in the same
browser. To send a quote to a real client today: open as client, print to PDF, send on WhatsApp.

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
| `src/engine/quote.ts` | Quote options priced at the job's margin; portal always prices the sent revision's snapshot |
| `src/ui/image.ts` | Downscale photos to JPEG data URLs for localStorage |
| `src/store/store.tsx` | Reducer + localStorage persistence, revision & production-lock actions |
| `src/pages/*` | One file per PRD screen; `PortalPage` renders outside the app shell at `#/q/:jobId` |

## Not in this build (MVP 2+)

BOM, procurement, cut list, production board, AI parsing of intake text, WhatsApp integration,
a server so portal links work across devices.
