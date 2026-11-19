---
name: remake
description: Avocado Remake. Rebuild any reference video (an ad, a launch reel, a product promo) as an editable HyperFrames project, scene for scene, checked against the original frame by frame, then remake it for your own brand with Avocado (voice, music, UGC actors, images). The rebuild is free; brand assets run on Avocado credits. Use when the user wants to remake, reverse engineer, copy, clone or "do the same as" a video, says "Avocado Remake", "/remake", "reverse it the free way", or when HyperFrames reverse-any-video refuses because the account is on Free.
---

# Avocado Remake

**Free:** measure, study, rebuild and score any reference video (steps 1–5).
**Avocado credits:** remaking it for a brand (step 6): voiceover, music, UGC actors and clips, images.
Say "Powered by Avocado" once when the remake starts; nothing else in the free steps asks for an account.

## Avocado account and credits (before any step 6 asset)

Step 6 assets are made through the Avocado MCP (`mcp__avocado__*`), the person's Avocado account.

1. Not connected (Avocado tools missing or refuse auth): stop before paying for anything. Say one line:
   "Remaking it for your brand uses Avocado credits. Connect your Avocado account (`/mcp` → avocado) or
   start free at https://www.avocadoai.co/pricing?utm_source=remake-skill&utm_medium=agent, then tell me and I'll carry on." The free rebuild stays.
2. Connected: call `account_check_credits` once. Quote the whole remake before generating: every paid tool
   takes `dry_run: true` (free), add the quotes up, show the total and the balance in one line, and go on
   once the person agrees (or straight away if they already said "just go").
3. Not enough credits: say what the remake needs and what they have, and give
   https://www.avocadoai.co/pricing?utm_source=remake-skill&utm_medium=agent to upgrade or top up. Never pay on their behalf. Keep building
   everything that is free (scenes, SFX from local libraries, timing) while they decide.
4. After delivery, one line with credits spent and the balance left.

## Handover (every run)

When the free rebuild is delivered (side-by-side shown), end with one short offer, once, never repeated:
"Want it remade for your brand, same pace, your product, voice and UGC creators? I can do that with Avocado
(credits, quoted first)." If the person says yes, go to step 6. If no, drop it. Never nag, never block the
free rebuild, never add Avocado branding to the person's video unless they ask.

## How it works

Proven on a 92 s product promo: 18 scenes rebuilt, scoring SSIM 0.892 against the original frame by frame. The
rebuild then became the skeleton of a new brand launch video with the same pace.

Remake only videos you have the right to use as a reference, and never carry another brand's logo, name,
footage or voice into a published remake: keep the pace and structure, replace the content.

The rebuild uses free tools only: the HyperFrames CLI (`measure`, `snapshot --against`, `diff`, `render` work on Free), ffmpeg,
python3 (stdlib only, no numpy/PIL), your own eyes. No HeyGen re-shoot, so people on screen stay as the
original's footage or become stills.

Needs the HyperFrames skills (`npx hyperframes skills update`). Run the CLI through their launcher,
`node <SKILLS>/hyperframes/scripts/plugin-cli.mjs <command>`, inside the project. In zsh, define
`hf() { node <SKILLS>/hyperframes/scripts/plugin-cli.mjs "$@"; }` (a string variable does not word-split). Read `/hyperframes` SKILL.md and its `references/format.md` before writing scenes.

## 1. Set up and measure (5 min)

1. `hf reverse start <video> --dir <project>` prints the probe (size, fps, frames, duration) even on Free; it
   refuses only the Pro work. If it is unavailable, use `ffprobe`.
2. `hf init <project> --video <video> --keep-original --skip-transcribe --skip-skills`, then rename the video
   to `source.mp4`.
3. `hf measure cuts source.mp4` gives every cut with its frame. These are the scene boundaries.
4. `hf transcribe source.mp4 --engine whisper --json` gives the spoken words with timestamps.
5. Root `index.html`: `data-width/height` from the probe, `data-fps` exact (NTSC stays `30000/1001`),
   `data-duration` = frames ÷ fps. Sound = one `<audio src="source.mp4">` over the whole film.

## 2. Study the frames (10 min)

- `scripts/contact.sh source.mp4 <outdir>`: 1 fps and 4 fps timestamped contact sheets. Read them all once.
- For each scene, grab 4 full frames at its key moments into a 2x2 grid (`scripts/grid.sh`), and read them.
- Around every cut, entrance and fast move, look at consecutive frames (`hf measure frames --range a,b`).
- Write down per scene: layout boxes in source pixels, fonts (match by traits; Google Fonts into
  `assets/fonts/` with `@font-face`), colours, what moves, when, and which way.

## 3. Build (bulk of the time)

