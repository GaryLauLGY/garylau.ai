"""Build the mouse-scrubbable hero video with the reference pixel bot on the CRT.

This is an authoring tool only; the shipped website has no Python/OpenCV dependency.
"""

from __future__ import annotations

from pathlib import Path
import subprocess

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
SOURCE_ASSETS = ROOT / "tools" / "source-assets"
SOURCE_VIDEO = SOURCE_ASSETS / "mainframe-motion-source.mp4"
SOURCE_SPRITE = SOURCE_ASSETS / "orange-pixel-robot-reference.png"
SPRITE_OUTPUT = ASSETS / "orange-pixel-robot.png"
VIDEO_OUTPUT = ASSETS / "mainframe-robot-motion.mp4"


def extract_sprite() -> np.ndarray:
    source = cv2.imread(str(SOURCE_SPRITE), cv2.IMREAD_COLOR)
    if source is None:
        raise RuntimeError(f"Could not read {SOURCE_SPRITE}")

    blue, green, red = cv2.split(source)
    mask = (
        (red > 175)
        & (red.astype(np.int16) - green.astype(np.int16) > 42)
        & (red.astype(np.int16) - blue.astype(np.int16) > 38)
    ).astype(np.uint8) * 255

    points = cv2.findNonZero(mask)
    if points is None:
        raise RuntimeError("No orange sprite pixels detected")
    x, y, width, height = cv2.boundingRect(points)
    padding = 2
    x0, y0 = max(0, x - padding), max(0, y - padding)
    x1 = min(source.shape[1], x + width + padding)
    y1 = min(source.shape[0], y + height + padding)

    cropped = source[y0:y1, x0:x1]
    cropped_mask = mask[y0:y1, x0:x1]
    rgba = cv2.cvtColor(cropped, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = cropped_mask
    rgba[cropped_mask == 0, :3] = 0
    cv2.imwrite(str(SPRITE_OUTPUT), rgba)
    return rgba


def pink_mask(frame: np.ndarray) -> np.ndarray:
    blue, green, red = cv2.split(frame)
    return (
        (red > 185)
        & (blue > 185)
        & (red.astype(np.int16) - green.astype(np.int16) > 5)
        & (blue.astype(np.int16) - green.astype(np.int16) > 2)
    ).astype(np.uint8) * 255


def find_eye_pair(frame: np.ndarray) -> list[tuple[float, float]] | None:
    height, width = frame.shape[:2]
    x0, x1 = int(width * 0.50), int(width * 0.86)
    y0, y1 = int(height * 0.08), int(height * 0.53)
    mask = pink_mask(frame[y0:y1, x0:x1])
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    count, _, stats, centroids = cv2.connectedComponentsWithStats(mask)
    candidates: list[tuple[int, float, float, int, int]] = []
    for index in range(1, count):
        _, _, component_width, component_height, area = stats[index]
        ratio = component_width / max(component_height, 1)
        if 250 < area < 30000 and 0.25 < ratio < 2.4:
            center_x, center_y = centroids[index]
            candidates.append((int(area), center_x + x0, center_y + y0, component_width, component_height))

    candidates.sort(reverse=True)
    best_pair = None
    best_score = float("inf")
    for left_index, first in enumerate(candidates[:8]):
        for second in candidates[left_index + 1:8]:
            pair = sorted([first, second], key=lambda item: item[1])
            delta_x = pair[1][1] - pair[0][1]
            delta_y = abs(pair[1][2] - pair[0][2])
            if 110 < delta_x < 360 and delta_y < 95:
                area_balance = abs(pair[0][0] - pair[1][0]) / max(pair[0][0], pair[1][0])
                score = delta_y * 2 + area_balance * 55 - (pair[0][0] + pair[1][0]) / 4000
                if score < best_score:
                    best_score = score
                    best_pair = [(pair[0][1], pair[0][2]), (pair[1][1], pair[1][2])]
    return best_pair


def order_quad(points: np.ndarray) -> np.ndarray:
    points = points.astype(np.float32)
    ordered = np.zeros((4, 2), dtype=np.float32)
    sums = points.sum(axis=1)
    differences = np.diff(points, axis=1).reshape(-1)
    ordered[0] = points[np.argmin(sums)]
    ordered[2] = points[np.argmax(sums)]
    ordered[1] = points[np.argmin(differences)]
    ordered[3] = points[np.argmax(differences)]
    return ordered


def find_screen_quad(frame: np.ndarray, eyes: list[tuple[float, float]]) -> np.ndarray | None:
    height, width = frame.shape[:2]
    center_x = int((eyes[0][0] + eyes[1][0]) / 2)
    center_y = int((eyes[0][1] + eyes[1][1]) / 2)
    distance = max(1, int(eyes[1][0] - eyes[0][0]))
    x0 = max(0, center_x - int(distance * 1.62))
    x1 = min(width, center_x + int(distance * 1.62))
    y0 = max(0, center_y - int(distance * 1.32))
    y1 = min(height, center_y + int(distance * 1.32))

    roi = frame[y0:y1, x0:x1]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    dark = (gray < 145).astype(np.uint8) * 255
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((19, 19), np.uint8))
    contours, _ = cv2.findContours(dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = [contour for contour in contours if cv2.contourArea(contour) > distance * distance * 0.45]
    if not contours:
        return None

    contour = max(contours, key=cv2.contourArea)
    hull = cv2.convexHull(contour)
    approx = cv2.approxPolyDP(hull, 0.045 * cv2.arcLength(hull, True), True).reshape(-1, 2)
    if len(approx) != 4:
        approx = cv2.boxPoints(cv2.minAreaRect(hull))
    approx = approx.astype(np.float32)
    approx[:, 0] += x0
    approx[:, 1] += y0
    return order_quad(approx)


def smooth_quads(quads: list[np.ndarray | None]) -> list[np.ndarray]:
    valid_indices = [index for index, quad in enumerate(quads) if quad is not None]
    if not valid_indices:
        raise RuntimeError("Could not detect the CRT screen in any frame")

    values = np.zeros((len(quads), 4, 2), dtype=np.float32)
    for corner in range(4):
        for axis in range(2):
            known = np.array([quads[index][corner, axis] for index in valid_indices], dtype=np.float32)
            values[:, corner, axis] = np.interp(np.arange(len(quads)), valid_indices, known)

    kernel = np.array([1, 2, 3, 2, 1], dtype=np.float32)
    kernel /= kernel.sum()
    for corner in range(4):
        for axis in range(2):
            padded = np.pad(values[:, corner, axis], (2, 2), mode="edge")
            values[:, corner, axis] = np.convolve(padded, kernel, mode="valid")
    return [values[index] for index in range(len(quads))]


def tracking_mask(shape: tuple[int, int], quad: np.ndarray) -> np.ndarray:
    mask = np.zeros(shape, dtype=np.uint8)
    outer = np.array([
        point_on_quad(quad, -0.14, -0.14),
        point_on_quad(quad, 1.14, -0.14),
        point_on_quad(quad, 1.14, 1.14),
        point_on_quad(quad, -0.14, 1.14),
    ], dtype=np.int32)
    inner = np.array([
        point_on_quad(quad, 0.055, 0.055),
        point_on_quad(quad, 0.945, 0.055),
        point_on_quad(quad, 0.945, 0.945),
        point_on_quad(quad, 0.055, 0.945),
    ], dtype=np.int32)
    cv2.fillConvexPoly(mask, outer, 255)
    cv2.fillConvexPoly(mask, inner, 0)
    return mask


def track_screen_quads(
    video_path: Path,
    raw_quads: list[np.ndarray | None],
) -> list[np.ndarray]:
    """Track the CRT as one physical plane instead of redetecting each frame.

    Consecutive optical-flow homographies preserve the monitor's perspective and
    eliminate the corner changes that made the sprite appear to pop between frames.
    """
    fallback = smooth_quads(raw_quads)
    capture = cv2.VideoCapture(str(video_path))
    ok, previous_frame = capture.read()
    if not ok:
        raise RuntimeError(f"Could not read {video_path}")

    previous_gray = cv2.cvtColor(previous_frame, cv2.COLOR_BGR2GRAY)
    current_quad = fallback[0].copy()
    tracked = [current_quad.copy()]

    for frame_index in range(1, len(raw_quads)):
        ok, frame = capture.read()
        if not ok:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        feature_mask = tracking_mask(previous_gray.shape, current_quad)
        previous_points = cv2.goodFeaturesToTrack(
            previous_gray,
            mask=feature_mask,
            maxCorners=320,
            qualityLevel=0.008,
            minDistance=10,
            blockSize=7,
        )

        candidate = None
        if previous_points is not None and len(previous_points) >= 12:
            next_points, status, errors = cv2.calcOpticalFlowPyrLK(
                previous_gray,
                gray,
                previous_points,
                None,
                winSize=(35, 35),
                maxLevel=4,
                criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 35, 0.01),
            )
            if next_points is not None and status is not None and errors is not None:
                valid = (status.reshape(-1) == 1) & (errors.reshape(-1) < 32)
                source_points = previous_points.reshape(-1, 2)[valid]
                destination_points = next_points.reshape(-1, 2)[valid]
                if len(source_points) >= 10:
                    homography, _ = cv2.findHomography(
                        source_points,
                        destination_points,
                        cv2.RANSAC,
                        4.0,
                    )
                    if homography is not None:
                        candidate = cv2.perspectiveTransform(
                            current_quad.reshape(1, -1, 2),
                            homography,
                        ).reshape(-1, 2)

        if candidate is None:
            candidate = fallback[frame_index].copy()
        else:
            previous_area = abs(cv2.contourArea(current_quad))
            candidate_area = abs(cv2.contourArea(candidate))
            center_shift = np.linalg.norm(candidate.mean(axis=0) - current_quad.mean(axis=0))
            area_ratio = candidate_area / max(previous_area, 1)
            if not (0.76 < area_ratio < 1.24 and center_shift < 95):
                candidate = fallback[frame_index].copy()

        # The raw detector is used only as a very weak center anchor to prevent
        # long-term optical-flow drift; its corners never drive the perspective.
        anchor = fallback[frame_index]
        center_delta = anchor.mean(axis=0) - candidate.mean(axis=0)
        anchor_area = abs(cv2.contourArea(anchor))
        candidate_area = abs(cv2.contourArea(candidate))
        anchor_area_ratio = candidate_area / max(anchor_area, 1)
        mean_corner_error = np.linalg.norm(anchor - candidate, axis=1).mean()
        if (
            np.linalg.norm(center_delta) > 72
            or not 0.84 < anchor_area_ratio < 1.16
            or mean_corner_error > 105
        ):
            candidate = anchor.copy()
        else:
            candidate += center_delta * 0.18
            candidate = candidate * 0.96 + anchor * 0.04

        current_quad = candidate.astype(np.float32)
        tracked.append(current_quad.copy())
        previous_gray = gray

    capture.release()
    if len(tracked) < len(raw_quads):
        tracked.extend(fallback[len(tracked):])
    return tracked


