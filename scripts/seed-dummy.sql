-- Dummy data for local testing (log_chunks + incidents).
--
-- Scenario: orders-api (prod) enters CrashLoopBackOff because a KMS key policy
-- change removed kms:Decrypt for the orders-api IRSA role. RDS is healthy (red
-- herring). payments-api (staging) only has warnings, below the incident threshold.
--
-- Timestamps are relative to now() so incident detection (created_at within
-- 6h) and the dashboard's "last seen" look recent.
--
-- Embeddings are inserted as RANDOM 1536-dim placeholders. Replace them right
-- after loading with scripts/embed-dummy.mjs (local demo embeddings when
-- AI_DEMO_MODE=true, real ones otherwise) or search results are meaningless.
--
-- Run:
--   docker exec -i coworklog-pgvector psql -U admin -d coworklog < scripts/seed-dummy.sql
--   node --experimental-strip-types --env-file=.env.local scripts/embed-dummy.mjs

BEGIN;

-- Uncomment to start from empty tables:
-- TRUNCATE log_chunks, incidents RESTART IDENTITY;

INSERT INTO log_chunks (source, service, environment, severity, event_time, content, embedding)
SELECT
  v.source,
  v.service,
  v.environment,
  v.severity,
  now() - v.ago,
  v.content,
  -- Referencing v.content makes the subquery correlated, so every row gets
  -- its own random vector instead of one shared value.
  (SELECT array_agg(random()) FROM generate_series(1, 1536) WHERE v.content IS NOT NULL)::vector(1536)
FROM (VALUES
  -- ---------------- orders-api / prod : the real incident ----------------
  ('k8s', 'orders-api', 'prod', 'info',  interval '40 minutes',
   '2026-07-10T02:05:11Z Normal ScalingReplicaSet deployment/orders-api Scaled up replica set orders-api-7c9f8b6d5f to 6 (rollout of image v2.8.4)'),
  ('aws', 'orders-api', 'prod', 'info',  interval '35 minutes',
   '{"eventSource":"kms.amazonaws.com","eventName":"PutKeyPolicy","userIdentity":{"arn":"arn:aws:iam::480129847221:user/platform-bot"},"requestParameters":{"keyId":"4a1e9c33-7b2d-4f6e-9c1a-2d8f5b6e7a90","policyName":"default"}}'),
  ('k8s', 'orders-api', 'prod', 'warn',  interval '30 minutes',
   'WARN  [db] pool warm-up: attempt 1 to orders-db.cluster-cxy7.us-east-1.rds.amazonaws.com:5432 timed out after 2000ms'),
  ('k8s', 'orders-api', 'prod', 'error', interval '28 minutes',
   'ERROR [secrets] failed to decrypt secret value: KmsException: User: arn:aws:sts::480129847221:assumed-role/orders-api-irsa/orders-api-7c9f8b6d5f-nqx2p is not authorized to perform: kms:Decrypt on resource: arn:aws:kms:us-east-1:480129847221:key/4a1e9c33-7b2d-4f6e-9c1a-2d8f5b6e7a90'),
  ('aws', 'orders-api', 'prod', 'error', interval '28 minutes',
   '{"eventSource":"kms.amazonaws.com","eventName":"Decrypt","errorCode":"AccessDenied","errorMessage":"User is not authorized to perform kms:Decrypt","userIdentity":{"arn":"arn:aws:sts::480129847221:assumed-role/orders-api-irsa/orders-api-7c9f8b6d5f-nqx2p"}}'),
  ('k8s', 'orders-api', 'prod', 'error', interval '27 minutes',
   'ERROR [startup] fatal: unable to load DB credentials from prod/orders/db-credentials, exiting with exit code 1'),
  ('k8s', 'orders-api', 'prod', 'warn',  interval '25 minutes',
   'Warning Unhealthy pod/orders-api-7c9f8b6d5f-nqx2p Readiness probe failed: connection refused'),
  ('k8s', 'orders-api', 'prod', 'error', interval '22 minutes',
   'Warning BackOff pod/orders-api-7c9f8b6d5f-nqx2p Back-off restarting failed container orders-api (CrashLoopBackOff)'),
  ('aws', 'orders-api', 'prod', 'error', interval '20 minutes',
   '{"eventSource":"kms.amazonaws.com","eventName":"Decrypt","errorCode":"AccessDenied","errorMessage":"User is not authorized to perform kms:Decrypt","userIdentity":{"arn":"arn:aws:sts::480129847221:assumed-role/orders-api-irsa/orders-api-7c9f8b6d5f-8dk4w"}}'),
  ('k8s', 'orders-api', 'prod', 'error', interval '18 minutes',
   'Warning BackOff pod/orders-api-7c9f8b6d5f-8dk4w Back-off restarting failed container orders-api (CrashLoopBackOff), restart count 7'),
  ('aws', 'orders-db',  'prod', 'info',  interval '15 minutes',
   'RDS orders-db-instance-1 CPUUtilization 23% DatabaseConnections 188 FreeableMemory 6.1 GB - no failover, no reboot, no maintenance in window'),

  -- ---------------- payments-api / staging : warnings only ----------------
  ('k8s', 'payments-api', 'staging', 'warn', interval '50 minutes',
   'WARN  [http] upstream fraud-check responded slowly (1840ms), retry 1/3'),
  ('k8s', 'payments-api', 'staging', 'warn', interval '45 minutes',
   'WARN  [http] upstream fraud-check throttled (HTTP 429), backoff 500ms'),
  ('k8s', 'payments-api', 'staging', 'info', interval '44 minutes',
   'INFO  [http] fraud-check call succeeded after retry, latency 420ms'),

  -- ---------------- web / prod : healthy traffic ----------------
  ('web', 'storefront', 'prod', 'info', interval '10 minutes',
   'GET /checkout 200 312ms user-agent=Mozilla/5.0 region=us-east-1'),
  ('web', 'storefront', 'prod', 'warn', interval '8 minutes',
   'POST /api/orders 503 12ms upstream=orders-api retry-after=5')
) AS v(source, service, environment, severity, ago, content);

INSERT INTO incidents
  (signature, service, environment, sources, severity, status, title, summary,
   error_count, warn_count, sample_log, first_seen, last_seen)
VALUES
  ('orders-api|prod', 'orders-api', 'prod', ARRAY['k8s', 'aws'], 'error', 'open',
   'orders-api CrashLoopBackOff from KMS AccessDenied',
   'orders-api pods crash on startup because the IRSA role can no longer kms:Decrypt the DB credentials secret after a key policy change.',
   6, 2,
   'ERROR [secrets] failed to decrypt secret value: KmsException: ... is not authorized to perform: kms:Decrypt',
   now() - interval '28 minutes', now() - interval '18 minutes'),
  ('checkout-worker|prod', 'checkout-worker', 'prod', ARRAY['k8s'], 'warn', 'resolved',
   'checkout-worker queue lag spike',
   'SQS consumer lag briefly exceeded threshold during a deploy and recovered without intervention.',
   3, 5,
   'ERROR [consumer] message processing failed, retrying (attempt 3/5)',
   now() - interval '5 hours', now() - interval '4 hours 30 minutes')
ON CONFLICT (signature) DO NOTHING;

COMMIT;
