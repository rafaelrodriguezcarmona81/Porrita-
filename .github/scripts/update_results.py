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
# Clasificación por grupo: { grupo -> { equipo -> fila } }. Se siembran los 4
# equipos de cada grupo desde el calendario completo (aunque no hayan jugado),
# y luego se acumulan estadísticas solo con los partidos finalizados, para que
# la tabla cuadre exactamente con los resultados publicados.
standings = {}

def row(group, team):
  g = standings.setdefault(group, {})
  return g.setdefault(team, {"team": team, "mp": 0, "w": 0, "d": 0, "l": 0,
                             "gf": 0, "ga": 0, "gd": 0, "pts": 0})

# 1ª pasada: sembrar el roster de cada grupo desde TODOS los partidos de grupo.
for g in data.get("games", []):
  if g.get("type") != "group":
    continue
  group = g.get("group", "")
  if not group or len(group) != 1:
    continue
  row(group, translate(g.get("home_team_name_en", "")))
  row(group, translate(g.get("away_team_name_en", "")))

# 2ª pasada: resultados + estadísticas con los partidos finalizados.
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

  h, a = row(group, home), row(group, away)
  h["mp"] += 1; a["mp"] += 1
  h["gf"] += home_score; h["ga"] += away_score
  a["gf"] += away_score; a["ga"] += home_score
  if home_score > away_score:
    h["w"] += 1; h["pts"] += 3; a["l"] += 1
  elif home_score == away_score:
    h["d"] += 1; a["d"] += 1; h["pts"] += 1; a["pts"] += 1
  else:
    a["w"] += 1; a["pts"] += 3; h["l"] += 1

# Ordenar cada grupo: pts ▸ diferencia de goles ▸ goles a favor ▸ nombre.
standings_out = {}
for group, teams in standings.items():
  for t in teams.values():
    t["gd"] = t["gf"] - t["ga"]
  standings_out[group] = sorted(
    teams.values(),
    key=lambda t: (-t["pts"], -t["gd"], -t["gf"], t["team"]),
  )

# ─── TODO: ELIMINATORIAS (knockout / cuadro) ──────────────────────────────────
# Cuando arranque la fase final (tras la fase de grupos), este script debe poblar
# también el cuadro de eliminatorias, igual que hace arriba con los grupos, y
# añadir DOS claves a `output` (de momento NO se emiten — ver más abajo):
#
#   * "koResults" → mapa match-key → equipo que AVANZÓ (en español), CLAVE PRINCIPAL.
#                   La match-key es la ESTABLE de la plantilla: "{RONDA}_M{n}" (p. ej.
#                   "r32_M73", "r16_M89", "final_M104"; ver KO_BRACKET en js/app.js,
#                   M73..M104). Con esto el cliente: (a) puntúa el cuadro (bracketPts:
#                   `base` puntos por acertante por ronda) y (b) propaga ganadores y
#                   perdedores a las rondas siguientes (matchWinner/matchLoser) desde
#                   resolveBracketTeams(). Nombres de equipo en español (vía TEAM_MAP).
#   * "ko"        → OPCIONAL. Cruces concretos por ronda, con PRECEDENCIA sobre la
#                   resolución calculada por el cliente (útil para el caso real de la
#                   FIFA donde la asignación de los 8 terceros a sus huecos sigue la
#                   tabla Anexo C). Formato:
#                   { "r32":[{ "key":"r32_M73", "home":..., "away":... }, ...],
#                     "r16":[...], "qf":[...], "sf":[...], "third":[...], "final":[...] }
#                   Si NO se emite, el cliente resuelve los huecos solo (1º/2º de grupo
#                   + 8 mejores terceros asignados por conjunto candidato).
#
# NO se implementa todavía porque a fecha de hoy el Mundial está en fase de grupos:
# no existen resultados KO que raspar, y NO se debe inventar el resultado de ningún
# cruce (debe venir de datos reales). La PLANTILLA de huecos (KO_BRACKET) ya es
# pública y fija en el cliente, que la rellena progresivamente desde S.groupStandings;
# mientras no haya "koResults"/"ko", S.koResults/S.koFixtures caen a {} y la pestaña
# Cuadro muestra los huecos como "pendiente". Por eso `output` se deja EXACTAMENTE
# como estaba: sin claves "ko"/"koResults".

# ─── ELIMINATORIAS (knockout / cuadro) ─────────────────────────────────
# La API devuelve los partidos KO con `type` = "r32", "r16", "qf", "sf",
# "third" o "final", y `id` = número oficial del partido ("73".."104").
# Con eso construimos la match-key estable "{type}_M{id}" (ej: "r32_M73"),
# determinamos el ganador por marcador y lo emitimos en `koResults`.
# También emitimos `ko` con los cruces concretos (home/away resueltos)
# para que el cliente no tenga que inferirlos desde standings.

KO_TYPES = {"r32", "r16", "qf", "sf", "third", "final"}

ko_results = {}   # match-key → equipo que avanzó (en español)
ko_fixtures = {}  # match-key → {key, home, away}  (cruces concretos)
ko_scores = {}    # match-key → marcador "home_score-away_score" (mismo estilo que scores)

for g in data.get("games", []):
  gtype = g.get("type", "").lower()
  if gtype not in KO_TYPES:
    continue
  match_id = g.get("id", "")
  if not match_id:
    continue
  key = f"{gtype}_M{match_id}"   # ej: "r32_M73"
  home = translate(g.get("home_team_name_en", ""))
  away = translate(g.get("away_team_name_en", ""))
  # Guardar el cruce concreto siempre (aunque no haya terminado,
  # sirve para que el cliente muestre los emparejamientos reales).
  if home and away:
    ko_fixtures[key] = {"key": key, "home": home, "away": away}
  # Resultado solo cuando el partido ha terminado.
  if g.get("finished", "FALSE") != "TRUE":
    continue
  try:
    home_score = int(g.get("home_score", 0))
    away_score = int(g.get("away_score", 0))
  except (ValueError, TypeError):
    continue
  winner = home if home_score > away_score else away
  ko_results[key] = winner
  ko_scores[key] = f"{home_score}-{away_score}"

output = {
  "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "results": results,
  "scores": scores,
  "standings": standings_out,
  "koResults": ko_results,
  "ko": ko_fixtures,
  "koScores": ko_scores,
}

out_path = "results.json"
with open(out_path, "w", encoding="utf-8") as f:
  json.dump(output, f, ensure_ascii=False, indent=2)

print(f"results.json actualizado con {len(results)} resultados")
