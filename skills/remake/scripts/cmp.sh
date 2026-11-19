#!/bin/bash
# usage: cmp.sh <snapdir from `snapshot --against`> <out.png>  -> rows of [original | rebuild]
d="$1"; out="$2"; args=(); fc=""; n=0
for f in "$d"/frame-*.png; do
  r="${f/frame-/ref-}"; args+=(-i "$r" -i "$f"); a=$((n*2)); b=$((n*2+1))
  fc+="[${a}]scale=640:360[r${n}];[${b}]scale=640:360[m${n}];[r${n}][m${n}]hstack[p${n}];"; n=$((n+1))
done
st=""; for ((i=0;i<n;i++)); do st+="[p${i}]"; done
if [ $n -gt 1 ]; then fc+="${st}vstack=inputs=${n}[o]"; else fc+="[p0]null[o]"; fi
ffmpeg -v error -y "${args[@]}" -filter_complex "$fc" -map "[o]" "$out"
