ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "metadata_json" JSONB;

ALTER TABLE "strategy_settings" ALTER COLUMN "window_size" SET DEFAULT 30;
ALTER TABLE "strategy_settings" ALTER COLUMN "timeframe" SET DEFAULT '1D';
ALTER TABLE "strategy_settings" ALTER COLUMN "max_operation_amount" SET DEFAULT 1000;
