"""Track flat-colour characters (a mascot body with light 'eyes' cut into it) frame by frame.

usage: python3 track_blobs.py <video> <out.json> [--rgb 54,227,151] [--tol 60] [--min-area 120]
       [--start 0] [--end 999] [--eye-min 248]

For every frame it finds each connected region of the body colour (bigger than --min-area pixels at
half resolution) and reports, in source pixels:
  cx, cy        centre of the body
  rx, ry, ang   ellipse half-axes and tilt in degrees (from second moments): squash and stretch
  eyes          light holes inside the body: [{x, y, len, wid, ang}], ang 0 = vertical
Output: {"fps": .., "w": .., "h": .., "frames": [[blob, ...], ...]}. Pure python, no numpy.
Drive a canvas from it in the rebuild (see SKILL.md, "Characters").
"""
import sys, json, math, subprocess

args = sys.argv[1:]
src, out = args[0], args[1]
opt = {args[i][2:]: args[i + 1] for i in range(2, len(args) - 1, 2)}
R0, G0, B0 = [int(v) for v in opt.get('rgb', '54,227,151').split(',')]
TOL = float(opt.get('tol', 60)); MIN_AREA = int(opt.get('min-area', 120)); EYE = int(opt.get('eye-min', 248))
T_START = float(opt.get('start', 0)); T_END = float(opt.get('end', 999))

pr = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate',
                     '-of', 'csv=p=0', src], capture_output=True, text=True, check=True).stdout.strip().split(',')
SW, SH = int(pr[0]), int(pr[1]); num, den = pr[2].split('/'); FPS = float(num) / float(den)
W, H = SW // 2, SH // 2; K = SW / W  # analyse at half resolution
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(T_START), '-i', src, '-t', str(T_END - T_START),
                         '-vf', f'scale={W}:{H}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
tol2 = TOL * TOL
frames = []
while True:
    buf = proc.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    body = bytearray(W * H)
    for i in range(W * H):
        o = i * 3; r = buf[o] - R0; g = buf[o + 1] - G0; b = buf[o + 2] - B0
        if r * r + g * g + b * b < tol2: body[i] = 1
    seen = bytearray(W * H); blobs = []
    for start in range(W * H):
        if not body[start] or seen[start]: continue
        stack = [start]; seen[start] = 1; px = []
        while stack:
            p = stack.pop(); px.append(p); y, x = divmod(p, W)
            for q in (p - 1 if x else -1, p + 1 if x < W - 1 else -1, p - W, p + W):
                if 0 <= q < W * H and body[q] and not seen[q]: seen[q] = 1; stack.append(q)
        if len(px) < MIN_AREA: continue
        # row spans: everything between the leftmost and rightmost body pixel of a row is "inside"
        rows = {}
        for p in px:
            y, x = divmod(p, W); a = rows.get(y)
            rows[y] = (min(a[0], x), max(a[1], x)) if a else (x, x)
        inside = []
        for y, (x0, x1) in rows.items():
            for x in range(x0, x1 + 1): inside.append((x, y))
        n = len(inside); mx = sum(x for x, _ in inside) / n; my = sum(y for _, y in inside) / n
        sxx = sum((x - mx) ** 2 for x, _ in inside) / n; syy = sum((y - my) ** 2 for _, y in inside) / n
        sxy = sum((x - mx) * (y - my) for x, y in inside) / n
        tr = sxx + syy; dt = math.sqrt(max(0, (sxx - syy) ** 2 / 4 + sxy * sxy))
        l1, l2 = tr / 2 + dt, tr / 2 - dt; ang = 0.5 * math.degrees(math.atan2(2 * sxy, sxx - syy))
        if n / (math.pi * 2 * math.sqrt(max(l1, 1e-6)) * 2 * math.sqrt(max(l2, 1e-6))) < 0.6: continue  # not a filled blob
        # eyes: light pixels inside the body's row spans
        eye = set()
        for y, (x0, x1) in rows.items():
            for x in range(x0, x1 + 1):
                o = (y * W + x) * 3
                if min(buf[o], buf[o + 1], buf[o + 2]) >= EYE and not body[y * W + x]: eye.add((x, y))
        eyes = []; left = set(eye)
        while left:
            s0 = left.pop(); st = [s0]; grp = [s0]
            while st:
                x, y = st.pop()
                for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if q in left: left.remove(q); st.append(q); grp.append(q)
            if len(grp) < 2: continue
            m = len(grp); ex = sum(x for x, _ in grp) / m; ey = sum(y for _, y in grp) / m
            a = sum((x - ex) ** 2 for x, _ in grp) / m; c = sum((y - ey) ** 2 for _, y in grp) / m
            b = sum((x - ex) * (y - ey) for x, y in grp) / m
            d = math.sqrt(max(0, (a - c) ** 2 / 4 + b * b)); e1, e2 = (a + c) / 2 + d, (a + c) / 2 - d
            th = 0.5 * math.degrees(math.atan2(2 * b, a - c))  # major axis angle from +x
            eyes.append({'x': round(ex * K + K / 2, 1), 'y': round(ey * K + K / 2, 1), 'len': round(4 * math.sqrt(e1) * K, 1),
                         'wid': round(max(1, 4 * math.sqrt(max(e2, 0))) * K, 1), 'ang': round(th - 90 if th > 0 else th + 90, 1), 'n': m})
        eyes = sorted(sorted(eyes, key=lambda e: -e['n'])[:2], key=lambda e: e['x'])
        for e in eyes: e.pop('n')
        blobs.append({'cx': round(mx * K + K / 2, 1), 'cy': round(my * K + K / 2, 1), 'rx': round(2 * math.sqrt(l1) * K, 1),
                      'ry': round(2 * math.sqrt(max(l2, 0)) * K, 1), 'ang': round(ang, 1), 'eyes': eyes})
    frames.append(blobs)
json.dump({'fps': FPS, 'w': SW, 'h': SH, 'start': T_START, 'frames': frames}, open(out, 'w'))
print(len(frames), 'frames,', sum(len(f) for f in frames), 'blob detections')
