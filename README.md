# Avocado Remake

An agent skill that rebuilds any reference video, scene for scene, as an editable
[HyperFrames](https://github.com/heygen-com/hyperframes) project, then remakes it for your brand.

- **Free rebuild:** measures every cut, studies the frames, rebuilds each scene in HTML and GSAP, and scores
  the result against the original frame by frame (SSIM). No paid plan needed.
- **Brand remake (Avocado credits):** swap in your own voiceover, music, UGC actors and images through
  [Avocado](https://www.avocadoai.co). The skill quotes the cost before generating anything.

Proven on a 92 s product promo: 18 scenes rebuilt at SSIM 0.892, then turned into a new launch video with the
same pace, cuts snapped to the music's beat, and sound effects on every action.

## Install

Requires an agent that loads skills (Claude Code, Codex, Cursor, …), plus `ffmpeg` and `python3`.

```bash
npx hyperframes skills update
npx skills add Wandersonjack/avocado-remake
```

Or copy `skills/remake` into your agent's skills folder (for Claude Code: `~/.claude/skills/remake`).

For the brand remake, connect the Avocado MCP server to your agent and sign in with your Avocado account.

## Use

Give your agent a video file and say:

> /remake this video

or "remake this ad for my brand". The agent rebuilds the video first (free), shows you a side-by-side with
the original, then asks before spending any credits on the brand version.

## What's inside

| File | What it does |
|---|---|
| `skills/remake/SKILL.md` | The method: measure, study, build, check, render and score, remake for a brand |
| `scripts/contact.sh` | 1 fps and 4 fps timestamped contact sheets of the reference |
| `scripts/grid.sh` | A 2x2 grid of four full frames at chosen times |
| `scripts/cmp.sh` | Original and rebuild side by side, one row per moment |
| `scripts/envelope.py` | Loudness envelope so waveforms and spheres move with the real audio |
| `scripts/beats.py` | Music tempo and first beat, to snap scene cuts onto the beat |
| `scripts/track_blobs.py` | Tracks a mascot frame by frame (body squash and tilt, eye position and angle) so the rebuild moves like the original |
| `assets/shared.js` | Seek-safe drawing helpers: dotted sphere, bar waveform, dust, keyframes, cursor, UI icons |

## Use responsibly

Use reference videos you have the right to study. Keep the pace and structure; replace the content. Never
publish a remake with another brand's logo, name, footage or voice.

## License

MIT. HyperFrames is a separate project by HeyGen under the Apache License 2.0; Avocado Remake uses its public
CLI and is not affiliated with HeyGen.
