"""Daemon que genera logs mockeados de Kubernetes y los envía, línea por línea,
al endpoint de ingesta vía HTTP POST, simulando el ritmo real del stream."""

from __future__ import annotations

import argparse
import os
import time

import requests

from app.log_generator import stream_log_entries
from app.templates import COMPONENT_TO_SERVICE

DEFAULT_URL = "https://wz-lab-v0-ia-cowork-log-optimizatio.vercel.app/api/ingest"
DEFAULT_SOURCE = "k8s"


def run(
    url: str,
    source: str,
    seed: int | None,
    inject_incidents: bool,
    timeout: float,
    bypass_token: str | None = None,
) -> None:
    sent, failed = 0, 0
    base_headers = {"x-log-source": source}
    if bypass_token:
        base_headers["x-vercel-protection-bypass"] = bypass_token
        base_headers["x-vercel-set-bypass-cookie"] = "true"

    for delay, component, line in stream_log_entries(inject_incidents=inject_incidents, seed=seed):
        time.sleep(delay)
        service = COMPONENT_TO_SERVICE.get(component, "unknown")
        try:
            resp = requests.post(
                url,
                headers={**base_headers, "x-log-service": service},
                data=line.encode("utf-8"),
                timeout=timeout,
            )
            sent += 1
            if not resp.ok:
                print(f"[warn] {resp.status_code} al enviar linea: {line}")
        except requests.RequestException as exc:
            failed += 1
            print(f"[error] fallo el POST ({exc}): {line}")

        if sent % 10 == 0 and sent:
            print(f"[info] {sent} lineas enviadas ({failed} fallidas)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL, help="Endpoint de ingesta")
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="Valor del header x-log-source")
    parser.add_argument("--seed", type=int, default=None, help="Semilla para reproducibilidad")
    parser.add_argument("--no-incidents", action="store_true", help="Desactiva la inyección de incidentes")
    parser.add_argument("--timeout", type=float, default=5.0, help="Timeout (s) de cada POST")
    parser.add_argument(
        "--bypass-token",
        default=os.environ.get("VERCEL_BYPASS_TOKEN"),
        help="Token de Vercel Protection Bypass (o env VERCEL_BYPASS_TOKEN)",
    )
    args = parser.parse_args()

    print(f"[info] enviando logs a {args.url} (source={args.source})")
    try:
        run(
            url=args.url,
            source=args.source,
            seed=args.seed,
            inject_incidents=not args.no_incidents,
            timeout=args.timeout,
            bypass_token=args.bypass_token,
        )
    except KeyboardInterrupt:
        print("\n[info] detenido por el usuario")


if __name__ == "__main__":
    main()
