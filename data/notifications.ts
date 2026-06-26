import type { Notification } from "@/types"

export const notifications: Notification[] = [
  {
    id: "notif-001",
    title: "Новый сигнал BUY BTC/USDT",
    message: "LSTM Scalper обнаружил сильный сигнал на покупку (уверенность 85%).",
    type: "success",
    timestamp: "2 мин назад",
    read: false,
    actionUrl: "/dashboard/market/btc",
  },
  {
    id: "notif-002",
    title: "Соединение с API потеряно",
    message: "Соединение с OKX API было прервано. Повторное подключение...",
    type: "error",
    timestamp: "1 час назад",
    read: false,
    actionUrl: "/dashboard/settings",
  },
  {
    id: "notif-003",
    title: "Стратегия обновлена",
    message: "Параметры стратегии Sentiment Filter были автоматически обновлены.",
    type: "info",
    timestamp: "3 часа назад",
    read: true,
    actionUrl: "/dashboard/strategies/sentiment-filter",
  },
  {
    id: "notif-004",
    title: "Ордер исполнен",
    message: "Покупка 0.15 BTC по цене $42,150.00 успешно выполнена.",
    type: "success",
    timestamp: "5 часов назад",
    read: true,
    actionUrl: "/dashboard/operations",
  },
  {
    id: "notif-005",
    title: "Достигнут Stop-Loss",
    message: "Позиция XRP/USDT закрыта по Stop-Loss. Убыток: -$12.50",
    type: "warning",
    timestamp: "1 день назад",
    read: true,
    actionUrl: "/dashboard/operations",
  },
]

export const getUnreadNotifications = (): Notification[] => {
  return notifications.filter((n) => !n.read)
}
