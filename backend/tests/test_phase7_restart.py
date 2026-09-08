"""Phase 7 — Backend & database restart integration tests (real processes).

These tests boot the real FastAPI application with real uvicorn worker
processes against a file-backed database, then verify behaviour across
process boundaries:

- duplicate seed execution (run twice -> identical row counts)
- backend restart   (kill uvicorn, relaunch, verify state persisted via HTTP)
- database restart  (a fresh independent engine/process reopens the same
                     database file and reads the same committed rows)
- cross-hospital 403 over live HTTP
- API health over live HTTP

No database mocks are used: every request is a real HTTP call to a real
uvicorn process, and every persistence check re-reads from disk.
"""

import os
import re
import socket
import subprocess
import time
from pathlib import Path

import httpx
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
VENV_PYTHON = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"

BASE_URL_PATTERN = "http://127.0.0.1:{port}"
READY_TIMEOUT = 60
HTTP_TIMEOUT = httpx.Timeout(10.0)

# Passwords the restart tests seed with (via MEDIFLOW_SEED_* env vars in
# `_env_for`). These must match what is asserted at login time.
SEED_PASSWORD = "phase7-seed-password"
SEED_ADMIN_PASSWORD = "phase7-seed-admin-password"

SEED_TABLES = [
    "hospitals",
    "users",
    "doctors",
    "rooms",
    "beds",
    "ambulances",
    "icu_units",
    "emergency_rooms",
    "hospital_operations",
    "hospital_staff",
    "patients",
]


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _env_for(db_path: Path) -> dict:
    env = dict(os.environ)
    env["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
    env["SECRET_KEY"] = "phase7-restart-test-secret"
    env["DEBUG"] = "false"
    env.setdefault("MEDIFLOW_SEED_PASSWORD", SEED_PASSWORD)
    env.setdefault("MEDIFLOW_SEED_ADMIN_PASSWORD", SEED_ADMIN_PASSWORD)
    return env


def _start_server(port: int, db_path: Path) -> subprocess.Popen:
    return subprocess.Popen(
        [
            str(VENV_PYTHON),
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--log-level",
            "warning",
        ],
        cwd=str(BACKEND_DIR),
        env=_env_for(db_path),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def _start_server_retry(db_path: Path, attempts: int = 5, ready_timeout: int = 30):
    """Boot uvicorn, retrying with a fresh port if the pick was raced.

    `_free_port()` releases the port before uvicorn binds it, so another
    process can claim it in between (classic TOCTOU). On any bind/boot
    failure the process is cleaned up and a new port is tried.
    """
    last_error: Exception | None = None
    for _ in range(attempts):
        port = _free_port()
        proc = _start_server(port, db_path)
        try:
            _wait_ready(port, timeout=ready_timeout)
            return proc, port
        except Exception as exc:
            last_error = exc
            _stop_server(proc)
    raise RuntimeError(f"could not start backend after {attempts} attempts: {last_error}")


def _wait_ready(port: int, timeout: int = READY_TIMEOUT) -> None:
    deadline = time.time() + timeout
    last_error = None
    while time.time() < deadline:
        try:
            resp = httpx.get(f"{BASE_URL_PATTERN.format(port=port)}/api/health", timeout=2.0)
            if resp.status_code == 200:
                return
            last_error = f"status {resp.status_code}"
        except httpx.TransportError as exc:  # connection refused while booting
            last_error = str(exc)
        time.sleep(0.25)
    raise RuntimeError(f"backend on port {port} did not become ready: {last_error}")


def _stop_server(proc: subprocess.Popen) -> str:
    if proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=15)
    return proc.stdout.read().decode(errors="replace") if proc.stdout else ""


def _run_seed(db_path: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [str(VENV_PYTHON), "-m", "app.seed.seed_database"],
        cwd=str(BACKEND_DIR),
        env=_env_for(db_path),
        capture_output=True,
        text=True,
        timeout=600,
    )


def _parse_seed_counts(stdout: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for table in SEED_TABLES:
        match = re.search(rf"^\s*{re.escape(table)}\s+(\d+)\s*$", stdout, re.MULTILINE)
        counts[table] = int(match.group(1)) if match else -1
        if match is None:
            raise AssertionError(f"table {table} not found in seed output")
    return counts


def _run_inline(db_path: Path, code: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [str(VENV_PYTHON), "-c", code],
        cwd=str(BACKEND_DIR),
        env=_env_for(db_path),
        capture_output=True,
        text=True,
        timeout=300,
    )


def _client(port: int) -> httpx.Client:
    return httpx.Client(base_url=BASE_URL_PATTERN.format(port=port), timeout=HTTP_TIMEOUT)


@pytest.fixture()
def db_file(tmp_path_factory) -> Path:
    return tmp_path_factory.mktemp("phase7_restart") / "mediflow_restart.db"


def _login(client: httpx.Client, email: str, password: str) -> str:
    resp = client.post(
        "/api/auth/login", json={"email": email, "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _find_hospital_id(client: httpx.Client, name: str) -> str:
    resp = client.get("/api/hospitals", params={"size": 100})
    assert resp.status_code == 200, resp.text
    for item in resp.json()["items"]:
        if item["name"] == name:
            return item["id"]
    raise AssertionError(f"hospital {name!r} not present")


# ─── Duplicate seed execution + restart persistence ──────────────────────────


def test_duplicate_seed_execution_is_idempotent(db_file) -> None:
    first = _run_seed(db_file)
    assert first.returncode == 0, first.stdout[-3000:]
    counts_first = _parse_seed_counts(first.stdout)

    second = _run_seed(db_file)
    assert second.returncode == 0, second.stdout[-3000:]
    counts_second = _parse_seed_counts(second.stdout)

    assert counts_first == counts_second, (
        f"seed not idempotent: {counts_first} != {counts_second}"
    )
    assert counts_first["hospitals"] == 6
    assert counts_first["users"] == 3
    assert counts_first["beds"] == 244
    assert counts_first["hospital_staff"] == 1


def test_backend_restart_preserves_state_and_database_restart_keeps_rows(db_file) -> None:
    """Scenario 1-15 over live HTTP, across backend and database restarts."""
    # Seed once (idempotency already covered by the test above).
    seeded = _run_seed(db_file)
    assert seeded.returncode == 0, seeded.stdout[-3000:]

    # ── Server #1: create real state over HTTP ───────────────────────────────
    server1, port1 = _start_server_retry(db_file)
    try:
        with _client(port1) as client:
            # health
            assert client.get("/api/health").status_code == 200
            assert client.get("/api/health/db").json() == {"status": "ok"}
            assert client.get("/api/health/ready").json()["status"] == "ready"

            patient_headers = {
                "Authorization": f"Bearer {_login(client, 'patient@mediflow.ai', SEED_PASSWORD)}"
            }
            staff_headers = {
                "Authorization": f"Bearer {_login(client, 'staff@mediflow.ai', SEED_PASSWORD)}"
            }

            # staff assigned to Hospital A (CityCare Medical Center)
            my_hospital = client.get("/api/staff/my-hospital", headers=staff_headers)
            assert my_hospital.status_code == 200, my_hospital.text
            hosp_a = my_hospital.json()["hospital"]
            assert hosp_a["name"] == "CityCare Medical Center"
            hosp_a_id = hosp_a["id"]

            # staff updates a bed at Hospital A
            beds = client.get(f"/api/hospitals/{hosp_a_id}/beds", params={"size": 100})
            available = next(
                b for b in beds.json()["items"] if b["status"] == "AVAILABLE"
            )
            updated = client.put(
                f"/api/staff/beds/{available['id']}",
                json={"status": "MAINTENANCE"},
                headers=staff_headers,
            )
            assert updated.status_code == 200, updated.text
            assert updated.json()["status"] == "MAINTENANCE"
            bed_id = available["id"]

            # cross-hospital 403: staff tries to modify a bed at Hospital B
            hosp_b_id = _find_hospital_id(client, "Metro Trauma & Apex Institute")
            add_metro_bed = _run_inline(
                db_file,
                (
                    "from app.core.database import SessionLocal;"
                    "from app.models import Hospital, Room, Bed, RoomStatus, BedStatus;"
                    "s=SessionLocal();"
                    "metro=s.query(Hospital).filter(Hospital.id=='" + hosp_b_id + "').one();"
                    "r=Room(hospital_id=metro.id, room_number='MRP-07', room_type='Emergency', status=RoomStatus.AVAILABLE);"
                    "s.add(r); s.flush();"
                    "s.add(Bed(hospital_id=metro.id, room_id=r.id, bed_number='MBP-07', bed_type='General', status=BedStatus.AVAILABLE));"
                    "s.commit()"
                ),
            )
            assert add_metro_bed.returncode == 0, add_metro_bed.stdout
            metro_beds = client.get(
                f"/api/hospitals/{hosp_b_id}/beds", params={"size": 100}
            )
            metro_bed = next(b for b in metro_beds.json()["items"] if b["bed_number"] == "MBP-07")
            forbidden = client.put(
                f"/api/staff/beds/{metro_bed['id']}",
                json={"status": "OCCUPIED"},
                headers=staff_headers,
            )
            assert forbidden.status_code == 403, forbidden.text
            assert forbidden.json()["error"]["code"] == "forbidden"

            # patient creates an emergency case and selects Hospital A
            case = client.post(
                "/api/emergency-cases",
                json={
                    "reported_symptoms": "Crushing chest pain radiating to the arm",
                    "age": 52,
                    "latitude": 12.9716,
                    "longitude": 77.5946,
                    "severity": "CRITICAL",
                },
                headers=patient_headers,
            )
            assert case.status_code == 201, case.text
            case_body = case.json()
            assert case_body["priority_score"] == 100.0

            token = client.post(
                f"/api/emergency-cases/{case_body['id']}/hospital-selection",
                json={"hospital_id": hosp_a_id},
                headers=patient_headers,
            )
            assert token.status_code == 201, token.text
            token_body = token.json()
            assert token_body["token_number"] == "TOK-0001"
            assert token_body["priority_level"] == 4

            # staff + patient queue views
            staff_queue = client.get(f"/api/queue/{hosp_a_id}", headers=staff_headers)
            assert staff_queue.json()["view"] == "staff"
            assert len(staff_queue.json()["items"]) == 1
            patient_queue = client.get(f"/api/queue/{hosp_a_id}", headers=patient_headers)
            assert patient_queue.json()["view"] == "patient"
            assert len(patient_queue.json()["items"]) == 1
            assert patient_queue.json()["items"][0]["token_number"] == "TOK-0001"
    finally:
        logs1 = _stop_server(server1)
        assert "Traceback" not in logs1, logs1

    # ── Backend restart: new process, same database file ─────────────────────
    server2, port2 = _start_server_retry(db_file)
    try:
        with _client(port2) as client:
            # state from the previous server lifetime must still be visible
            patient_headers = {
                "Authorization": f"Bearer {_login(client, 'patient@mediflow.ai', SEED_PASSWORD)}"
            }
            staff_headers = {
                "Authorization": f"Bearer {_login(client, 'staff@mediflow.ai', SEED_PASSWORD)}"
            }

            hosp_a_id = _find_hospital_id(client, "CityCare Medical Center")
            beds = client.get(f"/api/hospitals/{hosp_a_id}/beds", params={"size": 100})
            assert beds.status_code == 200
            assert any(b["id"] == bed_id and b["status"] == "MAINTENANCE" for b in beds.json()["items"])

            staff_queue = client.get(f"/api/queue/{hosp_a_id}", headers=staff_headers)
            assert len(staff_queue.json()["items"]) == 1
            assert staff_queue.json()["items"][0]["token_number"] == "TOK-0001"

            patient_cases = client.get(
                "/api/patients/me/emergency-cases", headers=patient_headers
            )
            assert patient_cases.json()["total"] == 1

            # double restart: kill again and relaunch a third process
            logs2 = _stop_server(server2)
            assert "Traceback" not in logs2, logs2
    finally:
        _stop_server(server2)

    server3, port3 = _start_server_retry(db_file)
    try:
        with _client(port3) as client:
            patient_headers = {
                "Authorization": f"Bearer {_login(client, 'patient@mediflow.ai', SEED_PASSWORD)}"
            }
            queue = client.get(
                f"/api/queue/{_find_hospital_id(client, 'CityCare Medical Center')}",
                headers=patient_headers,
            )
            assert queue.status_code == 200
            assert len(queue.json()["items"]) == 1
            assert client.get("/api/health").json()["status"] == "ok"
    finally:
        _stop_server(server3)

    # ── Database restart (fresh engine/process reopens the file) ─────────────
    counts = _run_inline(
        db_file,
        (
            "from sqlalchemy import func, select;"
            "from app.core.database import SessionLocal;"
            "from app.models import Hospital, User, Bed, QueueToken, EmergencyCase;"
            "s=SessionLocal();"
            "print('hospitals', s.scalar(select(func.count()).select_from(Hospital)));"
            "print('users', s.scalar(select(func.count()).select_from(User)));"
            "print('beds', s.scalar(select(func.count()).select_from(Bed)));"
            "print('queue_tokens', s.scalar(select(func.count()).select_from(QueueToken)));"
            "print('emergency_cases', s.scalar(select(func.count()).select_from(EmergencyCase)))"
        ),
    )
    assert counts.returncode == 0, counts.stdout + counts.stderr
    out = counts.stdout
    assert re.search(r"hospitals 6", out)
    assert re.search(r"users 3", out)
    # 244 seeded beds + 1 bed added at Hospital B for the cross-hospital 403 test
    assert re.search(r"beds 245", out)
    assert re.search(r"queue_tokens 1", out)
    assert re.search(r"emergency_cases 1", out)


def test_real_http_validation_matrix(db_file) -> None:
    """Edge cases exercised against a live uvicorn process."""
    seeded = _run_seed(db_file)
    assert seeded.returncode == 0, seeded.stdout[-3000:]

    server, port = _start_server_retry(db_file)
    try:
        with _client(port) as client:
            # invalid input
            bad_register = client.post(
                "/api/auth/register",
                json={"email": "x@test.com", "password": "short", "full_name": "X"},
            )
            assert bad_register.status_code == 422
            assert bad_register.json()["error"]["code"] == "validation_error"

            wrong_login = client.post(
                "/api/auth/login",
                json={"email": "patient@mediflow.ai", "password": "wrong-password"},
            )
            assert wrong_login.status_code == 401

            # missing required fields
            assert client.post("/api/auth/register", json={}).status_code == 422

            # invalid hospital ID
            assert client.get("/api/hospitals/no-such-id").status_code == 404

            # unauthorized requests
            assert client.get("/api/staff/my-hospital").status_code == 401
            assert client.get("/api/queue/some-hospital").status_code == 401

            # CORS over real HTTP
            preflight = client.options(
                "/api/hospitals",
                headers={
                    "Origin": "http://localhost:5173",
                    "Access-Control-Request-Method": "GET",
                },
            )
            assert preflight.headers.get("access-control-allow-origin") == "http://localhost:5173"
    finally:
        logs = _stop_server(server)
        assert "Traceback" not in logs, logs