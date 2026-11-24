# METHOD — The World in One Picture: Tuesday 24 November 2026

## What this is
A Node 22 program (`main.ts`, stdlib only) that draws one newspaper front
page summing up the world's news of Tuesday 24 November 2026 and writes it
to `/output/entry.png` (1024×1024 PNG, 40,946 bytes). No network, no clock,
no randomness — two runs write byte-identical output.

Run: `MAKEFUN_OUTPUT_DIR=out node main.ts` (grader: `node main.ts`).

## The day's news — 48 verified stories, 7 regions
Full list with sources: `../news-image-20261124-stories.md` (kept outside
this repo). Counts: Europe 18, Asia 9, Americas 7, Middle East 4, Africa 3,
Oceania 4, Global/Tech 3 = **48 stories**.

**Hero (lead story):** World Chess Championship, Game 1 — Gukesh v Sindarov,
Geneva, 15:00 CET (14:00 UTC). Chosen because it is the cleanest
unambiguous 24 Nov event: it starts that day, it is globally recognisable,
and it is the youngest title match ever (both 20, first between two players
born in the 21st century). Sources: Chess.com, FIDE.
**Lead 2:** Nvidia shares soar ~33% (~$1tn) as Jensen Huang returns as CEO
(Reuters). **Lead 3:** Russia warns Estonia its actions are "on the verge
of triggering open war" (Reuters).

**Date rule (from RULES.txt):** every story happened, or was first reported,
on 24 November 2026 in some time zone. Late-Monday-UTC wire stories count
because they were first reported on 24 Nov in Asia-Pacific time zones
(UTC+8 to +14) — e.g. Reuters 16:03 UTC Mon = 00:03 Tue Singapore;
22:09 UTC Mon = 09:09 Tue Sydney. Those are flagged (B) in the stories file.
The hero, the Champions League night, the Manila strike (day 2), the
Indonesia factory search, the Gaza students' arrival in Ireland, the US
Congress session and the Australian political items all happened on Tuesday
24 Nov itself.

**Checked and left out** (broke 17–23 Nov, not 24 Nov): COP31 ending without
a deal (22 Nov), ICJ Myanmar genocide ruling (19 Nov), Waymo freeway
suspension (17 Nov), Wellington Test draw (23 Nov), Merkury warship claim
(attack 22 Nov, claimed 23 Nov), Dhruv Rathee warrant (23 Nov), Austria
Foreign Ministry hack (disclosed 20 Nov), EU Big Tech digital tax (21 Nov),
Senegal boat capsize (17–18 Nov), Manchester concert evacuation (22 Nov),
NATO "Sputnik-S" report (23 Nov), Kyiv strikes toll (22–23 Nov),
South Korea reshuffle (23 Nov), China care plan (23 Nov), Molly Meldrum's
death (23 Nov), China drone-component controls (18 Nov), BYD Ti7 EU ban
(ruling 20 Nov), Europe gas-price surge (23 Nov), Gaza children arriving in
the UK (23 Nov). Full list in the stories file.

## Layout comparison (3 variants, judged against the judge criteria)
- **V1 — Broadsheet front page (WINNER).** Masthead + black date band +
  full-width hero + two leads + 7 region blocks in two columns + UTC
  timeline + sources footer. Best density (48 stories fit without
  crowding), clearest region grouping, and the checklist items
  (date, hero lead, region labels, timeline, date check) are all large.
  Matches the winning pattern of the sibling contests: superskie won 1st
  three days running (19, 20, 21 Nov) with the clean "in one picture"
  front page, and the other top-3 entries packed 42–52 sourced stories,
  7 regions, a UTC timeline and a date check.
- **V2 — Timeline spine.** A vertical UTC timeline down the centre with
  stories branching left/right by region. Rejected: the spine eats ~120 px
  of width, region blocks shrink, and 48 stories no longer fit at legible
  size; the day reads as a schedule, not a front page.
- **V3 — Magazine cover.** Huge hero on the top half, region grid below.
  Rejected: the hero eats half the page, leaving room for ~30 stories;
  breadth (judge criterion 2) suffers and the timeline has nowhere to go.
V1 won on completeness + legibility + date/lead clarity.

