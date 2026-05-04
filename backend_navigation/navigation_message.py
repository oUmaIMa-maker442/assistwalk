
def estimate_distance(bbox, frame_width, frame_height):
    x1, y1, x2, y2 = bbox

    box_width = x2 - x1
    box_height = y2 - y1

    ratio = max(
        box_width / frame_width,
        box_height / frame_height
    )

    if ratio > 0.5:
        return "very close", "danger"
    elif ratio > 0.25:
        return "nearby", "warning"
    elif ratio > 0.10:
        return "at medium distance", "info"
    else:
        return "far away", "info"


def generate_navigation_message(objects, frame_shape):
    if not objects:
        return "No obstacle detected"

    h, w = frame_shape[:2]

    # 🔹 On prend le premier objet (comme ton code actuel)
    obj = objects[0]

    name = obj.get("class") or obj.get("name", "object")
    bbox = obj["bbox"]

    x1, y1, x2, y2 = bbox
    center_x = (x1 + x2) / 2

    # 🔹 Position (gauche / droite / devant)
    if center_x < w / 3:
        position = "on the left"
    elif center_x > 2 * w / 3:
        position = "on the right"
    else:
        position = "ahead"

    # 🔹 Distance (NOUVEAU)
    distance, level = estimate_distance(bbox, w, h)

    # 🔥 Message amélioré
    if level == "danger":
        return f"Warning, {name} very close {position}"
    elif level == "warning":
        return f"Attention, {name} nearby {position}"
    else:
        return f"{name} {distance} {position}"