CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "login" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "api_credentials" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "api_key" TEXT NOT NULL,
  "secret_key_encrypted" TEXT NOT NULL,
  "passphrase_encrypted" TEXT NOT NULL,
  "is_demo" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_credentials_user_id_is_demo_key" UNIQUE ("user_id", "is_demo")
);

CREATE TABLE "cryptocurrencies" (
  "id" SERIAL PRIMARY KEY,
  "ticker" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "asset_type" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "market_data" (
  "id" SERIAL PRIMARY KEY,
  "crypto_id" INTEGER NOT NULL REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE,
  "ts" TIMESTAMP(3) NOT NULL,
  "open" DECIMAL(24,10) NOT NULL,
  "high" DECIMAL(24,10) NOT NULL,
  "low" DECIMAL(24,10) NOT NULL,
  "close" DECIMAL(24,10) NOT NULL,
  "volume" DECIMAL(24,10) NOT NULL,
  "source" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_data_crypto_id_ts_key" UNIQUE ("crypto_id", "ts")
);

CREATE INDEX "market_data_crypto_id_ts_idx" ON "market_data"("crypto_id", "ts");

CREATE TABLE "indicators" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "indicator_values" (
  "id" SERIAL PRIMARY KEY,
  "indicator_id" INTEGER NOT NULL REFERENCES "indicators"("id") ON DELETE CASCADE,
  "crypto_id" INTEGER NOT NULL REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE,
  "ts" TIMESTAMP(3) NOT NULL,
  "value" DECIMAL(24,10) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "indicator_values_indicator_id_crypto_id_ts_key" UNIQUE ("indicator_id", "crypto_id", "ts")
);

CREATE TABLE "models" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "version" TEXT,
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "forecasts" (
  "id" SERIAL PRIMARY KEY,
  "model_id" INTEGER NOT NULL REFERENCES "models"("id"),
  "crypto_id" INTEGER NOT NULL REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE,
  "ts" TIMESTAMP(3) NOT NULL,
  "last_close" DECIMAL(24,10) NOT NULL,
  "predicted_log_return" DECIMAL(24,12) NOT NULL,
  "predicted_close" DECIMAL(24,10) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "forecasts_crypto_id_ts_idx" ON "forecasts"("crypto_id", "ts");

CREATE TABLE "strategy_settings" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "crypto_id" INTEGER NOT NULL REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE,
  "window_size" INTEGER NOT NULL DEFAULT 30,
  "horizon" INTEGER NOT NULL DEFAULT 1,
  "timeframe" TEXT NOT NULL DEFAULT '1D',
  "noise_threshold" DECIMAL(12,8) NOT NULL DEFAULT 0.002,
  "stop_loss_pct" DECIMAL(12,8) NOT NULL DEFAULT 0.02,
  "take_profit_pct" DECIMAL(12,8) NOT NULL DEFAULT 0.04,
  "max_operation_amount" DECIMAL(24,10) NOT NULL DEFAULT 1000,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "strategy_settings_user_id_crypto_id_idx" ON "strategy_settings"("user_id", "crypto_id");

CREATE TABLE "trade_decisions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "crypto_id" INTEGER NOT NULL REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE,
  "forecast_id" INTEGER NOT NULL REFERENCES "forecasts"("id") ON DELETE CASCADE,
  "strategy_settings_id" INTEGER NOT NULL REFERENCES "strategy_settings"("id"),
  "ts" TIMESTAMP(3) NOT NULL,
  "decision_type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "risk_check_status" TEXT NOT NULL,
  "no_operation_reason" TEXT,
  "predicted_log_return" DECIMAL(24,12) NOT NULL,
  "predicted_close" DECIMAL(24,10) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "trade_decisions_user_id_crypto_id_ts_idx" ON "trade_decisions"("user_id", "crypto_id", "ts");

CREATE TABLE "trade_operations" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "crypto_id" INTEGER NOT NULL REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE,
  "decision_id" INTEGER NOT NULL REFERENCES "trade_decisions"("id") ON DELETE CASCADE,
  "ts" TIMESTAMP(3) NOT NULL,
  "order_type" TEXT NOT NULL,
  "side" TEXT NOT NULL,
  "price" DECIMAL(24,10) NOT NULL,
  "amount" DECIMAL(24,10) NOT NULL,
  "stop_loss_price" DECIMAL(24,10),
  "take_profit_price" DECIMAL(24,10),
  "status" TEXT NOT NULL,
  "okx_order_id" TEXT,
  "okx_response_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "trade_operations_user_id_crypto_id_ts_idx" ON "trade_operations"("user_id", "crypto_id", "ts");