def point_on_quad(quad: np.ndarray, u: float, v: float) -> np.ndarray:
    canonical = np.array([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
    ], dtype=np.float32)
    homography = cv2.getPerspectiveTransform(canonical, quad.astype(np.float32))
    point = np.array([[[u, v]]], dtype=np.float32)
    return cv2.perspectiveTransform(point, homography)[0, 0]


def remove_original_eyes(frame: np.ndarray, screen_quad: np.ndarray) -> np.ndarray:
    frame_height, frame_width = frame.shape[:2]
    x, y, width, height = cv2.boundingRect(screen_quad.astype(np.int32))
    margin = 18
    x0, y0 = max(0, x - margin), max(0, y - margin)
    x1, y1 = min(frame_width, x + width + margin), min(frame_height, y + height + margin)
    roi = frame[y0:y1, x0:x1].copy()
    mask = pink_mask(roi)

    local_quad = screen_quad.copy()
    local_quad[:, 0] -= x0
    local_quad[:, 1] -= y0
    screen_mask = np.zeros(mask.shape, dtype=np.uint8)
    cv2.fillConvexPoly(screen_mask, local_quad.astype(np.int32), 255)
    mask = cv2.bitwise_and(mask, screen_mask)

    # Mask the complete luminous eye areas, including neutral-white bloom that the
    # pink color threshold intentionally misses. Their positions are stable on the
    # CRT surface even while the monitor turns in perspective.
    screen_width = (
        np.linalg.norm(screen_quad[1] - screen_quad[0])
        + np.linalg.norm(screen_quad[2] - screen_quad[3])
    ) / 2
    screen_height = (
        np.linalg.norm(screen_quad[3] - screen_quad[0])
        + np.linalg.norm(screen_quad[2] - screen_quad[1])
    ) / 2
    for u in (0.33, 0.68):
        center = point_on_quad(screen_quad, u, 0.50) - np.array([x0, y0])
        cv2.ellipse(
            mask,
            tuple(np.round(center).astype(int)),
            (max(10, int(screen_width * 0.105)), max(14, int(screen_height * 0.19))),
            0,
            0,
            360,
            255,
            -1,
        )
    mask = cv2.dilate(mask, np.ones((19, 19), np.uint8), iterations=1)
    cleaned = cv2.inpaint(roi, mask, 17, cv2.INPAINT_TELEA)
    result = frame.copy()
    result[y0:y1, x0:x1] = cleaned
    return result


