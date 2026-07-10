# hackaton — generador de logs mockeados de Kubernetes

Daemon que genera logs sintéticos de Kubernetes (calcados del formato observado en
`kubernetes_enhanced_raw_logs.txt`) y los envía línea por línea, vía HTTP POST, a un
endpoint de ingesta — simulando el ritmo real de un stream de logs, incluyendo
ráfagas de incidentes ocasionales.

Este dataset fue creado para el **Cerby Log Optimization Agent Hackathon**, orientado
a validar capas de reglas de compresión LLM contra ruido extremo en logs.

## Estructura

```
app/
├── daemon.py         # entrypoint CLI: arma el HTTP client y lanza el stream
├── log_generator.py  # generador infinito de líneas de log con timing simulado
├── templates.py      # catálogo de plantillas de log por componente (checkout, payment, kubelet, etc.)
└── __init__.py
kubernetes_enhanced_raw_logs.txt   # dataset real (~379k líneas) usado como referencia
requirements.txt
```

## Componentes simulados

Ponderados según su frecuencia real en el dataset (~379k líneas):

| Componente | Peso | Servicio (`x-log-service`) |
|---|---|---|
| `pod/checkout-service-*` | 61 | `checkout-service` |
| `kubelet` | 17 | `k8s-control-plane` |
| `kube-proxy` | 15 | `k8s-control-plane` |
| `pod/payment-service-*` | 2 | `payment-service` |
| `ingress-nginx` | 2 | `k8s-control-plane` |
| `core-dns` | 2 | `k8s-control-plane` |

Ocasionalmente (por defecto ~1/800 líneas) se inyecta una **ráfaga de incidente**:
agotamiento del connection pool en `checkout-service`, con sus líneas WARN/ERROR
encadenadas a alta velocidad, replicando un patrón real observado en el dataset.

## Instalación

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Uso

```bash
python -m app.daemon
```

Por defecto envía a `https://wz-lab-v0-ia-cowork-log-optimizatio.vercel.app/api/ingest`
con `x-log-source: k8s`, a un ritmo de **10-30 segundos entre líneas** (más rápido
durante las ráfagas de incidente, que simulan el pico real).

### Opciones

| Flag | Default | Descripción |
|---|---|---|
| `--url` | endpoint de ingesta por defecto | URL destino de los POST |
| `--source` | `k8s` | valor del header `x-log-source` |
| `--seed` | ninguna | semilla para reproducibilidad |
| `--no-incidents` | desactivado | desactiva la inyección de ráfagas de incidente |
| `--timeout` | `5.0` | timeout (s) de cada POST |
| `--bypass-token` | env `VERCEL_BYPASS_TOKEN` | token de Vercel Protection Bypass |

Ejemplo con endpoint propio y sin incidentes:

```bash
python -m app.daemon --url http://localhost:3000/api/ingest --no-incidents --seed 42
```

Detener con `Ctrl+C`.
