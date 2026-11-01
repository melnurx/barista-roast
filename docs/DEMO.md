# Demo and submission

The recorded [`demo.mp4`](demo.mp4) is **62.84 seconds**, H.264, 1440×1080 at 25 fps, with burned-in captions; the matching [`demo-captions.srt`](demo-captions.srt) is also supplied. It shows the real app running locally with a server-side key: order interpretation, the mid-pour revision and the final roast each returned HTTP 200 with `source: openai`. The video shows the connected badge, a 2.9-pump caramel commitment that survives the edit, the final receipt and a PNG download. No key appears in the recording. The score, ingredient ledger and 3D animation are deterministic, not model-generated. The recording does not claim a live microphone demonstration.

## 60-second live pitch

**0–12 s:** “This is Barista Roast. Four espresso shots, six caramel pumps, strawberry foam and whipped cream. Your coffee, freshly judged.” Start the order.

**12–25 s:** “OpenAI interprets the order. Now I interrupt: actually, make it healthy. The remaining sweet extras can go, but the 2.9 pumps already poured cannot.” Show the paused glass and revision.

**25–40 s:** “Oat milk and espresso continue. The live roast describes the drink actually made; the chaos score uses explicit arithmetic.”

**40–55 s:** “The receipt preserves 2.9 caramel pumps, four shots and one plot twist.” Save the receipt and show How it works.

**55–63 s:** “Codex built and verified the state engine, caught a parser bug in review and helped make the demo. You can’t un-pour caramel.”

Use text for a reliable live demo. Voice is optional and depends on microphone permission. The browser labels each result `OPENAI CONNECTED` or `LOCAL DEMO` according to its source.

## Two-minute finalist pitch

- 0–15 s: Conversational demos often forget what has already happened. This one makes a change of mind tangible.
- 15–65 s: Run the interruption above and point out committed caramel versus future plan.
- 65–95 s: Show the receipt and score rules. Explain desired, committed and remaining state in one sentence.
- 95–115 s: Show [CODEX.md](../CODEX.md)'s concrete compound negation and additive-quantity bug fixes and the passing tests.
- 115–120 s: “You can change your mind. You can’t un-pour caramel.”

## Useful Q&A

**Is the pouring AI-generated?** No. Three.js deterministically renders ingredient-state changes. OpenAI interprets orders, revisions and writes the final roast when connected.

**Why not fluid physics?** The interaction depends on trustworthy state, responsiveness and distinct ingredients. Geometric approximations gave us a complete loop within the hackathon.

**Does ‘healthy’ mean nutritionally healthy?** No. It cancels future sweet extras in this game; we make no dietary guarantee.

**What if the network fails?** The local parser, scoring, animation and receipt continue. Voice is optional.

**What did Codex materially improve?** It built the scene and state engine, found compound negation and addition bugs in review, fixed them with regression tests, and exercised the end-to-end browser flow.

## Submission checklist

- Public repository with README, setup instructions, MIT and third-party notices.
- Working MP4 demo under 90 seconds, with burned-in captions.
- Test/build evidence and a clear statement of local versus live mode.
- Confirm the hackathon’s actual submission form and required team information, then submit before **17:00 London time, 1 November 2026**. This project does not submit the form or invent team details.