def overlay_sprite(frame: np.ndarray, sprite: np.ndarray, screen_quad: np.ndarray) -> np.ndarray:
    # Stay inside the real glass. The bilinear placement inherits the CRT's perspective.
    screen_width = (
        np.linalg.norm(screen_quad[1] - screen_quad[0])
        + np.linalg.norm(screen_quad[2] - screen_quad[3])
    ) / 2
    screen_height = (
        np.linalg.norm(screen_quad[3] - screen_quad[0])
        + np.linalg.norm(screen_quad[2] - screen_quad[1])
    ) / 2
    source_ratio = sprite.shape[1] / sprite.shape[0]
    horizontal_span = 0.62
    vertical_span = float(np.clip(horizontal_span * screen_width / source_ratio / screen_height, 0.38, 0.49))
    top_v, bottom_v = 0.5 - vertical_span / 2, 0.5 + vertical_span / 2
    left_u, right_u = 0.5 - horizontal_span / 2, 0.5 + horizontal_span / 2
    destination = np.array([
        point_on_quad(screen_quad, left_u, top_v),
        point_on_quad(screen_quad, right_u, top_v),
        point_on_quad(screen_quad, right_u, bottom_v),
        point_on_quad(screen_quad, left_u, bottom_v),
    ], dtype=np.float32)

    x, y, width, height = cv2.boundingRect(destination.astype(np.int32))
    margin = 34
    x0, y0 = max(0, x - margin), max(0, y - margin)
    x1, y1 = min(frame.shape[1], x + width + margin), min(frame.shape[0], y + height + margin)
    local_destination = destination.copy()
    local_destination[:, 0] -= x0
    local_destination[:, 1] -= y0

    source_height, source_width = sprite.shape[:2]
    source = np.array([
        [0, 0],
        [source_width - 1, 0],
        [source_width - 1, source_height - 1],
        [0, source_height - 1],
    ], dtype=np.float32)
    transform = cv2.getPerspectiveTransform(source, local_destination)
    patch_size = (x1 - x0, y1 - y0)
    warped_color = cv2.warpPerspective(sprite[:, :, :3], transform, patch_size, flags=cv2.INTER_NEAREST)
    warped_alpha = cv2.warpPerspective(sprite[:, :, 3], transform, patch_size, flags=cv2.INTER_NEAREST)

    # Guaranteed containment: both the sprite and its bloom are clipped to an
    # inset quadrilateral inside the actual CRT glass on every frame.
    glass_clip_quad = np.array([
        point_on_quad(screen_quad, 0.09, 0.09),
        point_on_quad(screen_quad, 0.91, 0.09),
        point_on_quad(screen_quad, 0.91, 0.91),
        point_on_quad(screen_quad, 0.09, 0.91),
    ], dtype=np.float32)
    glass_clip_quad[:, 0] -= x0
    glass_clip_quad[:, 1] -= y0
    glass_clip = np.zeros((patch_size[1], patch_size[0]), dtype=np.uint8)
    cv2.fillConvexPoly(glass_clip, glass_clip_quad.astype(np.int32), 255)
    warped_alpha = cv2.bitwise_and(warped_alpha, glass_clip)

    roi = frame[y0:y1, x0:x1].astype(np.float32)
    alpha = warped_alpha.astype(np.float32) / 255.0
    glow = cv2.GaussianBlur(alpha, (0, 0), sigmaX=16, sigmaY=16)
    glow *= glass_clip.astype(np.float32) / 255.0
    glow_color = np.zeros_like(roi)
    glow_color[:, :, 0] = 20
    glow_color[:, :, 1] = 58
    glow_color[:, :, 2] = 255
    roi = np.clip(roi + glow_color * glow[:, :, None] * 0.42, 0, 255)
    roi = roi * (1 - alpha[:, :, None]) + warped_color.astype(np.float32) * alpha[:, :, None]
    frame[y0:y1, x0:x1] = roi.astype(np.uint8)
    return frame


