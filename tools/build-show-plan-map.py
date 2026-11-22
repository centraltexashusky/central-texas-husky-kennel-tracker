"""Build the map asset from U.S. Census Bureau files using the standard library.

Pass a directory containing boundaries.zip (2025 1:20m state KML), places.zip,
states.zip and zip-areas.zip (2026 national Gazetteer ZIP files).
https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.2025.html
https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
"""
import csv
import io
import json
import math
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile

sources = Path(sys.argv[1])
namespace = {"k": "http://www.opengis.net/kml/2.2"}


def zipped(name, extension):
    with ZipFile(sources / name) as archive:
        path = next(path for path in archive.namelist() if path.endswith(extension))
        return archive.read(path)


def gazetteer(name):
    return csv.DictReader(io.TextIOWrapper(io.BytesIO(zipped(name, ".txt")), encoding="utf-8-sig"), delimiter="|")


def city_key(name):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", name).lower())


def albers(longitude, latitude, center, parallels):
    lon, lat = map(math.radians, (longitude, latitude))
    lon0, lat0 = map(math.radians, center)
    first, second = map(math.radians, parallels)
    n = (math.sin(first) + math.sin(second)) / 2
    c = math.cos(first) ** 2 + 2 * n * math.sin(first)
    theta = n * ((lon - lon0 + math.pi) % (2 * math.pi) - math.pi)
    rho = math.sqrt(c - 2 * n * math.sin(lat)) / n
    rho0 = math.sqrt(c - 2 * n * math.sin(lat0)) / n
    return rho * math.sin(theta), rho * math.cos(theta) - rho0


regions = {
    "main": ((-96, 38), (29.5, 45.5), (15, 9, 870, 527)),
    "AK": ((-154, 57), (55, 65), (8, 415, 182, 112)),
    "HI": ((-157, 21), (18, 24), (201, 460, 105, 67)),
    "PR": ((-66.4, 18.2), (16, 22), (788, 497, 92, 30)),
}


def region(state):
    return state if state in ("AK", "HI", "PR") else "main"


def raw_point(geo, region_id):
    center, parallels, _ = regions[region_id]
    return albers(*geo, center, parallels)


def rings_from_placemark(mark):
    return [
        [tuple(map(float, coord.split(",")[:2])) for coord in ring.text.split()]
        for ring in mark.findall(".//k:Polygon/k:outerBoundaryIs/k:LinearRing/k:coordinates", namespace)
    ]


states = {row["USPS"]: row for row in gazetteer("states.zip")}
boundaries = {}
region_points = defaultdict(list)
tree = ET.fromstring(zipped("boundaries.zip", ".kml"))
for mark in tree.findall(".//k:Placemark", namespace):
    code = mark.find('.//k:SimpleData[@name="STUSPS"]', namespace).text
    if code not in states:
        continue
    area = region(code)
    rings = [[raw_point(geo, area) for geo in ring] for ring in rings_from_placemark(mark)]
    boundaries[code] = rings
    region_points[area].extend(point for ring in rings for point in ring)

transforms = {}
for area, points in region_points.items():
    x, y, width, height = regions[area][2]
    left, right = min(p[0] for p in points), max(p[0] for p in points)
    top, bottom = min(p[1] for p in points), max(p[1] for p in points)
    scale = min(width / (right - left), height / (bottom - top))
    transforms[area] = (scale, x + (width - (right - left) * scale) / 2 - left * scale,
                        y + (height - (bottom - top) * scale) / 2 - top * scale)


def fitted(point, area):
    scale, x, y = transforms[area]
    return tuple(round(base * scale + offset, 1) for base, offset in zip(point, (x, y)))


def gazetteer_point(row, area):
    geo = (float(row["INTPTLONG"]), float(row["INTPTLAT"]))
    return fitted(raw_point(geo, area), area)


def path_for(rings):
    return "".join("M" + " ".join(f"{x:g},{y:g}" for x, y in ring) + "Z" for ring in rings)


state_data = {}
for code, rings in sorted(boundaries.items()):
    area = region(code)
    paths = [[fitted(point, area) for point in ring] for ring in rings]
    points = [point for ring in paths for point in ring]
    left, top = min(p[0] for p in points), min(p[1] for p in points)
    right, bottom = max(p[0] for p in points), max(p[1] for p in points)
    state_data[code] = {
        "name": states[code]["NAME"], "point": gazetteer_point(states[code], area),
        "bounds": [left, top, right, bottom], "path": path_for(paths),
    }

cities = defaultdict(dict)
for row in gazetteer("places.zip"):
    code = row["USPS"]
    if code not in state_data:
        continue
    name = re.sub(r" (city and borough|city and county|unified government|consolidated government|city|town|village|borough|municipality|CDP|comunidad|zona urbana)$", "", row["NAME"], flags=re.I)
    key = city_key(name)
    point = (name, *gazetteer_point(row, region(code)))
    if key in cities[code] and cities[code][key] != point:
        cities[code][key] = None
    else:
        cities[code][key] = point

zip_points = {}
for row in gazetteer("zip-areas.zip"):
    zip_code = row["GEOID"]
    prefix = int(zip_code[:3])
    area = "AK" if 995 <= prefix <= 999 else "HI" if prefix in (967, 968) else "PR" if 6 <= prefix <= 9 else "main"
    zip_points[zip_code] = gazetteer_point(row, area)

asset = Path(__file__).resolve().parents[1] / "assets/show-plan-map.json"
asset.write_text(json.dumps({"states": state_data, "cities": cities, "zips": zip_points}, separators=(",", ":"), ensure_ascii=False) + "\n")