## How it is drawn
- Hand-written 5×7 bitmap font (glyphs stored as 7 five-bit row values),
  a tiny RGBA raster canvas, and a hand-rolled PNG encoder (zlib, level 9).
- Hero panel: if `hero.jpg` sits next to `main.ts` it is drawn in the hero
  panel (scale-to-fill, centre-cropped); otherwise a procedural chess scene
  is drawn (Geneva sky, Alps, Lake Geneva, Jet d'Eau, the board set for
  Game 1 with Sindarov White / Gukesh Black, both flags). The photo is a
  separate repo file, never base64 in the program.
- Baseline-JPEG decoder (written in this session, stdlib only): 8-bit,
  1 or 3 components, 4:4:4 / 4:2:2 / 4:2:0, restart markers, Huffman +
  separable IDCT + YCbCr→RGB. Progressive, arithmetic and CMYK files
  return null and fall back to the procedural hero.
- Text is ASCII-only (the font has no accented glyphs); "Bodo/Glimt" is
  spelled without the ø.

## Verification (this session)
- Rendered with `MAKEFUN_OUTPUT_DIR=/tmp/outA node main.ts` and again to
  `/tmp/outB`: both runs byte-identical —
  sha256 `acef8ec44ac6fcab2c292a6daf612d4b9a95f11cbb369b9e43bb47849197f02d`.
- Valid PNG, 1024×1024, 40,946 bytes (limit 1 MiB).
- Looked at the rendered image: every letter and digit checked; all five
  checklist items legible (masthead/date scale 5–6, hero headline scale 3,
  leads scale 3, region headers + timeline scale 2, date-check strip);
  nothing cut off or overlapping; region grid ends clear of the timeline
  rule; sources footer complete.
- JPEG decoder tested with PIL-generated files: 4:2:0 colour, 4:4:4 colour
  and grayscale all decode with correct colours (verified visually);
  a progressive JPEG correctly falls back to the procedural hero
  (byte-identical to the no-photo run). Restart-marker handling is
  implemented per spec but was not exercised by a real restart file.
- Revisions in-session: v1 (layout + procedural hero, JPEG stub) →
  rev 2 (paper chips behind hero names so they read over the mountains;
  tighter region-grid spacing so the last brief clears the timeline rule)
  → rev 3 (real baseline-JPEG decoder replacing the stub).

## Hero photo (added in this session)
- `hero.jpg` (1920×1280, 375,006 bytes, baseline JPEG — SOF0 verified, so
  the in-program decoder reads it) is the photorealistic Geneva scene:
  both grandmasters at the board in a grand hall with Swiss flags, warm
  spotlights, blurred audience, no text in the image. Separate repo file,
  never base64 in the program.
- `main.ts` was revised in-session (rev 4): the hero overlay (title,
  flags, name chips, "v", venue line) was split out of `drawHeroArt`
  into `drawHeroOverlay` and is now drawn over the art either way; in
  photo mode the same words are reflowed into the photo's clear zones
  (players in far-left / far-right columns, title and venue lines in the
  dark centre gap) so no paper chip covers a face, and the photo crop is
  biased toward the top of the frame (0.35) so both faces fill the panel.
  The no-photo render is byte-identical to the verified procedural render
  (sha256 `acef8ec4…97f02d`), confirming the refactor changed nothing else.
- Final render: valid PNG, 1024×1024, 237,817 bytes (limit 1 MiB);
  two runs byte-identical — sha256
  `3dee585c7edf0c9927a15bdfbdb22cb4d66a3a9a5813044595c165f90c4664ef`.
  Looked at the render: both faces fully visible, flags and name chips
  legible on paper chips, title / "v" / venue lines legible in the centre
  gap, all five checklist items present (sources, UTC timeline, 7 regions
  with counts, date + date check, clear lead story), nothing cut off or
  overlapping.

## Notes for the submitter
- `hero.jpg` (photorealistic, Geneva chess scene) is added by a separate
  session; re-run and re-check the image after it lands — the layout and
  all text stay the same, only the hero art region changes.
- Do not publish, bundle or submit from this session; that is the parent's
  job after the user approves the image.