def create_label_patch() -> np.ndarray:
    width, height = 480, 130
    patch = np.zeros((height, width, 4), dtype=np.uint8)
    cv2.rectangle(patch, (2, 2), (width - 3, height - 3), (75, 83, 84, 246), -1)
    cv2.rectangle(patch, (2, 2), (width - 3, height - 3), (108, 112, 110, 235), 3)
    text = "GaryLau"
    font = cv2.FONT_HERSHEY_DUPLEX
    scale, thickness = 1.65, 3
    (text_width, text_height), baseline = cv2.getTextSize(text, font, scale, thickness)
    origin = ((width - text_width) // 2, (height + text_height - baseline) // 2)
    cv2.putText(patch, text, origin, font, scale, (180, 184, 181, 255), thickness, cv2.LINE_AA)
    return patch


def overlay_label(frame: np.ndarray, patch: np.ndarray, screen_quad: np.ndarray) -> np.ndarray:
    destination = np.array([
        point_on_quad(screen_quad, 0.33, 0.895),
        point_on_quad(screen_quad, 0.67, 0.895),
        point_on_quad(screen_quad, 0.67, 1.065),
        point_on_quad(screen_quad, 0.33, 1.065),
    ], dtype=np.float32)
    x, y, width, height = cv2.boundingRect(destination.astype(np.int32))
    margin = 5
    x0, y0 = max(0, x - margin), max(0, y - margin)
    x1, y1 = min(frame.shape[1], x + width + margin), min(frame.shape[0], y + height + margin)
    local_destination = destination.copy()
    local_destination[:, 0] -= x0
    local_destination[:, 1] -= y0

    patch_height, patch_width = patch.shape[:2]
    source = np.array([
        [0, 0],
        [patch_width - 1, 0],
        [patch_width - 1, patch_height - 1],
        [0, patch_height - 1],
    ], dtype=np.float32)
    transform = cv2.getPerspectiveTransform(source, local_destination)
    patch_size = (x1 - x0, y1 - y0)
    color = cv2.warpPerspective(patch[:, :, :3], transform, patch_size, flags=cv2.INTER_LINEAR)
    alpha = cv2.warpPerspective(patch[:, :, 3], transform, patch_size, flags=cv2.INTER_LINEAR)
    alpha_float = alpha.astype(np.float32)[:, :, None] / 255.0
    roi = frame[y0:y1, x0:x1].astype(np.float32)
    frame[y0:y1, x0:x1] = (roi * (1 - alpha_float) + color * alpha_float).astype(np.uint8)
    return frame


def grade_vintage_black_suit(frame: np.ndarray) -> np.ndarray:
    frame_height, frame_width = frame.shape[:2]
    # Segment the jacket from the actual fabric in each frame.  It is deliberately
    # independent of the CRT quad: tying this mask to the turning head made a dark
    # projected polygon slide across the lapels.  The jacket is the large, neutral,
    # mid/dark component that connects to the lower edge of the portrait.
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2].astype(np.float32)

    portrait_roi = np.zeros((frame_height, frame_width), dtype=np.uint8)
    portrait_roi[int(frame_height * 0.47):, int(frame_width * 0.36):] = 255
    fabric_candidate = (
        (value < 160)
        & (saturation < 72)
        & (portrait_roi > 0)
    ).astype(np.uint8) * 255
    fabric_candidate = cv2.morphologyEx(
        fabric_candidate,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)),
    )
    fabric_candidate = cv2.morphologyEx(
        fabric_candidate,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)),
    )

    component_count, labels, stats, centroids = cv2.connectedComponentsWithStats(
        fabric_candidate,
        connectivity=8,
    )
    jacket = np.zeros((frame_height, frame_width), dtype=np.uint8)
    minimum_area = frame_height * frame_width * 0.003
    for component in range(1, component_count):
        x, y, width, height, area = stats[component]
        center_x = centroids[component][0]
        reaches_bottom = y + height >= frame_height * 0.93
        is_portrait_fabric = center_x >= frame_width * 0.48 and width >= frame_width * 0.035
        if area >= minimum_area and reaches_bottom and is_portrait_fabric:
            jacket[labels == component] = 255

    # Close small highlight gaps while keeping the real lapel, shoulder and outer
    # silhouette.  The soft edge prevents a cut-out or moving-shadow appearance.
    jacket = cv2.morphologyEx(
        jacket,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)),
    )
    alpha = cv2.GaussianBlur(jacket.astype(np.float32) / 255.0, (0, 0), 7) * 0.92

    target_value = value * 0.44 + 7
    target = np.empty_like(frame, dtype=np.float32)
    target[:, :, 0] = target_value * 0.90
    target[:, :, 1] = target_value * 0.95
    target[:, :, 2] = target_value
    original = frame.astype(np.float32)
    return np.clip(original * (1 - alpha[:, :, None]) + target * alpha[:, :, None], 0, 255).astype(np.uint8)


