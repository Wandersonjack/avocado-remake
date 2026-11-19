#!/bin/bash
# usage: grid.sh <video> <out.png> t1 t2 t3 t4  -> 2x2 grid of full frames, labelled with their time
v="$1"; out="$2"; shift 2; args=(); fc=""; i=0
for t in "$@"; do args+=(-ss "$t" -i "$v"); fc+="[${i}:v]trim=end_frame=1,scale=960:540,drawtext=text='${t}':x=6:y=6:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6[v${i}];"; i=$((i+1)); done
ffmpeg -v error -y "${args[@]}" -filter_complex "${fc}[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|960_0|0_540|960_540" -frames:v 1 "$out"
