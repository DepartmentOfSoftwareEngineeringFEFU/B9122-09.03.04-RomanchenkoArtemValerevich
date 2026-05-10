# Backend Runbook

## 1. Env Variables

Create `.env` or export these variables in the shell before running the backend:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crypto_trading"
AUTH_JWT_SECRET="replace-with-long-random-secret"
OKX_CREDENTIALS_ENCRYPTION_KEY="replace-with-32-byte-or-long-random-secret"
OKX_BASE_URL="https://www.okx.com"
OKX_TIMEOUT_MS="10000"
LSTM_MODEL_PATH="models/lstm-btc-usdt.onnx"
LSTM_PREPROCESSOR_PATH="models/lstm-btc-usdt-scaler.json"
```

Optional seed user variables:

```bash
SEED_USER_LOGIN="demo"
SEED_USER_EMAIL="demo@algotrade.local"
SEED_USER_PASSWORD="demo1234"
```

## 2. DB Setup

Local PostgreSQL example with Docker:

```bash
docker run --name crypto-trading-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=crypto_trading \
  -p 5432:5432 \
  -d postgres:16
```

For an existing PostgreSQL instance, set `DATABASE_URL` to the real connection string.

## 3. Prisma Migrate And Seed

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Seed creates:

- `BTC-USDT` with `slug=btc-usdt`;
- LSTM model metadata only, without mock forecasts;
- indicator metadata;
- a dev user and default `strategy_settings` for BTC-USDT.

## 4. Test Commands

```bash
pnpm exec tsc --noEmit
npm run lint
pnpm test
npm run build
```

## 5. ONNX Model

Default path:

```text
models/lstm-btc-usdt.onnx
```

Override with:

```bash
LSTM_MODEL_PATH="path/to/model.onnx"
```

If the file is missing, `POST /api/forecast/btc-usdt/run` returns `success=false` with a readable error.

## 6. Scaler / Preprocessor JSON

Default path:

```text
models/lstm-btc-usdt-scaler.json
```

Expected schema:
The numeric arrays below illustrate required lengths; in production they must come from the trained preprocessor artifact.

```json
{
  "version": 1,
  "window_size": 30,
  "horizon": 1,
  "timeframe": "1D",
  "features": [
    "close",
    "volume",
    "ema_12",
    "ema_26",
    "macd",
    "macd_signal",
    "macd_hist",
    "rsi",
    "bb_mid",
    "bb_upper",
    "bb_lower",
    "bb_width",
    "ret_1",
    "logret_1",
    "range_hl",
    "body_co",
    "vol_7",
    "vol_14",
    "dow"
  ],
  "x_scaler": {
    "method": "standard",
    "mean": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "std": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  },
  "y_scaler": {
    "method": "standard",
    "mean": [0],
    "std": [1]
  }
}
```

Contract summary:

- `features_count = 19`
- `window_size = 30`
- `timeframe = 1D`
- model input tensor is `[1, 30, 19]`
- model output is scaled `predicted_log_return`
- backend must restore `predicted_log_return` through `y_scaler` before calculating `predicted_close`

Only `standard` scalers are accepted. `x_scaler.mean/std` must have length 19, `y_scaler.mean/std` must have length 1, values must be finite, and `std` cannot contain 0.

## 7. Smoke Test Flow

Run the app:

```bash
pnpm dev
```

Use a cookie jar so auth persists between requests:

```bash
curl -i -c cookies.txt -b cookies.txt \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"smoke\",\"email\":\"smoke@example.com\",\"password\":\"demo1234\"}" \
  http://localhost:3000/api/auth/register

curl -i -c cookies.txt -b cookies.txt \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"smoke\",\"password\":\"demo1234\"}" \
  http://localhost:3000/api/auth/login

curl -b cookies.txt http://localhost:3000/api/auth/me
```

OKX credentials and status:

```bash
curl -i -b cookies.txt -X PUT \
  -H "Content-Type: application/json" \
  -d "{\"api_key\":\"...\",\"secret_key\":\"...\",\"passphrase\":\"...\"}" \
  http://localhost:3000/api/okx/credentials

curl -i -b cookies.txt -X POST http://localhost:3000/api/okx/test
curl -b cookies.txt http://localhost:3000/api/okx/status
```

Market and forecast chain:

```bash
curl -i -b cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d "{\"timeframe\":\"1D\",\"limit\":100}" \
  http://localhost:3000/api/market/btc-usdt/sync

curl -b cookies.txt http://localhost:3000/api/market/btc-usdt/candles
curl -b cookies.txt http://localhost:3000/api/market/btc-usdt/indicators
curl -i -b cookies.txt -X POST http://localhost:3000/api/forecast/btc-usdt/run
curl -b cookies.txt http://localhost:3000/api/trade-decisions/latest
curl -b cookies.txt http://localhost:3000/api/operations
curl -b cookies.txt http://localhost:3000/api/reports/summary
```

Negative checks to run before acceptance:

- missing ONNX file;
- missing scaler/preprocessor file;
- invalid scaler contract;
- fewer candles than `window_size`;
- OKX timeout;
- missing credentials;
- forecast decision `удержание`, where operation must remain `null`.

Security checks:

- API responses must not include `password_hash`;
- API responses must not include raw `secret_key` or `passphrase`;
- OKX trading requests must include `x-simulated-trading: 1`.