def output_frame(frame: np.ndarray) -> np.ndarray:
    target_width = 1920
    scaled_height = round(frame.shape[0] * target_width / frame.shape[1])
    scaled = cv2.resize(frame, (target_width, scaled_height), interpolation=cv2.INTER_AREA)
    if scaled_height >= 1080:
        top = (scaled_height - 1080) // 2
        return scaled[top:top + 1080]
    canvas = np.full((1080, target_width, 3), 210, dtype=np.uint8)
    top = (1080 - scaled_height) // 2
    canvas[top:top + scaled_height] = scaled
    return canvas


def main() -> None:
    sprite = extract_sprite()
    label_patch = create_label_patch()
    capture = cv2.VideoCapture(str(SOURCE_VIDEO))
    fps = capture.get(cv2.CAP_PROP_FPS) or 24
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

    detected_quads: list[np.ndarray | None] = []
    for _ in range(frame_count):
        ok, frame = capture.read()
        if not ok:
            break
        eyes = find_eye_pair(frame)
        detected_quads.append(find_screen_quad(frame, eyes) if eyes else None)
    capture.release()
    quads = track_screen_quads(SOURCE_VIDEO, detected_quads)

    ffmpeg = subprocess.Popen([
        "ffmpeg", "-y", "-v", "error",
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", "1920x1080", "-r", f"{fps:g}", "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p",
        "-g", "1", "-keyint_min", "1", "-sc_threshold", "0",
        "-movflags", "+faststart", str(VIDEO_OUTPUT),
    ], stdin=subprocess.PIPE)

    capture = cv2.VideoCapture(str(SOURCE_VIDEO))
    processed = 0
    while processed < len(quads):
        ok, frame = capture.read()
        if not ok:
            break
        frame = remove_original_eyes(frame, quads[processed])
        frame = overlay_sprite(frame, sprite, quads[processed])
        frame = overlay_label(frame, label_patch, quads[processed])
        frame = grade_vintage_black_suit(frame)
        frame = output_frame(frame)
        assert ffmpeg.stdin is not None
        ffmpeg.stdin.write(frame.tobytes())
        processed += 1
    capture.release()
    assert ffmpeg.stdin is not None
    ffmpeg.stdin.close()
    return_code = ffmpeg.wait()
    if return_code != 0:
        raise RuntimeError(f"ffmpeg exited with status {return_code}")
    print(f"Wrote {VIDEO_OUTPUT} ({processed} frames at {fps:g} fps)")
    print(f"Wrote {SPRITE_OUTPUT} ({sprite.shape[1]}x{sprite.shape[0]}, original aspect preserved)")


if __name__ == "__main__":
    main()
