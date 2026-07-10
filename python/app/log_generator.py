"""Generador de logs mockeados de Kubernetes, calcado del formato de
kubernetes_enhanced_raw_logs.txt, para enviarse línea por línea a otra app."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from itertools import count

from app.templates import (
    COMPONENTS,
    WEIGHTS,
    COMPONENT_GENERATORS,
    incident_burst,
)

# Cada tantas líneas (en promedio) se evalúa si toca insertar una ráfaga de incidente.
INCIDENT_CHECK_WINDOW = 800
INCIDENT_CHANCE = 1  # probabilidad de 1/INCIDENT_CHECK_WINDOW por línea evaluada


def _format_ts(ts: datetime) -> str:
    return ts.strftime("%Y-%m-%dT%H:%M:%S.") + f"{ts.microsecond // 1000:03d}Z"


def stream_log_entries(inject_incidents: bool = True, seed: int | None = None):
    """Generador infinito. Cada yield entrega (delay_seconds, component, line_text).

    delay_seconds es cuánto hay que esperar (simulando tiempo real) antes de
    emitir esa línea, relativo a la línea anterior.
    """
    rng = random.Random(seed)
    ts = datetime.now(timezone.utc)
    conn_id_gen = count(rng.randint(10_000, 20_000))

    while True:
        gap_ms = rng.randint(10_000, 30_000)
        ts += timedelta(milliseconds=gap_ms)

        if inject_incidents and rng.randint(1, INCIDENT_CHECK_WINDOW) <= INCIDENT_CHANCE:
            queued = rng.randint(1, 8)
            for component, level, message in incident_burst(queued):
                line = f"{_format_ts(ts)} {level:<5} [{component}] {message}"
                yield gap_ms / 1000, component, line
                gap_ms = 1
                ts += timedelta(milliseconds=gap_ms)
            continue

        component = rng.choices(COMPONENTS, weights=WEIGHTS, k=1)[0]
        level, message = COMPONENT_GENERATORS[component](conn_id_gen)
        line = f"{_format_ts(ts)} {level:<5} [{component}] {message}"
        yield gap_ms / 1000, component, line
