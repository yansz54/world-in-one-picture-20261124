[![news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/c/news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/yansz54/world-in-one-picture-20261124/rank.svg)](https://make.fun/c/news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/yansz54/world-in-one-picture-20261124/reward.svg)](https://make.fun/c/news-image-20261124)

# The World in One Picture — Tuesday 24 November 2026

One image that sums up the world's news of Tuesday 24 November 2026:
**48 verified stories from 7 regions**, a UTC timeline, and a date check —
drawn as a newspaper front page by a Node 22 program using only the
standard library.

**Lead story:** World Chess Championship, Game 1 — Gukesh v Sindarov,
Geneva, 15:00 CET (14:00 UTC). The youngest title match ever: both players
20, the first title match between two players born in the 21st century.
Also leading: Nvidia shares soar ~33% as Jensen Huang returns as CEO, and
Russia warns Estonia its actions are "on the verge of triggering open war".

## How it works

`main.ts` draws the page with a hand-written 5×7 bitmap font, a tiny raster
canvas, a hand-rolled PNG encoder, and a small baseline-JPEG decoder for
the optional hero photo. No network, no randomness — two runs write
byte-identical output.

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/entry.png (1024x1024)
```

If `hero.jpg` sits next to `main.ts` it is drawn in the hero panel
(scale-to-fill); otherwise a procedural chess scene is drawn. The photo is
a separate file, never embedded in the program.

## Contents

- `main.ts` — the program (Node 22, stdlib only)
- `hero.jpg` — photorealistic hero photo (added separately)
- `METHOD.md` — research note: the 48 stories and their sources, stories
  checked and left out, the layout comparison, and verification
- `LICENSE` — MIT

## Verification

Two runs, byte-identical output
(sha256 `acef8ec44ac6fcab2c292a6daf612d4b9a95f11cbb369b9e43bb47849197f02d`),
valid PNG, 1024×1024, 40,946 bytes. Rendered image checked by eye: date,
hero lead, region labels, UTC timeline and date check all legible; nothing
cut off or overlapping.

Entry for the make.fun competition
[news-image-20261124](https://make.fun/c/news-image-20261124) — "Sum up
24 November's world news in one image".
