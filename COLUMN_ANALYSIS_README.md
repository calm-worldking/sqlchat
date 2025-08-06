# Анализ колонок

Этот функционал позволяет анализировать все колонки в базе данных и предлагать предположения о том, что может храниться в этих колонках. Система также показывает, какие колонки имеют описания, а какие - нет.

## Функциональность

- 🔍 Анализ всех колонок в базе данных
- 🤖 Автоматический анализ названий колонок и типов данных
- 📊 Предложения о содержимом колонок с уровнем уверенности
- 🎨 Цветовая индикация колонок с описаниями и без
- 📁 Фильтрация по таблицам и наличию описаний
- 📥 Экспорт результатов в CSV
- 🔄 Возможность обновления анализа
- 📜 Скроллируемый интерфейс для удобного просмотра
- 📊 Статистика колонок с описаниями и без

## Настройка n8n

### 1. Импорт конфигурации

1. Откройте n8n
2. Создайте новый workflow
3. Импортируйте файл `n8n-column-analysis-example.json`

### 2. Настройка подключения к базе данных

1. В узле "PostgreSQL Query" настройте подключение к вашей базе данных
2. Убедитесь, что у вас есть права на чтение `information_schema`

### 3. Настройка вебхука

1. Активируйте workflow
2. Скопируйте URL вебхука
3. Обновите `COLUMN_ANALYSIS_WEBHOOK_URL` в `ChatWidget.tsx`

## SQL запрос

Система использует следующий SQL запрос для анализа всех колонок:

```sql
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length,
  CASE WHEN cc.column_name IS NULL THEN true ELSE false END as empty_description
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN information_schema.column_comments cc ON 
  t.table_name = cc.table_name AND 
  c.column_name = cc.column_name
WHERE t.table_schema = 'public'
  AND c.column_name NOT LIKE '%id'
  AND c.column_name NOT LIKE '%_id'
ORDER BY t.table_name, c.ordinal_position;
```

## Алгоритм анализа

Система анализирует колонки по следующим критериям:

### 1. Анализ по названию колонки
- `name`, `title` → Название или заголовок объекта
- `email`, `mail` → Email адрес пользователя
- `phone`, `tel` → Номер телефона
- `address`, `addr` → Адрес
- `date`, `time` → Дата или время
- `price`, `cost`, `amount` → Цена или сумма
- `status`, `state` → Статус или состояние
- `description`, `desc` → Описание
- `url`, `link` → URL или ссылка
- `code`, `key` → Код или ключ
- `count`, `number` → Количество или номер
- `active`, `enabled` → Флаг активности
- `created`, `added` → Дата создания
- `updated`, `modified` → Дата обновления

### 2. Анализ по типу данных
- `varchar/text` → Текст (с учетом длины)
- `int/bigint` → Числовое значение
- `decimal/numeric` → Денежное значение или точное число
- `date/timestamp` → Дата и время
- `boolean` → Логическое значение

### 3. Контекстный анализ
- Анализ названия таблицы для дополнительного контекста
- Учет связей между таблицами

### 4. Цветовая индикация
- 🟢 Светло-зеленые карточки для колонок с описаниями
- 🟡 Светло-желтые карточки для колонок без описаний

### 5. Фильтрация и статистика
- Фильтр по таблицам для выбора конкретной таблицы
- Фильтр по описанию: все колонки / с описанием / без описания
- Статистика в реальном времени: количество колонок с описаниями и без

## Использование

1. Нажмите кнопку с иконкой базы данных в заголовке чата
2. Дождитесь завершения анализа
3. Просмотрите результаты в модальном окне
4. Используйте фильтры для поиска по таблицам и наличию описаний
5. Просматривайте статистику в нижней части окна
6. Экспортируйте результаты в CSV при необходимости

## Настройка для других СУБД

### MySQL
```sql
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length,
  CASE WHEN cc.column_name IS NULL THEN true ELSE false END as empty_description
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN information_schema.column_comments cc ON 
  t.table_name = cc.table_name AND 
  c.column_name = cc.column_name
WHERE t.table_schema = DATABASE()
  AND c.column_name NOT LIKE '%id'
  AND c.column_name NOT LIKE '%_id'
ORDER BY t.table_name, c.ordinal_position;
```

### SQL Server
```sql
SELECT 
  t.name as table_name,
  c.name as column_name,
  ty.name as data_type,
  c.is_nullable,
  c.column_default,
  c.max_length,
  CASE WHEN ep.value IS NULL THEN true ELSE false END as empty_description
FROM sys.tables t
JOIN sys.columns c ON t.object_id = c.object_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
LEFT JOIN sys.extended_properties ep ON 
  ep.major_id = c.object_id AND 
  ep.minor_id = c.column_id AND 
  ep.name = 'MS_Description'
WHERE c.name NOT LIKE '%id'
  AND c.name NOT LIKE '%_id'
ORDER BY t.name, c.column_id;
```

## Требования

- n8n с настроенным подключением к базе данных
- Права на чтение `information_schema`
- Поддержка JavaScript в n8n для анализа данных

## Устранение неполадок

### Ошибка подключения к базе данных
- Проверьте настройки подключения в n8n
- Убедитесь, что база данных доступна

### Пустые результаты
- Проверьте, что в базе есть колонки
- Убедитесь, что у вас есть права на чтение метаданных

### Ошибки в анализе
- Проверьте JavaScript код в узле "Analyze Columns"
- Убедитесь, что структура данных соответствует ожидаемой 