ALTER TABLE "strategy_settings"
  ALTER COLUMN "noise_threshold" SET DEFAULT 0.001,
  ALTER COLUMN "stop_loss_pct" SET DEFAULT 0.03,
  ALTER COLUMN "take_profit_pct" SET DEFAULT 0.06;
