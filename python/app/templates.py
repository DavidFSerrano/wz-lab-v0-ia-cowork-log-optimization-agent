"""Catálogo de plantillas de log observadas en kubernetes_enhanced_raw_logs.txt."""

import random

CHECKOUT_POD = "pod/checkout-service-7d9f8b-x4k2p"
PAYMENT_POD = "pod/payment-service-5b4f8c-z9m2a"

# Peso relativo de cada componente, calibrado sobre el dataset real (~379k líneas).
COMPONENT_WEIGHTS = {
    CHECKOUT_POD: 61,
    "kubelet": 17,
    "kube-proxy": 15,
    PAYMENT_POD: 2,
    "ingress-nginx": 2,
    "core-dns": 2,
}

COMPONENTS = list(COMPONENT_WEIGHTS.keys())
WEIGHTS = list(COMPONENT_WEIGHTS.values())

# Valor a usar en el header x-log-service según el componente que originó la línea.
COMPONENT_TO_SERVICE = {
    CHECKOUT_POD: "checkout-service",
    PAYMENT_POD: "payment-service",
    "kubelet": "k8s-control-plane",
    "kube-proxy": "k8s-control-plane",
    "ingress-nginx": "k8s-control-plane",
    "core-dns": "k8s-control-plane",
}


def _checkout_line(conn_id_gen):
    kind = random.choices(
        ["connection-pool-acquire", "connection-pool-release", "healthcheck", "prometheus"],
        weights=[27, 27, 25, 21],
    )[0]
    if kind == "connection-pool-acquire":
        return "DEBUG", f"connection-pool: acquired conn id={next(conn_id_gen)} pool_size=20 active={random.randint(1, 20)}"
    if kind == "connection-pool-release":
        return "DEBUG", f"connection-pool: released conn id={next(conn_id_gen)} pool_size=20 active={random.randint(1, 20)}"
    if kind == "healthcheck":
        return "INFO", f"healthcheck: GET /healthz 200 OK ({random.randint(1, 15)}ms)"
    return "INFO", f"prometheus-metrics: scraped 142 metrics in {random.randint(1, 15)}ms"


def _payment_line(conn_id_gen):
    kind = random.choice(["acquire", "release"])
    action = "acquired" if kind == "acquire" else "released"
    return "DEBUG", f"connection-pool: {action} conn id={next(conn_id_gen)} pool_size=50 active={random.randint(1, 50)}"


def _kubelet_line():
    if random.random() < 0.02:
        return "WARN", "Slow skipped pod resizing due to scheduling constraints"
    return "INFO", "SyncLoop REMOVE: template/checkout-service-7d9f8b-x4k2p"


def _kube_proxy_line():
    return "INFO", "Keepalive connection to api-server active..."


def _ingress_nginx_line():
    return "WARN", f"event-worker: connection with upstream timed out, retrying ({random.randint(1, 3)}/3)"


def _core_dns_line():
    return "INFO", "[INFO] plugin/reload: Running configuration unchanged"


COMPONENT_GENERATORS = {
    CHECKOUT_POD: _checkout_line,
    PAYMENT_POD: _payment_line,
    "kubelet": lambda *_: _kubelet_line(),
    "kube-proxy": lambda *_: _kube_proxy_line(),
    "ingress-nginx": lambda *_: _ingress_nginx_line(),
    "core-dns": lambda *_: _core_dns_line(),
}


def incident_burst(queued):
    """Secuencia real observada dos veces en el dataset: pool agotado en checkout-service."""
    lines = [
        ("WARN", f"connection-pool: acquire timeout after 5000ms, pool_size=20 active=20 queued={queued}"),
        ("ERROR", f"db-client: failed to acquire connection: pool exhausted (active=20/20, queued={queued})"),
        ("ERROR", "http-handler: request /api/v2/checkout failed: 503 Service Unavailable (upstream: db-client pool exhausted)"),
    ]
    if random.random() < 0.5:
        lines.append(("ERROR", "db-client: connection pool size (20) has not scaled with traffic since deploy v2.14.3 (2026-06-28)"))
    return [(CHECKOUT_POD, level, msg) for level, msg in lines]
