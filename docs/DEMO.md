# Demo and submission

The recorded demo is [`demo.mp4`](demo.mp4): **54.8 seconds**, H.264, 1440×1080 at 25 fps, with burned-in captions. It shows the actual production build in local mode, including a partial pour, interruption, revised drink, swirl, receipt download and mode disclosure. No live AI or real-microphone performance is claimed.

## 60–75 second narrated demo

**0–8 s:** “This is Barista Roast. Your coffee, freshly judged. It’s a coffee sandbox where changing your mind has consequences.”

**8–16 s:** Select Pure chaos. “Four shots, six caramel pumps, strawberry foam, whipped cream—and make it healthy.” Click Make my coffee.

**16–27 s:** After the caramel begins, click Actually. “Actually… make it healthy.” Click the quick action. Point to the notice and ledger. “Beau can cancel what’s next. He can’t un-pour the caramel already in the glass.”

**27–42 s:** Watch the remaining milk and espresso finish. Read the final roast. “The humour and scores reflect the drink actually made, including the part of a pump we committed.”

**42–55 s:** Rotate the cup, open the receipt, download it. “A playful archetype, transparent chaos arithmetic, and a receipt worth sharing.”

**55–70 s:** “Codex built the scene and state engine, then independently caught a compound-order parser bug. Regression tests now protect it. This recording uses clearly labelled local mode; optional OpenAI endpoints interpret orders and write roasts server-side. No language model generates animation frames.”

Keep the recording under 90 seconds. Do not claim live AI while the footer reads LOCAL DEMO. Use text for a reliable submission recording; voice is an optional live flourish, dependent on browser permission/service.

## Two-minute finalist pitch

- 0–15 s: Problem/hook—conversational demos usually forget what has already happened.
- 15–65 s: Run the interaction above; let the partial caramel be the memorable moment.
- 65–95 s: Show receipt and explicit score rules. Explain desired/committed/remaining state in one sentence.
- 95–115 s: Show CODEX.md’s concrete bug/fix and tests. Distinguish local fallback from optional API paths.
- 115–120 s: “You can change your mind. You can’t un-pour caramel.”

## Useful Q&A

**Is the pouring AI-generated?** No. Three.js deterministically renders ingredient-state changes. Optional AI chooses a structured recipe and writes commentary.

**Why not fluid physics?** The interaction depends on trustworthy state, responsiveness and distinct ingredients. Geometric approximations gave us a complete polished loop within the hackathon.

**Does ‘healthy’ mean nutritionally healthy?** No. It cancels future sweet extras in this game; we make no dietary guarantee.

**What if the network fails?** The local parser, scoring, animation and receipt continue. Voice is optional.

**What did Codex materially improve?** It built the scene/state engine, found compound negation/addition bugs in review, fixed them with regression tests, and exercised the end-to-end browser flow.

## Submission checklist

- Public repository with README, setup instructions, MIT and third-party notices.
- Working MP4 demo of no more than 90 seconds.
- Test/build evidence and clear statement of local versus live mode.
- Confirm the hackathon’s actual submission form and required team information, then submit before **17:00 London time, 1 November 2026**. This project does not submit the form or invent team details.
