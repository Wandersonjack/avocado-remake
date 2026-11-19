"""usage: python3 beats.py <music> [min_bpm max_bpm]  -> BPM, first beat time, beat length; snap with
   t_snapped = first + round((t - first) / beat) * beat"""
import sys, subprocess, struct, math
src = sys.argv[1]; lo = float(sys.argv[2]) if len(sys.argv) > 2 else 70; hi = float(sys.argv[3]) if len(sys.argv) > 3 else 180
sr = 11025; hop = 110
d = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
n = len(d) // 4; a = struct.unpack('<%df' % n, d)
lp = 0.0; low = []
for x in a: lp += 0.08 * (x - lp); low.append(lp)
e = [math.sqrt(sum(v * v for v in low[i:i + hop]) / hop) for i in range(0, n - hop, hop)]
fl = [max(0, e[i] - e[i - 1]) for i in range(1, len(e))]; fps = sr / hop
best = None
for b10 in range(int(lo * 10), int(hi * 10) + 1, 2):
    T = 60 / (b10 / 10) * fps
    for ph in range(int(T)):
        sc = 0; k = 0
        while True:
            i = int(round(ph + k * T))
            if i >= len(fl): break
            sc += fl[i]; k += 1
        if best is None or sc > best[0]: best = (sc, b10 / 10, ph / fps)
print(f"bpm {best[1]}  first_beat {best[2]:.3f}s  beat {60 / best[1]:.4f}s  bar {240 / best[1]:.4f}s")