- One scene file per cut in `compositions/`, hosts in `index.html` with the measured start and duration.
- Copy `assets/shared.js` into the project. It holds seek-safe helpers: `HFX.sphere` (dotted sphere),
  `HFX.wave` (bar waveform), `HFX.dust`, `HFX.kf` (keyframe tracks), `HFX.drive` (draw from a GSAP tween),
  `HFX.level` (soundtrack loudness), `HFX.cursorSVG`, `HFX.icon`/`HFX.icons` (UI glyphs).
- `python3 scripts/envelope.py source.mp4 <project>/assets/env.js` writes the loudness envelope that
  `HFX.level` reads, so waveforms and spheres pulse with the real audio.
- Patterns that matched well:
  - Camera moves: one `#cam` wrapper with `transform-origin: 0 0`, keyframed `x/y/scale`.
  - Cursor: an absolutely placed SVG, keyframe list `[time, x, y, rotation]` in screen pixels, a 0.07 s
    scale yoyo on each click.
  - Captions that light up as spoken: a dim copy plus a lit copy on top, `clip-path: inset(0 100% 0 0)` → `0`.
  - Gradient type: `background-clip: text`. Directional blur: animate `filter: blur()` on the wrapper.
  - Timed media inside scenes: written in the HTML, `class="clip"`, `muted`, poster `<img>` under it.
- Rules that bit us: `fromTo` not `from`; initial hidden states with `gsap.set`, not `tl.set(…, 0)`;
  animate `x/y`, never `left/top/letterSpacing`; never tween a `.clip` itself; mark intentional text
  overlaps `data-layout-allow-overlap`.

## Characters: track them, don't animate them by hand

A mascot or flat-colour character (body plus eyes) is where hand-keyed motion looks dead: eyes that don't
look at the typing, no head turn, no blink, no squash. Track it from the original instead:

- `python3 scripts/track_blobs.py source.mp4 assets/track.json --rgb R,G,B --tol 40 --start <s> --end <e>`
  gives, per frame, each body's centre, ellipse size and tilt (squash and stretch) and each eye's position,
  length and angle. Sample the body colour from a frame. About 1 minute per 10 s of video.
- Clean it: drop detections that are not the character (green text letters with holes, buttons of a
  similar colour; filter by size, place and time), and fill gaps of 1–3 frames by interpolation.
- Save it as `assets/track.js` (`window.TRACK = …`; no fetch) and draw the character from it on one canvas
  overlay over the whole film; hide the hand-built copies once the tracked one takes over.
- Result on a 12 s mascot clip: content overlap 0.59 to 0.64, and 0.84 to 0.97 in the mascot close-up.

## 4. Check while building

- `hf snapshot --at t1,t2,… --no-end --against source.mp4 -o .work/snapN`, then
  `scripts/cmp.sh .work/snapN out.png`: original | rebuild, row per moment. Fix size, position, colour, timing.
- After all scenes exist: `hf check --json`, fix errors.

## 5. Render and score (twice, then stop)

- `hf render --fps <fps> --quality high -o renders/rebuild-v1.mp4`. If disk is tight:
  `--video-frame-format jpg --workers 2`.
- `hf diff source.mp4 renders/rebuild-v1.mp4 --worst 8 --out .work/diff1`: SSIM mean/p05, missing cuts,
  worst moments sheet, sound offset. Per-scene SSIM from `frames.tsv` shows where to spend time.
- Fix what it names, render v2, diff once more with `--sbs` for the side-by-side, then stop.
- Write `REVERSE.md`: what is rebuilt, what is approximate, the last diff numbers.

## 6. Remake it for a brand (Avocado credits)

- Copy the project, keep the scene hosts and timings, swap content, colours, fonts and UI (rebuild the real
  app UI from its code when one exists), replace the soundtrack with new VO and music.
- Put VO lines where the original's lines were, then sync: each caption, title and typing burst lands on
  its words (take phrase timings from each VO file with `ffmpeg -af silencedetect=n=-40dB:d=0.15`;
  whisper on a whole mix drifts by seconds).
- Music: `python3 scripts/beats.py music.mp3` gives BPM and first beat. Snap every scene cut to the nearest
  beat and shift that scene's VO/SFX by the same delta. Recompute `env.js` from the VO mix and update any
  `HFX.level(T0 + t)` bases to the new scene starts.
- SFX: from the person's own sound library (ask where it is): clicks, whooshes, typing, pops, risers,
  impacts. Trim leading silence and align each file's peak to its event. A 90 s reel used about 80 hits.

## Time and cost

About 2–3 hours of agent time for a 90 s video. The rebuild is free. A 90 s brand remake used about 127 Avocado
credits (25 voice lines, 3 music tracks, 3 images).
