# Разработка программного обеспечения для автоматизации торговли на криптобирже OKX.

## Возможности

- Регистрация и вход в аккаунт.
- Кабинет с торговыми решениями, последними операциями и индикаторами.
- Анализ spot/futures инструментов, графиков, OHLCV-данных и стакана.
- Страницы торговых стратегий на базе LSTM, EMA, MACD, RSI и полос Боллинджера.
- История операций и аналитические отчёты.
- Настройки для ввода, проверки и удаления учётных данных OKX API.

## Технологии

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui и Radix UI
- Recharts
- pnpm

## Структура проекта

```text
app/                    Маршруты Next.js App Router
app/api/                Локальные API-роуты для auth, market, operations, OKX
components/             UI-компоненты, layout, провайдеры и виджеты страниц
components/ui/          Базовые компоненты shadcn/ui
data/                   Mock-данные рынка, операций, стратегий и сигналов
hooks/                  React-хуки
lib/api/                Клиентские обёртки для вызова API
public/                 Изображения, иконки и статические файлы
types/                  Общие TypeScript-типы UI и API
```

## Быстрый старт

Установите зависимости:

```bash
pnpm install
```

Запустите dev-сервер:

```bash
pnpm dev
```

Откройте приложение:

```text
http://localhost:3000
```

Для входа можно использовать:

```text
Логин: demo
Пароль: demo1234
```

## Скрипты

```bash
pnpm dev      # запуск проекта в режиме разработки
pnpm build    # production-сборка Next.js
pnpm start    # запуск production-сборки
pnpm lint     # проверка ESLint
```

## Основные маршруты

```text
/                          Лендинг
/about                     Информационная страница
/login                     Авторизация
/register                  Регистрация
/register/success          Успешная регистрация
/dashboard                 Главная панель
/dashboard/market          Анализ рынка
/dashboard/market/[symbol] Детальная страница инструмента
/dashboard/strategies      Торговые стратегии
/dashboard/strategies/[id] Детальная страница стратегии
/dashboard/operations      История операций
/dashboard/analytics       Отчёты
/dashboard/reference       Справочник
/dashboard/settings        Настройки OKX API
```

## Ручки

```text
POST   /api/auth/login          Демо-авторизация
POST   /api/auth/register       Демо-регистрация
POST   /api/auth/logout         Выход
GET    /api/market              Список инструментов с фильтрами
GET    /api/operations          Список операций с фильтрами
GET    /api/strategies          Список стратегий
GET    /api/okx/credentials     Проверка сохранённых ключей
PUT    /api/okx/credentials     Сохранение ключей OKX
DELETE /api/okx/credentials     Удаление ключей OKX
POST   /api/okx/test            Демо-проверка формата ключей OKX
```

## Демонстрация
<img width="1534" height="750" alt="image" src="https://github.com/user-attachments/assets/2fdbaf23-e8b2-4d65-b096-5ef21d206aa9" />

---

<img width="1907" height="953" alt="image" src="https://github.com/user-attachments/assets/e4a3a685-87c1-4d8d-adf1-3579dd0a9d86" />

---

<img width="1920" height="947" alt="image" src="https://github.com/user-attachments/assets/c4a9d3e4-1c92-4b9a-98eb-a8682a298f22" />
