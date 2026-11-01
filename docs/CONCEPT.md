# Product decision

**Barista Roast — Your coffee. Freshly judged.**

The entertaining part is the clash between an elaborate request and a barista who must respect reality. A beautiful glass is the opening hook; the irreversible interruption is the story. Friendly humour should target the order, not the customer.

## Judging assessment

| Criterion | Target | What earns it | Main risk |
|---|---:|---|---|
| Idea / usefulness | 4/5 | Expressive coffee sandbox demonstrating state-aware conversational control | Entertainment is clearer than long-term utility |
| Codex use | 5/5 | Documented implementation, independent review finding, regression tests and browser verification | Vague claims without CODEX.md evidence |
| Execution | 4/5 | Complete order → animation → change → grounded receipt loop, usable without network AI | WebGL variability and live-voice permissions |
| Demo clarity | 5/5 | “You can’t un-pour caramel” visible within the first 15 seconds | Spending the demo explaining APIs instead of interacting |

These are product targets, not predicted judge scores.

## Three selected twists

1. **The “Actually…” interruption:** pause the exact current pour and change only the remaining plan.
2. **“Make it healthy” panic button:** preserve committed syrup, cancel future sweet extras, and let Beau acknowledge the contradiction without a health claim.
3. **A roast receipt:** actual ingredients, explicit game scores and a fictional order archetype in a downloadable visual.

Mid-preparation change is the strongest differentiator because it demonstrates semantic interpretation, state tracking and humour at once. A random funny name alone would be easy to reproduce and difficult to demo memorably.

## Research

The [official Singapore gallery](https://astra-hackathon-singapore.openai.chatgpt.site/gallery) links [SpiritAtlas](https://github.com/ilhamfp/SpiritAtlas). Its README documents Three.js scenes, Blender assets, prerecorded cinematic video and an interactive mode. Its visual ambition is a precedent, not evidence that a five-hour project needs the same asset pipeline. No clear top-level licence was found, so its code/assets were not reused. Maker claims about specific physics technology were not treated as independently verified source evidence.

[SIM✱BUCKS](https://github.com/NikolayS/simbucks) documents a Three.js coffee-station game and an Apache-2.0 licence. [Coffee Shop Simulator](https://github.com/rossidoyle/coffee-shop-simulator) documents a Three.js/TypeScript cafe game. Existing coffee games cover process simulation; our emphasis is conversational changes after a partial action. This is a bounded comparison of inspected public descriptions, not a claim that no other project has ever done it.

## Architecture shortcuts

- Procedural meshes and liquid-layer shaders instead of downloaded models or full fluid physics.
- A finite ingredient catalog shared by parser, validator, renderer and score engine.
- Server-side structured model output, independently validated before it affects the scene.
- Local parsing and ingredient-based jokes if no key or a request fails.
- Explicit microphone activation and typed-input fallback.
- No login implementation, database, walking avatar, entire shop, billing, image generation per drink, or unnecessary LLM calls during a pour.

## First go/no-go milestone

Render a transparent glass with distinct layers and a visible growing pour in the real browser. This was completed before final demo packaging. Remaining physical realism is deliberately approximated: the layers are a stylized ingredient visualization, not a fluid simulation.
