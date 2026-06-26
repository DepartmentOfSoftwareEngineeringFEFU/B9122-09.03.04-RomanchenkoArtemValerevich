import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"

const activities = [
  {
    id: 1,
    type: "success",
    message: "Исполнен ордер на покупку BTC/USDT",
    time: "10:42",
  },
  {
    id: 2,
    type: "warning",
    message: "Обновлён Stop Loss для ETH/USDT",
    time: "09:15",
  },
  {
    id: 3,
    type: "error",
    message: "Ошибка подключения: OKX API",
    time: "08:30",
  },
  {
    id: 4,
    type: "success",
    message: "Стратегия 'Scalping V2' запущена",
    time: "Вчера",
  },
]

export function RecentActivity() {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
      <CardHeader>
        <CardTitle>Последние события</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 mt-0.5">
                {activity.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                {activity.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                {activity.type === "error" && <XCircle className="h-5 w-5 text-red-500" />}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight text-foreground line-clamp-2">{activity.message}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
