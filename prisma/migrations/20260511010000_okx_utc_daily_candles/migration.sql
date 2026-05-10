ALTER TABLE "market_data" ADD COLUMN "timeframe" TEXT NOT NULL DEFAULT '1D';
ALTER TABLE "market_data" ADD COLUMN "source_bar" TEXT NOT NULL DEFAULT '1D';
ALTER TABLE "market_data" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

UPDATE "market_data"
SET
  "source_bar" = CASE
    WHEN "source" = 'okx:1D' THEN '1D'
    WHEN "source" = 'okx:1Dutc' THEN '1Dutc'
    ELSE "source_bar"
  END,
  "timezone" = CASE
    WHEN "source" = 'okx:1D' THEN 'Asia/Hong_Kong'
    WHEN "source" = 'okx:1Dutc' THEN 'UTC'
    ELSE "timezone"
  END,
  "source" = CASE
    WHEN "source" LIKE 'okx:%' THEN 'OKX'
    ELSE "source"
  END;

DELETE FROM "market_data"
WHERE "source" = 'OKX'
  AND "timeframe" = '1D'
  AND "source_bar" = '1D'
  AND "timezone" = 'Asia/Hong_Kong';

ALTER TABLE "market_data" DROP CONSTRAINT IF EXISTS "market_data_crypto_id_ts_key";

CREATE UNIQUE INDEX "market_data_crypto_id_timeframe_source_source_bar_ts_key"
  ON "market_data"("crypto_id", "timeframe", "source", "source_bar", "ts");

CREATE INDEX "market_data_crypto_id_timeframe_source_source_bar_ts_idx"
  ON "market_data"("crypto_id", "timeframe", "source", "source_bar", "ts");
