from __future__ import annotations

import os
from datetime import datetime, timedelta

import requests
from airflow import DAG
from airflow.operators.python import PythonOperator


BACKEND_URL = os.getenv("BACKEND_URL", "http://host.docker.internal:3000")
INTERNAL_TOKEN = os.getenv("INTERNAL_JOBS_TOKEN", "replace-with-env-or-airflow-variable")


def call_backend(path: str, payload: dict):
    response = requests.post(
        f"{BACKEND_URL}{path}",
        json=payload,
        headers={"X-Internal-Jobs-Token": INTERNAL_TOKEN},
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()

    if not data.get("success"):
        raise RuntimeError(data.get("error", "Backend job failed"))

    return data


def sync_market_data():
    return call_backend(
        "/api/internal/jobs/market-sync",
        {
            "symbol": "BTC-USDT",
            "timeframe": "1D",
            "limit": 200,
        },
    )


def run_forecast():
    return call_backend(
        "/api/internal/jobs/forecast-run",
        {
            "symbol": "BTC-USDT",
        },
    )


default_args = {
    "owner": "algotrade",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}


with DAG(
    dag_id="daily_btc_lstm_forecast",
    start_date=datetime(2026, 1, 1),
    schedule_interval="10 0 * * *",
    catchup=False,
    default_args=default_args,
    tags=["crypto", "lstm", "okx"],
) as dag:
    sync_task = PythonOperator(
        task_id="sync_btc_usdt_1d_market_data",
        python_callable=sync_market_data,
    )

    forecast_task = PythonOperator(
        task_id="run_btc_usdt_lstm_forecast",
        python_callable=run_forecast,
    )

    sync_task >> forecast_task
