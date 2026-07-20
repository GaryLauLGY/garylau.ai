from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
video_path = ROOT / "tools/source-assets/mainframe-motion-source.mp4"
cap = cv2.VideoCapture(str(video_path))
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

for frame_index in [0, 12, 24, 36, 48, 60, 72, 84, 96]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ok, frame = cap.read()
    if not ok:
        continue
    height, width = frame.shape[:2]
    x0, x1 = int(width * 0.50), int(width * 0.86)
    y0, y1 = int(height * 0.08), int(height * 0.53)
    roi = frame[y0:y1, x0:x1]
    blue, green, red = cv2.split(roi)
    mask = (
        (red > 185)
        & (blue > 185)
        & (red.astype(np.int16) - green.astype(np.int16) > 5)
        & (blue.astype(np.int16) - green.astype(np.int16) > 2)
    ).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    count, _, stats, centroids = cv2.connectedComponentsWithStats(mask)
    components = []
    for idx in range(1, count):
        x, y, w, h, area = stats[idx]
        if 300 < area < 30000 and 0.35 < w / max(h, 1) < 2.2:
            components.append((area, x + x0, y + y0, w, h, tuple(np.round(centroids[idx] + [x0, y0], 1))))
    components.sort(reverse=True)
    eyes = sorted(components[:2], key=lambda item: item[5][0])
    quad = None
    if len(eyes) == 2:
        centers = [eye[5] for eye in eyes]
        center_x = int((centers[0][0] + centers[1][0]) / 2)
        center_y = int((centers[0][1] + centers[1][1]) / 2)
        distance = int(centers[1][0] - centers[0][0])
        sx0, sx1 = max(0, center_x - int(distance * 1.55)), min(width, center_x + int(distance * 1.55))
        sy0, sy1 = max(0, center_y - int(distance * 1.25)), min(height, center_y + int(distance * 1.25))
        screen_roi = frame[sy0:sy1, sx0:sx1]
        gray = cv2.cvtColor(screen_roi, cv2.COLOR_BGR2GRAY)
        dark = (gray < 145).astype(np.uint8) * 255
        dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((19, 19), np.uint8))
        contours, _ = cv2.findContours(dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = [contour for contour in contours if cv2.contourArea(contour) > distance * distance * 0.5]
        if contours:
            contour = max(contours, key=cv2.contourArea)
            hull = cv2.convexHull(contour)
            epsilon = 0.045 * cv2.arcLength(hull, True)
            approx = cv2.approxPolyDP(hull, epsilon, True).reshape(-1, 2)
            quad = [(int(x + sx0), int(y + sy0)) for x, y in approx]
    print(frame_index, "eyes", eyes, "quad", quad)

cap.release()
