"""Tests de update_results.py contra un servidor WireMock real (testcontainers).

No se mockea urllib: el script se ejecuta tal cual como subproceso (igual que
lo invoca el workflow), apuntando a WORLDCUP_API_URL — un override leído solo
por los tests; en producción no se define y el script usa la URL real.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
import requests
from wiremock.testing.testcontainer import wiremock_container

SCRIPT = Path(__file__).parent / "update_results.py"

GROUP_MATCH_FINISHED = {
    "type": "group", "group": "A", "finished": "TRUE",
    "home_team_name_en": "Mexico", "away_team_name_en": "South Africa",
    "home_score": "2", "away_score": "1",
}
GROUP_MATCH_UNPLAYED = {
    "type": "group", "group": "A", "finished": "FALSE",
    "home_team_name_en": "Canada", "away_team_name_en": "Qatar",
    "home_score": "0", "away_score": "0",
}
FINAL_WITH_WINNER = {
    "type": "final", "id": "104", "finished": "TRUE",
    "home_team_name_en": "Spain", "away_team_name_en": "Argentina",
    "home_score": "2", "away_score": "1",
}
THIRD_PLACE_DRAW_NO_PENALTIES = {
    "type": "third", "id": "103", "finished": "TRUE",
    "home_team_name_en": "Portugal", "away_team_name_en": "Croatia",
    "home_score": "1", "away_score": "1",
}


@pytest.fixture(scope="module")
def wm():
    with wiremock_container(secure=False, verify_ssl_certs=False) as container:
        yield container


@pytest.fixture(autouse=True)
def _reset_wm(wm):
    requests.post(wm.get_url("__admin/reset"), verify=False)
    yield


def stub_games(wm, status, body):
    mapping = {
        "request": {"method": "GET", "urlPath": "/get/games"},
        "response": {"status": status, "jsonBody": body},
    }
    resp = requests.post(wm.get_url("__admin/mappings"), json=mapping, verify=False)
    resp.raise_for_status()


def run_updater(tmp_path, api_url):
    env = {**os.environ, "WORLDCUP_API_URL": api_url}
    return subprocess.run(
        [sys.executable, str(SCRIPT)],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )


def write_existing(tmp_path, data):
    (tmp_path / "results.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def test_api_caida_conserva_resultados_y_no_falla(tmp_path, wm):
    stub_games(wm, 404, {"error": {"message": "Route not found"}})
    write_existing(tmp_path, {
        "updated": "2026-07-15T10:00:00Z",
        "results": {"A_México_Sudáfrica": "1"},
        "scores": {"A_México_Sudáfrica": "2-1"},
        "standings": {}, "koResults": {}, "ko": {}, "koScores": {},
    })
    before = (tmp_path / "results.json").read_bytes()

    proc = run_updater(tmp_path, wm.get_url("get/games"))

    assert proc.returncode == 0
    assert "no se pudo obtener datos" in proc.stderr
    assert (tmp_path / "results.json").read_bytes() == before


def test_api_devuelve_menos_datos_conserva_resultados_existentes(tmp_path, wm):
    stub_games(wm, 200, {"games": []})
    write_existing(tmp_path, {
        "updated": "2026-07-15T10:00:00Z",
        "results": {"A_México_Sudáfrica": "1"},
        "scores": {"A_México_Sudáfrica": "2-1"},
        "standings": {"A": []},
        "koResults": {"final_M104": "España"},
        "ko": {}, "koScores": {},
    })
    before = (tmp_path / "results.json").read_bytes()

    proc = run_updater(tmp_path, wm.get_url("get/games"))

    assert proc.returncode == 0
    assert "menos datos" in proc.stderr
    assert (tmp_path / "results.json").read_bytes() == before


def test_resultados_nuevos_se_escriben_correctamente(tmp_path, wm):
    stub_games(wm, 200, {"games": [
        GROUP_MATCH_FINISHED, GROUP_MATCH_UNPLAYED, FINAL_WITH_WINNER,
    ]})

    proc = run_updater(tmp_path, wm.get_url("get/games"))

    assert proc.returncode == 0
    data = json.loads((tmp_path / "results.json").read_text(encoding="utf-8"))
    assert data["results"] == {"A_México_Sudáfrica": "1"}
    assert data["scores"] == {"A_México_Sudáfrica": "2-1"}
    assert data["koResults"] == {"final_M104": "España"}
    assert data["koScores"] == {"final_M104": "2-1"}
    assert data["ko"]["final_M104"] == {
        "key": "final_M104", "home": "España", "away": "Argentina",
    }


def test_sin_cambios_no_reescribe_el_fichero(tmp_path, wm):
    stub_games(wm, 200, {"games": [GROUP_MATCH_FINISHED]})

    first = run_updater(tmp_path, wm.get_url("get/games"))
    assert first.returncode == 0
    mtime_before = (tmp_path / "results.json").stat().st_mtime_ns

    second = run_updater(tmp_path, wm.get_url("get/games"))

    assert second.returncode == 0
    assert "Sin cambios" in second.stdout
    assert (tmp_path / "results.json").stat().st_mtime_ns == mtime_before


def test_empate_ko_sin_datos_de_penaltis_no_asigna_ganador(tmp_path, wm):
    stub_games(wm, 200, {"games": [THIRD_PLACE_DRAW_NO_PENALTIES]})

    proc = run_updater(tmp_path, wm.get_url("get/games"))

    assert proc.returncode == 0
    data = json.loads((tmp_path / "results.json").read_text(encoding="utf-8"))
    assert "third_M103" not in data["koResults"]
    assert data["ko"]["third_M103"] == {
        "key": "third_M103", "home": "Portugal", "away": "Croacia",
    }
    assert "sin datos de penaltis" in proc.stderr
