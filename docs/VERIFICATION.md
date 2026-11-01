# Verification — 1 November 2026

## Evidence

| Boundary | Result |
|---|---|
| Deterministic recipe / reducer / API tests | 27 tests pass via `npm test`, including rounded spoken quantity versus exact committed quantity |
| Static typing | `npm run typecheck` passes |
| Production build | Sites/Vinext build completes for browser assets and Cloudflare Worker |
| Production HTTP | `/` and `/api/health` return 200 after isolating the browser-only scene from SSR |
| Desktop visual | Inspected the enlarged WebGL cup, distinct layers, glass, ice, cream, pitcher and completion; 1280×800 laptop and 1920×1080 projector layouts have no horizontal overflow |
| Final visual layout | The 1440×900 desktop stage, order field, Beau reaction and score fit without page scrolling; 390×844 mobile keeps the order control first and has no horizontal overflow; tall 1440×1080 scene captures complete in about two seconds after lowering maximum canvas DPR to 1.35 |
| Interruption | A partial caramel amount survives “Make it healthy”; future foam and cream are cancelled |
| Actual receipt | Browser run retained 2.8 pumps before/after the edit; the final ledger and roast agree |
| Receipt export | Downloaded PNG successfully and visually inspected it |
| Mobile | 390×844 viewport has no horizontal overflow; input receives focus when paused |
| API outage | Deliberately aborted `/api/order`; local fallback completes the brew, accepts “One more shot”, and delivers 3 actual shots |
| Live OpenAI orders | Three new creative orders returned HTTP 200, `source: openai`, in 3.4 s, 3.7 s and 3.3 s; requested and excluded ingredients matched the structured recipes |
| Live mid-pour revision | In a real browser, a five-pump caramel plan was interrupted at 1.556 pumps. The healthy edit cancelled the rest and whipped cream; the final drink retained 1.556 caramel, 180 ml soy, 3 espresso shots and 5 ice cubes |
| Live final roast | HTTP 200, `source: openai`; revised prompt returned a short drink name and joke about the partial caramel, while the deterministic chaos score remained 43 |
| Final UI live flow | At 1440×900, a live OpenAI order was paused at 1.255 caramel pumps; the OpenAI healthy revision retained that exact amount, cancelled future strawberry foam and whipped cream, and the final OpenAI roast and receipt showed 1.3 pumps, four shots, one change and chaos 50 |
| Live transcription endpoint | A recorded test WAV was transcribed accurately via `POST /api/transcribe` with `source: openai` in 2.9 s |
| Real microphone and UI | Browser opened the MacBook Pro built-in microphone, recorded a test phrase played aloud through the computer speakers, posted it to `/api/transcribe`, received HTTP 200 with `source: openai`, and displayed the accurate text in the order field |
| Voice failure UI | A browser-injected microphone denial showed the permission error, retained an enabled text field, and left the microphone control ready for another try |
| Anonymous hosted page and assets | Public URL returned HTTP 200; real Chrome loaded its WebGL canvas and eight observed script/style/font assets with no failures or console errors |
| Hosted order-to-receipt | Order, healthy revision and final roast each returned HTTP 200, `source: openai`; 1.158 committed caramel pumps survived the edit and appear as 1.2 in the final ledger, receipt and PNG alongside four espresso shots; future strawberry foam and whipped cream were cancelled |
| Hosted transcription | Anonymous `POST /api/transcribe` returned HTTP 200, `source: openai`, with the expected recorded-WAV text in 3.1 s |

## Bugs found and repaired

- Compound negation incorrectly removed ingredients in a following positive clause.
- Explicit “add N” replaced quantities instead of incrementing them.
- Quantity/capacity warnings did not reach the UI.
- The initial production SSR response could fail while the browser recovered. Loading the WebGL scene as a browser-only dynamic component restores a clean HTTP 200 response and splits out the heavy scene code.

The ordinary production browser journey recorded zero console errors. The two failed-network errors in the outage test were deliberately injected by aborting the order route.

## Limits

- The local API checks used an ignored server-side key. The hosted Site uses a separate redacted server-side secret and was verified anonymously at [the public URL](https://barista-roast-london.melnur461195.chatgpt.site).
- Browser microphone transcription worked with a computer-spoken test phrase captured through the real input device. Actual event-room noise, accents and speaker volume may vary; text is always available.
- The renderer approximates liquids with layered meshes and shaders. Layer stacking follows ingredient categories because the scene receives aggregate poured quantities rather than chronological pour events. Changing the stacking rule without a pour history could misrepresent the reliable ledger; the swirl is a visual effect.
- Initial page load still needs the app assets. “Network fallback” means the loaded core survives API failure; this is not an offline-installable PWA.
- The build reports a large Three.js scene chunk. Loading is split from the initial UI; low-powered GPUs may render more slowly.
- A local memory session resets on page reload. There is no saved order history or backend database.
