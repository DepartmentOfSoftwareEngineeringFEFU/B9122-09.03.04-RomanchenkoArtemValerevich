CREATE TABLE "order_book_snapshots" (
  "id" SERIAL NOT NULL,
  "crypto_id" INTEGER NOT NULL,
  "symbol" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "snapshot_ts" TIMESTAMP(3) NOT NULL,
  "last_price" DECIMAL(24,10),
  "mid_price" DECIMAL(24,10),
  "sanity_diff_pct" DECIMAL(18,12),
  "asks_json" JSONB NOT NULL,
  "bids_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_book_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_book_snapshots_crypto_id_snapshot_ts_idx"
  ON "order_book_snapshots"("crypto_id", "snapshot_ts");

ALTER TABLE "order_book_snapshots"
  ADD CONSTRAINT "order_book_snapshots_crypto_id_fkey"
  FOREIGN KEY ("crypto_id") REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
