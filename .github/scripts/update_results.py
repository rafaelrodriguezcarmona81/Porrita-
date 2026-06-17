#!/usr/bin/env python3
import urllib.request
import json
import sys
from datetime import datetime, timezone

TEAM_MAP = {
  "Mexico": "México",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  "Czech Republic": "Rep. Checa",
  "Canada": "Canadá",
  "Bosnia and Herzegovina": "Bosnia y Herc.",
  "Bosnia-Herzegovina": "Bosnia y Herc.",
  "Qatar": "Catar",
  "Switzerland": "Suiza",
  "Brazil": "Brasil",
  "Morocco": "Marruecos",
  "Haiti": "Haití",
  "Scotland": "Escocia",
  "United States": "Estados Unidos",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkey": "Turquía",
  "Germany": "Alemania",
  "Curacao": "Curazao",
  "Curaçao": "Curazao",
  "Ivory Coast": "Costa de Marfil",
  "Ecuador": "Ecuador",
  "Netherlands": "Países Bajos",
  "Japan": "Japón",
  "Sweden": "Suecia",
  "Tunisia": "Túnez",
  "Belgium": "Bélgica",
  "Egypt": "Egipto",
  "Iran": "Irán",
  "New Zealand": "Nueva Zelanda",
  "Spain": "España",
  "Cape Verde": "Cabo Verde",
  "Saudi Arabia": "Arabia Saudí",
  "Uruguay": "Uruguay",
  "France": "Francia",
  "Senegal": "Senegal",
  "Iraq": "Irak",
  "Norway": "Noruega",
  "Argentina": "Argentina",
  "Algeria": "Argelia",
  "Austria": "Austria",
  "Jordan": "Jordania",
  "Portugal": "Portugal",
  "DR Congo": "RD Congo",
  "Democratic Republic of the Congo": "RD Congo",
  "Uzbekistan": "Uzbekistán",
  "Colombia": "Colombia",
  "England": "Inglaterra",
  "Croatia": "Croacia",
  "Ghana": "Ghana",
  "Panama": "Panamá",
}

def translate(name):
  return TEAM_MAP.get(name, name)

url = "https://worldcup26.ir/get/games"
try:
  req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
  with urllib.request.urlopen(req, timeout=20) as r:
    data = json.loads(r.read().decode("utf-8"))
except Exception as e:
  print(f"Error al obtener datos: {e}", file=sys.stderr)
  sys.exit(1)

results = {}
scores = {}
for g in data.get("games", []):
  if g.get("type") != "group":
    continue
  if g.get("finished", "FALSE") != "TRUE":
    continue
  home = translate(g.get("home_team_name_en", ""))
  away = translate(g.get("away_team_name_en", ""))
  group = g.get("group", "")
  if not group or len(group) != 1:
    continue
  try:
    home_score = int(g.get("home_score", 0))
    away_score = int(g.get("away_score", 0))
  except (ValueError, TypeError):
    continue
  key = f"{group}_{home}_{away}"
  if home_score > away_score:
    results[key] = "1"
  elif home_score == away_score:
    results[key] = "X"
  else:
    results[key] = "2"
  scores[key] = f"{home_score}-{away_score}"

output = {
  "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "results": results,
  "scores": scores,
}

out_path = "results.json"
with open(out_path, "w", encoding="utf-8") as f:
  json.dump(output, f, ensure_ascii=False, indent=2)

print(f"results.json actualizado con {len(results)} resultados")
