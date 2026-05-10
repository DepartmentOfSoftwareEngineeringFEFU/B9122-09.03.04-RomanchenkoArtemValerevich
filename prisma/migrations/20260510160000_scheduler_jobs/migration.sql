ALTER TABLE "forecasts" ADD COLUMN "run_source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "trade_decisions" ADD COLUMN "run_source" TEXT NOT NULL DEFAULT 'manual';

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "decision_id"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS rn
  FROM "trade_operations"
)
DELETE FROM "trade_operations"
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "forecast_id"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS rn
  FROM "trade_decisions"
)
DELETE FROM "trade_decisions"
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "model_id", "crypto_id", "ts"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS rn
  FROM "forecasts"
)
DELETE FROM "forecasts"
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "forecasts_model_id_crypto_id_ts_key" ON "forecasts"("model_id", "crypto_id", "ts");
CREATE UNIQUE INDEX "trade_decisions_forecast_id_key" ON "trade_decisions"("forecast_id");
CREATE UNIQUE INDEX "trade_operations_decision_id_key" ON "trade_operations"("decision_id");

CREATE TABLE "job_runs" (
  "id" SERIAL NOT NULL,
  "job_name" TEXT NOT NULL,
  "symbol" TEXT,
  "timeframe" TEXT,
  "run_source" TEXT NOT NULL DEFAULT 'system',
  "status" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "error_message" TEXT,
  "created_forecast_id" INTEGER,
  "created_decision_id" INTEGER,
  "created_operation_id" INTEGER,
  "metadata_json" JSONB,

  CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_runs_job_name_started_at_idx" ON "job_runs"("job_name", "started_at");
CREATE INDEX "job_runs_status_started_at_idx" ON "job_runs"("status", "started_at");
