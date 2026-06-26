import type { ReferenceMaterial } from "@/types"

export const references: ReferenceMaterial[] = [
  {
    id: "lstm-guide",
    title: "LSTM Scalping",
    description: "Краткосрочное прогнозирование цен с помощью нейронных сетей",
    type: "strategies",
    category: "Strategy",
    iconName: "Brain",
    color: "blue",
    tags: ["LSTM", "Нейросети", "Скальпинг", "ML"],
    level: "Advanced",
    content:
      "Long Short-Term Memory (LSTM) — это тип рекуррентной нейронной сети (RNN), способной обучаться зависимостям порядка в задачах предсказания последовательностей.\n\nВ трейдинге LSTM используется для анализа исторических данных о ценах и прогнозирования будущих ценовых движений. В отличие от традиционных моделей, LSTM могут запоминать паттерны на протяжении длинных последовательностей данных.\n\nКлючевые компоненты:\n1. Forget Gate: Решает, какую информацию отбросить\n2. Input Gate: Решает, какие значения обновить\n3. Output Gate: Определяет выход на основе состояния ячейки\n\nПреимущества для трейдинга:\n- Захват долгосрочных зависимостей\n- Устойчивость к шуму\n- Адаптация к изменяющимся рыночным условиям",
  },
  {
    id: "prophet-guide",
    title: "Prophet Forecasting",
    description: "Прогнозирование трендов с учетом сезонности",
    type: "strategies",
    category: "Strategy",
    iconName: "TrendingUp",
    color: "blue",
    tags: ["Prophet", "Meta", "Тренды", "Сезонность"],
    level: "Intermediate",
    content:
      "Prophet — это библиотека прогнозирования временных рядов от Meta (Facebook), оптимизированная для бизнес-прогнозов.\n\nОсобенности Prophet:\n- Автоматическое обнаружение сезонности (дневная, недельная, годовая)\n- Обработка выбросов и пропущенных данных\n- Интерпретируемые компоненты модели\n\nПрименение в крипто-трейдинге:\n- Среднесрочное прогнозирование трендов (4h-1d)\n- Идентификация точек разворота\n- Комбинирование с техническими индикаторами",
  },
  {
    id: "rsi-divergence",
    title: "RSI Дивергенция",
    description: "Определение разворотов тренда с помощью моментума",
    type: "indicators",
    category: "Indicator",
    iconName: "Activity",
    color: "violet",
    tags: ["RSI", "Моментум", "Разворот", "Технический анализ"],
    level: "Intermediate",
    content:
      "RSI Дивергенция возникает, когда цена актива движется в противоположном направлении от индикатора RSI. Это часто сигнализирует о потенциальном развороте текущего тренда.\n\nБычья дивергенция:\nЦена формирует более низкие минимумы, а RSI — более высокие минимумы. Это говорит об ослаблении давления продавцов.\n\nМедвежья дивергенция:\nЦена формирует более высокие максимумы, а RSI — более низкие максимумы. Это говорит об ослаблении давления покупателей.\n\nПараметры:\n- Период RSI: обычно 14\n- Уровни перекупленности/перепроданности: 70/30",
  },
  {
    id: "macd-signals",
    title: "MACD Сигналы",
    description: "Схождение/расхождение скользящих средних",
    type: "indicators",
    category: "Indicator",
    iconName: "Activity",
    color: "violet",
    tags: ["MACD", "EMA", "Тренд", "Моментум"],
    level: "Beginner",
    content:
      "MACD (Moving Average Convergence Divergence) — один из самых популярных трендовых индикаторов.\n\nКомпоненты:\n- MACD Line: EMA(12) - EMA(26)\n- Signal Line: EMA(9) от MACD Line\n- Histogram: MACD Line - Signal Line\n\nСигналы:\n1. Пересечение MACD и Signal Line\n2. Пересечение нулевой линии\n3. Дивергенция с ценой\n\nНастройки по умолчанию: 12, 26, 9",
  },
  {
    id: "position-sizing",
    title: "Размер позиции",
    description: "Критерий Келли и фиксированный фракционный метод",
    type: "risk",
    category: "Risk",
    iconName: "AlertTriangle",
    color: "orange",
    tags: ["Риск-менеджмент", "Критерий Келли", "Управление капиталом"],
    level: "Advanced",
    content:
      "Правильный размер позиции критически важен для долгосрочного выживания в трейдинге.\n\nКритерий Келли:\nf* = (bp - q) / b\n\nГде:\nf* — доля капитала для ставки\nb — коэффициент выигрыша\np — вероятность выигрыша\nq — вероятность проигрыша (1 - p)\n\nНа практике трейдеры часто используют 'Half Kelly' или фиксированный фракционный метод (1-2% от капитала на сделку) для снижения волатильности.\n\nПравило 2%:\n- Максимальный риск на сделку: 2% от депозита\n- Расчет размера позиции: (Капитал × 0.02) / Stop-Loss в пунктах",
  },
  {
    id: "stop-loss-strategies",
    title: "Стратегии Stop-Loss",
    description: "Методы защиты капитала и фиксации прибыли",
    type: "risk",
    category: "Risk",
    iconName: "AlertTriangle",
    color: "orange",
    tags: ["Stop-Loss", "Take-Profit", "Trailing Stop", "Защита"],
    level: "Beginner",
    content:
      "Stop-Loss — это ордер на автоматическое закрытие позиции при достижении определенного уровня убытка.\n\nТипы Stop-Loss:\n1. Фиксированный: установка на определенном расстоянии от входа\n2. ATR-based: на основе волатильности (обычно 2-3 ATR)\n3. Структурный: за уровнями поддержки/сопротивления\n4. Trailing Stop: следует за ценой на фиксированном расстоянии\n\nСоотношение Risk/Reward:\n- Минимальное рекомендуемое: 1:2\n- Оптимальное: 1:3 или выше",
  },
  {
    id: "btc-fundamentals",
    title: "Фундаментал Bitcoin",
    description: "On-chain метрики и циклы халвинга",
    type: "crypto",
    category: "Crypto",
    iconName: "BookOpen",
    color: "emerald",
    tags: ["Bitcoin", "On-chain", "Халвинг", "Фундаментал"],
    level: "Beginner",
    content:
      "Фундаментальный анализ Bitcoin включает изучение on-chain метрик, отражающих здоровье и использование сети.\n\nКлючевые метрики:\n- Hash Rate: Общая вычислительная мощность сети\n- Active Addresses: Количество активных адресов\n- Transaction Volume: Общий объем транзакций\n- NVT Ratio: Стоимость сети к транзакциям (аналог P/E)\n- MVRV: Отношение рыночной к реализованной стоимости\n\nЦикл халвинга:\nКаждые ~4 года награда за блок уменьшается вдвое, сокращая эмиссию. Исторически это приводило к бычьим циклам.",
  },
  {
    id: "sentiment-analysis",
    title: "Анализ настроений",
    description: "NLP для анализа рыночных настроений",
    type: "ml",
    category: "ML",
    iconName: "Brain",
    color: "emerald",
    tags: ["NLP", "Sentiment", "Twitter", "Новости"],
    level: "Intermediate",
    content:
      "Анализ настроений (Sentiment Analysis) использует NLP для определения эмоциональной окраски текстов о криптовалютах.\n\nИсточники данных:\n- Twitter/X: Посты с хэштегами $BTC, $ETH\n- Reddit: r/cryptocurrency, r/bitcoin\n- Новостные агрегаторы\n- Telegram каналы\n\nМетоды:\n1. Лексический анализ (словари тональности)\n2. ML-модели (BERT, RoBERTa)\n3. Fear & Greed Index\n\nПрименение:\n- Фильтрация ложных сигналов\n- Определение экстремумов настроений\n- Раннее обнаружение новостей",
  },
]

export const getReferencesByCategory = (category: string): ReferenceMaterial[] => {
  if (category === "all") return references
  return references.filter((r) => r.type === category.toLowerCase())
}
