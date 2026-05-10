-- DropForeignKey
ALTER TABLE "api_credentials" DROP CONSTRAINT "api_credentials_user_id_fkey";

-- DropForeignKey
ALTER TABLE "forecasts" DROP CONSTRAINT "forecasts_crypto_id_fkey";

-- DropForeignKey
ALTER TABLE "forecasts" DROP CONSTRAINT "forecasts_model_id_fkey";

-- DropForeignKey
ALTER TABLE "indicator_values" DROP CONSTRAINT "indicator_values_crypto_id_fkey";

-- DropForeignKey
ALTER TABLE "indicator_values" DROP CONSTRAINT "indicator_values_indicator_id_fkey";

-- DropForeignKey
ALTER TABLE "market_data" DROP CONSTRAINT "market_data_crypto_id_fkey";

-- DropForeignKey
ALTER TABLE "strategy_settings" DROP CONSTRAINT "strategy_settings_crypto_id_fkey";

-- DropForeignKey
ALTER TABLE "strategy_settings" DROP CONSTRAINT "strategy_settings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_decisions" DROP CONSTRAINT "trade_decisions_crypto_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_decisions" DROP CONSTRAINT "trade_decisions_forecast_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_decisions" DROP CONSTRAINT "trade_decisions_strategy_settings_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_decisions" DROP CONSTRAINT "trade_decisions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_operations" DROP CONSTRAINT "trade_operations_crypto_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_operations" DROP CONSTRAINT "trade_operations_decision_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_operations" DROP CONSTRAINT "trade_operations_user_id_fkey";

-- AlterTable
ALTER TABLE "api_credentials" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "models" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "strategy_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "trade_operations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_data" ADD CONSTRAINT "market_data_crypto_id_fkey" FOREIGN KEY ("crypto_id") REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_indicator_id_fkey" FOREIGN KEY ("indicator_id") REFERENCES "indicators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_crypto_id_fkey" FOREIGN KEY ("crypto_id") REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_crypto_id_fkey" FOREIGN KEY ("crypto_id") REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_settings" ADD CONSTRAINT "strategy_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_settings" ADD CONSTRAINT "strategy_settings_crypto_id_fkey" FOREIGN KEY ("crypto_id") REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_decisions" ADD CONSTRAINT "trade_decisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_decisions" ADD CONSTRAINT "trade_decisions_crypto_id_fkey" FOREIGN KEY ("crypto_id") REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_decisions" ADD CONSTRAINT "trade_decisions_forecast_id_fkey" FOREIGN KEY ("forecast_id") REFERENCES "forecasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_decisions" ADD CONSTRAINT "trade_decisions_strategy_settings_id_fkey" FOREIGN KEY ("strategy_settings_id") REFERENCES "strategy_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_operations" ADD CONSTRAINT "trade_operations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_operations" ADD CONSTRAINT "trade_operations_crypto_id_fkey" FOREIGN KEY ("crypto_id") REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_operations" ADD CONSTRAINT "trade_operations_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "trade_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
