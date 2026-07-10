"""
Log optimization + embedding service.

Pipeline: raw logs (any source) -> normalize -> optimize (dedupe + semantic
chunk) -> embed (AI Gateway) -> store in Neon (pgvector). Also exposes hybrid
retrieval (metadata/time filter + vector similarity) for the RAG chat.
"""

import json
import os
import re
from datetime import datetime, timezone

import asyncpg
import fastapi
import fastapi.middleware.cors
import httpx
from pydantic import BaseModel

EMBED_MODEL = "openai/text-embedding-3-small"
EMBED_DIM = 1536
GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/embeddings"

app = fastapi.FastAPI()

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(dsn=os.environ["DATABASE_URL"])
    return pool


# ---------- models ----------


class LogEvent(BaseModel):
    source: str  # 'k8s' | 'aws' | 'web'
    service: str | None = None
    environment: str | None = None
    severity: str | None = None
    timestamp: str | None = None  # ISO 8601
    raw: str


class IngestRequest(BaseModel):
    events: list[LogEvent]


class SearchRequest(BaseModel):
    query: str
    service: str | None = None
    environment: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    limit: int = 8


# ---------- helpers ----------


def parse_time(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)


SEVERITY_PATTERNS = [
    ("error", re.compile(r"\b(error|fatal|exception|accessdenied|denied|failed|crashloopbackoff)\b", re.I)),
    ("warn", re.compile(r"\b(warn|warning|backoff|unhealthy|timeout)\b", re.I)),
]


def infer_severity(text: str) -> str:
    for label, pattern in SEVERITY_PATTERNS:
        if pattern.search(text):
            return label
    return "info"


def collapse_duplicates(lines: list[str]) -> tuple[str, int]:
    """Collapse consecutive identical lines into 'line (xN)'. Returns text + max repeat count."""
    out: list[str] = []
    max_count = 1
    i = 0
    while i < len(lines):
        j = i
        while j < len(lines) and lines[j] == lines[i]:
            j += 1
        count = j - i
        max_count = max(max_count, count)
        out.append(f"{lines[i]}  (x{count})" if count > 1 else lines[i])
        i = j
    return "\n".join(out), max_count


def optimize_event(event: LogEvent) -> list[dict]:
    """Normalize + optimize one raw log payload into embeddable chunks."""
    raw = event.raw.strip()
    if not raw:
        return []

    blocks: list[str] = []

    # JSON sources (e.g. CloudTrail): one chunk per record.
    if raw[0] in "[{":
        try:
            parsed = json.loads(raw)
            records = parsed.get("Records", []) if isinstance(parsed, dict) else parsed
            if isinstance(records, list) and records:
                blocks = [json.dumps(r, separators=(",", ": ")) for r in records]
        except (json.JSONDecodeError, AttributeError):
            blocks = []

    # Text sources: split on blank lines into coherent blocks.
    if not blocks:
        blocks = [b for b in re.split(r"\n\s*\n", raw) if b.strip()]

    base_time = parse_time(event.timestamp)
    chunks: list[dict] = []
    for block in blocks:
        lines = [ln.rstrip() for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        content, repeats = collapse_duplicates(lines)
        # cap oversized chunks so one embedding stays coherent
        if len(content) > 4000:
            content = content[:4000] + "\n… (truncated)"
        chunks.append(
            {
                "source": event.source,
                "service": event.service,
                "environment": event.environment,
                "severity": event.severity or infer_severity(content),
                "event_time": base_time,
                "occurrences": repeats,
                "content": content,
            }
        )
    return chunks


async def embed(texts: list[str]) -> list[list[float]]:
    key = os.environ["AI_GATEWAY_API_KEY"]
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            GATEWAY_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": EMBED_MODEL, "input": texts},
        )
        resp.raise_for_status()
        data = resp.json()["data"]
    return [item["embedding"] for item in data]


def to_vector(values: list[float]) -> str:
    return "[" + ",".join(str(v) for v in values) + "]"


# ---------- endpoints ----------


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/optimize")
async def optimize(req: IngestRequest) -> dict:
    all_chunks: list[dict] = []
    for event in req.events:
        all_chunks.extend(optimize_event(event))

    if not all_chunks:
        return {"received": len(req.events), "chunks_stored": 0}

    vectors = await embed([c["content"] for c in all_chunks])

    p = await get_pool()
    async with p.acquire() as conn:
        async with conn.transaction():
            for chunk, vec in zip(all_chunks, vectors):
                await conn.execute(
                    """
                    INSERT INTO log_chunks
                      (source, service, environment, severity, event_time,
                       occurrences, first_seen, last_seen, content, embedding)
                    VALUES ($1,$2,$3,$4,$5,$6,$5,$5,$7,$8::vector)
                    """,
                    chunk["source"],
                    chunk["service"],
                    chunk["environment"],
                    chunk["severity"],
                    chunk["event_time"],
                    chunk["occurrences"],
                    chunk["content"],
                    to_vector(vec),
                )

    return {"received": len(req.events), "chunks_stored": len(all_chunks)}


@app.post("/search")
async def search(req: SearchRequest) -> dict:
    qvec = to_vector((await embed([req.query]))[0])

    conditions: list[str] = []
    params: list = [qvec]
    if req.service:
        params.append(req.service)
        conditions.append(f"service = ${len(params)}")
    if req.environment:
        params.append(req.environment)
        conditions.append(f"environment = ${len(params)}")
    if req.start_time:
        params.append(parse_time(req.start_time))
        conditions.append(f"event_time >= ${len(params)}")
    if req.end_time:
        params.append(parse_time(req.end_time))
        conditions.append(f"event_time <= ${len(params)}")

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.append(max(1, min(req.limit, 20)))

    query = f"""
        SELECT source, service, environment, severity, event_time, occurrences,
               content, 1 - (embedding <=> $1::vector) AS similarity
        FROM log_chunks
        {where}
        ORDER BY embedding <=> $1::vector
        LIMIT ${len(params)}
    """

    p = await get_pool()
    rows = await p.fetch(query, *params)

    results = [
        {
            "source": r["source"],
            "service": r["service"],
            "environment": r["environment"],
            "severity": r["severity"],
            "event_time": r["event_time"].isoformat() if r["event_time"] else None,
            "occurrences": r["occurrences"],
            "content": r["content"],
            "similarity": round(float(r["similarity"]), 4),
        }
        for r in rows
    ]
    return {"query": req.query, "results": results}
