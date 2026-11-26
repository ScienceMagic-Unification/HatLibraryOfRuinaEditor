"""Rebuild portable combat-page art and ability text from a game install and Combat Pages PNGs."""
import argparse
import hashlib
import io
import json
import mmap
import re
from collections import defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image
import UnityPy

ASSETS = Path(__file__).resolve().parents[1] / "apps/desktop/src/renderer/src/assets"


def write_index(name, data):
    (ASSETS / name).write_text(json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")


def import_text(game):
    descriptions = defaultdict(dict)
    card_text = defaultdict(dict)
    cards_by_id = {}
    usage_text = defaultdict(set)
    classified = {"card": set(), "dice": set()}
    cards = json.loads((ASSETS / "vanilla-abilities.json").read_text(encoding="utf-8"))
    for entry in cards["entries"]:
        if entry["kind"] == "card" and entry.get("xml"):
            card = ET.fromstring(entry["xml"])
            cards_by_id[entry["id"]] = card
            classified["card"].add((card.findtext("Script") or "").strip())
            classified["dice"].update(die.get("Script", "").strip() for die in card.iter("Behaviour"))
    # Unity TextAssets serialize a padded name followed by the length and UTF-8 payload.
    with (game / "resources.assets").open("rb") as resource, mmap.mmap(resource.fileno(), 0, access=mmap.ACCESS_READ) as data:
        pattern = rb"((CN|EN|JP|KR|TRCN)_BattleCard\w+)\x00{0,3}(.{4})((?:\xef\xbb\xbf)?<\?xml[^>]*>\s*<BattleCard(?:Ability)?DescRoot\b)"
        for match in re.finditer(pattern, data, re.DOTALL):
            if int.from_bytes(data[match.start()-4:match.start()], "little") != len(match[1]):
                continue
            start = match.start(4)
            xml = ET.fromstring(data[start:start + int.from_bytes(match[3], "little")])
            locale = match[2].decode().lower()
            for node in xml.iter("BattleCardDesc"):
                card_id = node.get("ID")
                localized = {"name": node.findtext("LocalizedName") or ""}
                positions = {b.get("ID"): b.text for b in node.findall("Behaviour") if b.text and b.get("ID") is not None}
                ability = "\n".join(d.text for d in node.findall("Ability") if d.text)
                if ability:
                    localized["ability"] = ability
                if positions:
                    localized["dice"] = positions
                card_text[card_id][locale] = localized
                source = cards_by_id.get(card_id)
                if source is None:
                    continue
                pairs = [(source.findtext("Script"), ability)]
                pairs.extend((die.get("Script"), positions.get(str(i))) for i, die in enumerate(source.iter("Behaviour")))
                for script, desc in pairs:
                    if script and script.strip() and desc:
                        usage_text[script.strip(), locale].add(desc)
            for ability in xml.findall("BattleCardAbility"):
                key = ability.get("ID", "").strip()
                desc = "\n".join("".join(d.itertext()) for d in ability.findall("Desc"))
                if key and desc:
                    descriptions[key][locale] = desc
                if b"BattleCardSelf" in match[1]:
                    classified["card"].add(key)
                elif b"BattleCardDice" in match[1]:
                    classified["dice"].add(key)
    if not descriptions or set().union(*(row.keys() for row in descriptions.values())) != {"cn", "en", "jp", "kr", "trcn"}:
        raise ValueError("Incomplete game localization")
    for (script, locale), candidates in usage_text.items():
        if len(candidates) == 1:
            descriptions[script].setdefault(locale, next(iter(candidates)))
    write_index("vanilla-card-text.json", card_text)
    write_index("vanilla-scripts.json", {"descriptions": descriptions, "ids": {k: sorted(v - {""}) for k, v in classified.items()}})
    print(f"{len(descriptions)} localized ability IDs")


def signature(image):
    return np.asarray(image.convert("RGB").resize((24, 24), Image.Resampling.BOX), dtype=np.int16)


def import_art(game, folder):
    paths = sorted(folder.rglob("*.png"))
    if not paths:
        raise ValueError(f"No PNGs in {folder}")
    samples = []
    for path in paths:
        with Image.open(path) as image:
            samples.append(signature(image))
    samples = np.stack(samples)
    target = ASSETS / "vanilla-artwork"
    target.mkdir(exist_ok=True)
    entries = {}
    used = set()

    def record(image, key=None, path=None):
        buf = io.BytesIO()
        image.convert("RGBA").save(buf, format="WEBP", quality=88, method=4)
        content = buf.getvalue()
        filename = hashlib.sha256(content).hexdigest()[:20] + ".webp"
        if filename not in entries:
            (target / filename).write_bytes(content)
            entries[filename] = {"file": filename, "keys": [], "names": []}
        item = entries[filename]
        if key and key not in item["keys"]:
            item["keys"].append(key)
        if path and path.stem not in item["names"]:
            item["names"].append(path.stem)

    bundle = UnityPy.load(str(game / "StreamingAssets/AssetBundles/card_art.pres"))
    for obj in bundle.objects:
        if obj.type.name != "Texture2D":
            continue
        texture = obj.read()
        game_image = texture.image
        errors = np.abs(samples - signature(game_image)).mean(axis=(1, 2, 3))
        closest = int(errors.argmin())
        if errors[closest] < 2:
            path = paths[closest]
            used.add(path)
            with Image.open(path) as image:
                record(image, texture.m_Name, path)
        else:
            record(game_image, texture.m_Name)
    for path in paths:
        if path not in used:
            with Image.open(path) as image:
                record(image, path=path)
    write_index("vanilla-artwork.json", sorted(entries.values(), key=lambda row: (row["names"] or row["keys"])[0].lower()))
    print(f"{len(paths)} provided PNGs, {len(used)} matched by pixels, {sum(len(e['keys']) for e in entries.values())} game keys, {len(entries)} images")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("game_data", type=Path)
    parser.add_argument("combat_pages", type=Path)
    args = parser.parse_args()
    import_text(args.game_data)
    import_art(args.game_data, args.combat_pages)
