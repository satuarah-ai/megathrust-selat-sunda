"""Rakit bingkai JPG menjadi MP4 (OpenCV), 24 fps, kualitas tinggi."""
import cv2, glob, os, sys
site = sys.argv[1] if len(sys.argv) > 1 else "labuan"
out  = sys.argv[2] if len(sys.argv) > 2 else f"megathrust_{site}.mp4"
frames = sorted(glob.glob(f"frames_{site}/*.jpg"))
if not frames:
    sys.exit("tidak ada bingkai")
h, w = cv2.imread(frames[0]).shape[:2]
# coba beberapa codec; mp4v selalu ada di build OpenCV standar
for fourcc in ("avc1", "H264", "mp4v"):
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*fourcc), 24, (w, h))
    if vw.isOpened():
        break
if not vw.isOpened():
    sys.exit("VideoWriter gagal dibuka")
for f in frames:
    vw.write(cv2.imread(f))
vw.release()
mb = os.path.getsize(out) / 1048576
print(f"{out}: {len(frames)} bingkai, {w}x{h}, {len(frames)/24:.1f} s, {mb:.1f} MB, codec {fourcc}")
