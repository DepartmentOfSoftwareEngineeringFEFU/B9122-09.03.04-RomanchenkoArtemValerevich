export type OperationStatusLabel = "открыта" | "исполнена" | "отменена" | "ошибка"

export function mapOkxOrderStatus(status: unknown): OperationStatusLabel {
  switch (String(status ?? "").toLowerCase()) {
    case "live":
    case "partially_filled":
      return "открыта"
    case "filled":
      return "исполнена"
    case "canceled":
    case "cancelled":
      return "отменена"
    default:
      return "ошибка"
  }
}
