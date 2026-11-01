# Meaningful Codex use — Barista Roast

Built on 1 November 2026 for the London hackathon. This document records actual work done, not a hypothetical workflow.

## What Codex did

- Narrowed the product around irreversible mid-pour changes, rather than a generic AI recipe form.
- Researched the public SpiritAtlas implementation and competing coffee simulators; avoided copying material without a clear reuse licence.
- Implemented the original procedural Three.js glass, ingredients and pour animation.
- Separated `Recipe` (desired state), `Poured` (committed state) and `PourStep` (remaining work).
- Built and tested the local parser, server API fallback, capacity handling, actual-ingredient scoring and receipt export.
- Used a bounded backend worker alongside frontend work, then an independent read-only correctness review. File ownership prevented overlapping edits.
- Ran a real browser journey: start, interrupt during caramel, request a healthier version, finish and download the receipt; also checked mobile layout and API-failure recovery.

## Concrete example: “No caramel and add two shots”

The first local parser treated a negation as applying across the whole clause. An independent Codex review reproduced a bug: **“No caramel and add two shots” removed espresso as well as caramel.** It also found that **“Add two pumps of caramel” replaced six with two instead of increasing to eight.**

Codex corrected clause boundaries and generalized additive quantities across shots, pumps, millilitres and ice cubes. Regression tests in `lib/recipe.test.ts` cover mixed negative/positive clauses and explicit additions. The shortcut “Add one extra espresso shot” now correctly changes four shots to five.

The same review found that quantity/capacity warnings were retained internally but not shown by the API response. The response and browser fallback now surface those notices.

## Concrete state invariant

A browser run interrupted the sample after **2.4 pumps of caramel**. “Make it healthy” cancelled future foam/cream and stopped more caramel, but the existing 2.4 pumps remained in the scene, ledger, final roast and PNG receipt. Reducer tests verify that pause/resume and revision cannot subtract committed quantities or double-pour a step.

## Production verification example

A production build initially returned an HTTP 500 shell before the client recovered. Codex caught this by checking the real Worker response, isolated the WebGL scene with a browser-only dynamic import, restarted the built Worker, and verified HTTP 200. The scene chunk now loads separately from the initial UI.

## Honest boundaries

Codex authored code during development. It is not running inside every animation frame. The shipped demo is labelled **LOCAL DEMO** and uses a deterministic parser and ingredient-based humour. Optional server-side OpenAI endpoints are present, but real-key inference was not enabled because the user selected local mode. Mocked API tests do not establish real API availability or latency.
