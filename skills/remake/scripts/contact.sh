#!/bin/bash
# usage: contact.sh <video> <outdir>  -> 1 fps sheets (sNN.png) and 4 fps timestamped sheets (qNN.png)
v="$1"; o="$2"; mkdir -p "$o"
ffmpeg -v error -y -i "$v" -vf "fps=1,scale=384:-1,drawtext=text='%{pts\:hms}':x=4:y=4:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=5x4:padding=4" "$o/s%02d.png"
ffmpeg -v error -y -i "$v" -vf "fps=4,scale=320:-1,drawtext=text='%{pts\:hms}':x=4:y=4:fontsize=14:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=6x6" "$o/q%02d.png"
ls "$o"
