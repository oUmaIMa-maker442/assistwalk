# step4_filtering.py — version 84 classes AssistWalk
# Seuils minimaux par classe pour éviter les faux positifs

HIGH_PRIORITY = {
    # COCO originals
    'person', 'car', 'truck', 'bus', 'motorcycle',
    'bicycle', 'traffic light', 'stop sign',
    # Nouvelles classes critiques
    'stairs', 'metal_barrier',
    # Autres dangers urbains
    'pole', 'hole', 'construction', 'open_manhole',
}

MEDIUM_PRIORITY = {
    # COCO
    'chair', 'bench', 'fire hydrant', 'parking meter',
    'trash can', 'suitcase', 'backpack', 'book',
    'keyboard', 'laptop', 'couch', 'bed',
    'dining table', 'tv', 'monitor', 'sink',
    # Nouvelles classes utiles
    'door', 'tree',
    # Autres
    'ramp', 'grate', 'curb', 'mailbox', 'fence',
    'wall', 'column', 'planter', 'sign',
}

LOW_PRIORITY = {
    'dog', 'cat', 'bird', 'horse',
    'potted plant', 'handbag',
}

ALL_RELEVANT = HIGH_PRIORITY | MEDIUM_PRIORITY | LOW_PRIORITY

# Seuils minimaux de confiance par classe (production)
MIN_CONF = {
    'door':          0.04,
    'tree':          0.15,
    'stairs':        0.08,
    'metal_barrier': 0.08,
    'person':        0.10,
    'car':           0.10,
    'bicycle':       0.10,
    'motorcycle':    0.10,
    'bus':           0.10,
    'truck':         0.10,
    'traffic light': 0.10,
    'stop sign':     0.10,
    'default':       0.05,
}

def meets_threshold(obj):
    """Vérifie si l'objet dépasse le seuil minimal défini pour sa classe."""
    min_c = MIN_CONF.get(obj['class'], MIN_CONF['default'])
    return obj['confidence'] >= min_c

def filter_objects(objects: list) -> list:
    def get_priority(obj):
        c = obj['class']
        if c in HIGH_PRIORITY:    return 0
        elif c in MEDIUM_PRIORITY: return 1
        elif c in LOW_PRIORITY:    return 2
        else:                      return 99

    # Filtrer par pertinence + seuil de confiance
    filtered = [o for o in objects
                if o['class'] in ALL_RELEVANT and meets_threshold(o)]
    rejected = [o for o in objects
                if o['class'] not in ALL_RELEVANT or not meets_threshold(o)]

    for obj in rejected:
        print(f"  ✗ REJETÉ: {obj['class']} ({obj['confidence']:.2f})")

    filtered.sort(key=lambda o: (get_priority(o), -o['confidence']))
    print(f'[Step 4] {len(objects)} détectés → {len(filtered)} pertinents')
    return filtered