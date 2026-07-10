# Analysis Endpoint Ingestion Specification

## 1. Primary Route Target
The system transmits curated high-signal log models directly via secure background configurations:
* **Endpoint URL:** `https://wz-lab-v0-ia-cowork-log-optimizatio.vercel.app/api/ingest`
* **HTTP Method:** `POST`

## 2. Header Invariants
| Key | Value / Example | Note |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | |
| `x-log-source` | `k8s` | Dynamic capture source type indicator |
| `x-log-service`| `orders-api` | Identifies processing origin microservice |

## 3. Structural JSON Data Contract (Payload Schema)
```json
{
  "$schema": "[https://json-schema.org/draft/2020-12/schema](https://json-schema.org/draft/2020-12/schema)",
  "type": "object",
  "required": ["timestamp", "level", "message", "compressed"],
  "properties": {
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 transmission event generation anchor."
    },
    "level": {
      "type": "string",
      "enum": ["INFO", "WARN", "ERROR", "DEBUG"]
    },
    "message": {
      "type": "string",
      "description": "High-signal log payload message with noise stripped out."
    },
    "compressed": {
      "type": "boolean",
      "description": "Flags whether processing applied deduplication."
    }
  }
}
