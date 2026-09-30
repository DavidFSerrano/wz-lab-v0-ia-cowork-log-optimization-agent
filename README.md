# CoworkLog — SRE AI Agent (demo Félix Pago)

Asistente de análisis de logs e incidentes para SRE/DevOps: ingiere logs de Kubernetes y AWS, los guarda como vectores en Postgres (pgvector), detecta incidentes y responde preguntas de troubleshooting con un chat RAG.

Para la arquitectura, los flujos y las reglas del código, consulta [AGENTS.md](AGENTS.md).

## Ejecutar en local

### Requisitos
- Node.js 22+
- Docker

### 1. Levantar PostgreSQL con pgvector

Usamos la imagen `pgvector/pgvector:pg17` (PostgreSQL 17 con la extensión `vector`):

```bash
docker run -d \
  --name coworklog-pgvector \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=coworklog \
  -p 5432:5432 \
  -v coworklog-pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  pgvector/pgvector:pg17
```

- El volumen `coworklog-pgdata` conserva los datos aunque se borre el contenedor.
- Si el puerto 5432 ya está ocupado, usa otro (por ejemplo `-p 5433:5432`) y ajústalo en `DATABASE_URL`.

Para comprobar que está arriba:

```bash
docker exec coworklog-pgvector pg_isready -U admin
```

### 2. Variables de entorno

Crea `.env.local` en la raíz del proyecto (Git lo ignora):

```bash
DATABASE_URL=postgresql://admin:password@localhost:5432/coworklog
AI_DEMO_MODE=true
```

`AI_DEMO_MODE=true` hace que la app funcione sin clave de IA: usa embeddings locales y un modelo de chat basado en reglas (ver "Modo demo" en [AGENTS.md](AGENTS.md)). Si tienes una clave de Vercel AI Gateway, quita esa línea y añade `AI_GATEWAY_API_KEY=...`.

### 3. Crear las tablas

> ⚠️ `Tables.sql` **borra y vuelve a crear** `log_chunks` e `incidents`. Se pierden los datos existentes.

```bash
docker exec -i coworklog-pgvector psql -U admin -d coworklog < Tables.sql
```

### 4. Cargar datos dummy

`DummyData.sql` inserta 16 logs y 2 incidentes del escenario de la demo: `orders-api` en CrashLoopBackOff por un `kms:Decrypt` denegado. Las fechas son relativas a `now()`.

Los embeddings se insertan como valores aleatorios de relleno, así que hay que recalcularlos justo después; si no, la búsqueda del chat no devuelve resultados relacionados:

```bash
docker exec -i coworklog-pgvector psql -U admin -d coworklog < DummyData.sql
node --experimental-strip-types --env-file=.env.local scripts/embed-dummy.mjs
```

### 5. Arrancar la app

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Páginas

| Ruta | Qué muestra |
|---|---|
| `/` | Dashboard de incidentes y chat de diagnóstico |
| `/demo` | Recorrido guiado de la demo |
| `/logs` | Feed en vivo de logs ingeridos |
| `/compress` | Compresor de logs EKS |
| `/stream` | Ingesta continua de logs EKS simulados |
| `/architecture` | Arquitectura RAG |

## Ingerir logs propios

```bash
curl -X POST "http://localhost:3000/api/ingest?source=k8s&service=orders-api&environment=prod" \
  --data "2026-09-30T10:00:00Z ERROR [db] connection refused"
```

La detección de incidentes necesita al menos 3 errores del mismo servicio y entorno. Para probarla, envía registros separados (NDJSON o un array JSON), no un solo bloque de texto.
