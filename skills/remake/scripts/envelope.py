"""usage: python3 envelope.py <audio-or-video> <out env.js>  -> window.HFX_ENV, loudness 0..1 at 30 values/s"""
import sys, subprocess, struct, math
src, out = sys.argv[1], sys.argv[2]
d = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
n = len(d) // 4; a = struct.unpack('<%df' % n, d); hop = 1600
env = [math.sqrt(sum(x * x for x in a[i:i + hop]) / max(1, len(a[i:i + hop]))) for i in range(0, n, hop)]
m = sorted(env)[int(len(env) * 0.97)] or 1
open(out, 'w').write('window.HFX_ENV=' + str([min(1, round(x / m, 3)) for x in env]) + ';')
print(len(env), 'values')
