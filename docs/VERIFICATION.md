# Verification — 1 November 2026

## Evidence

| Boundary | Result |
|---|---|
| Deterministic recipe / reducer / API tests | 26 tests pass via `npm test` |
| Static typing | `npm run typecheck` passes |
| Production build | Sites/Vinext build completes for browser assets and Cloudflare Worker |
| Production HTTP | `/` and `/api/health` return 200 after isolating the browser-only scene from SSR |
| Desktop visual | Inspected the actual WebGL cup, distinct layers, glass, ice and cream |
| Interruption | A partial caramel amount survives “Make it healthy”; future foam and cream are cancelled |
| Actual receipt | Browser run retained 2.8 pumps before/after the edit; the final ledger and roast agree |
| Receipt export | Downloaded PNG successfully and visually inspected it |
| Mobile | 390×844 viewport has no horizontal overflow; input receives focus when paused |
| API outage | Deliberately aborted `/api/order`; local fallback completes the brew, accepts “One more shot”, and delivers 3 actual shots |

## Bugs found and repaired

- Compound negation incorrectly removed ingredients in a following positive clause.
- Explicit “add N” replaced quantities instead of incrementing them.
- Quantity/capacity warnings did not reach the UI.
- The initial production SSR response could fail while the browser recovered. Loading the WebGL scene as a browser-only dynamic component restores a clean HTTP 200 response and splits out the heavy scene code.

The ordinary production browser journey recorded zero console errors. The two failed-network errors in the outage test were deliberately injected by aborting the order route.

## Limits

- No real OpenAI key was configured, by user choice. Optional API success/error paths are covered with mocks; live inference latency and account model access remain unverified.
- Real microphone capture/transcription was not exercised. Browser recognition availability and permission remain device-dependent; text is always available.
- The renderer approximates liquids with layered meshes and shaders. It is not full fluid physics, and the swirl is a visual effect.
- Initial page load still needs the app assets. “Network fallback” means the loaded core survives API failure; this is not an offline-installable PWA.
- The build reports a large Three.js scene chunk. Loading is split from the initial UI; low-powered GPUs may render more slowly.
- A local memory session resets on page reload. There is no saved order history or backend database.
