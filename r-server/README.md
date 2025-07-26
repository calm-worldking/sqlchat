# R Script Execution Server

Сервер для выполнения R-скриптов и генерации визуализаций. Поддерживает графики ggplot2, таблицы gt и grid объекты.

## Новые возможности

- **Поддержка интерактивных таблиц**: таблицы теперь возвращаются в HTML и JSON форматах, что позволяет пользователям взаимодействовать с данными - копировать, сортировать и т.д.
- **Автоматическое определение типа объекта**: сервер автоматически определяет тип объекта (график или таблица) и возвращает соответствующий формат данных.

## Требования

1. Node.js (версия 14 или выше)
2. R (версия 3.6 или выше)
3. Библиотеки для R:
   - ggplot2 (для графиков)
   - gt (для таблиц)
   - jsonlite (для работы с JSON)
   - grid (для grid объектов)

## Установка R и необходимых пакетов

### Windows

1. Скачайте и установите R с [официального сайта](https://cran.r-project.org/bin/windows/base/)
2. Откройте R и выполните команды для установки пакетов:
   ```R
   install.packages("ggplot2")
   install.packages("gt")
   install.packages("jsonlite")
   ```

### macOS

1. Установите R с помощью Homebrew:
   ```bash
   brew install r
   ```
2. Откройте R и выполните команды для установки пакетов:
   ```R
   install.packages("ggplot2")
   install.packages("gt")
   install.packages("jsonlite")
   ```

### Linux (Ubuntu/Debian)

1. Установите R:
   ```bash
   sudo apt update
   sudo apt install r-base
   ```
2. Установите пакеты:
   ```bash
   sudo Rscript -e 'install.packages("ggplot2", repos="https://cloud.r-project.org")'
   sudo Rscript -e 'install.packages("gt", repos="https://cloud.r-project.org")'
   sudo Rscript -e 'install.packages("jsonlite", repos="https://cloud.r-project.org")'
   ```

## Установка и запуск сервера

1. Установите зависимости и проверьте наличие необходимых пакетов R:
   ```bash
   node setup.js
   ```

2. Запустите сервер:
   ```bash
   npm start
   ```

   Для разработки с автоматической перезагрузкой:
   ```bash
   npm run dev
   ```

3. Сервер будет доступен по адресу: http://localhost:3001

## API

### Проверка статуса

```
GET /health
```

Возвращает статус сервера.

### Выполнение R-скрипта

```
POST /execute-r
Content-Type: application/json

{
  "script": "library(ggplot2)\n\n# Ваш R-скрипт здесь\n..."
}
```

Выполняет R-скрипт и возвращает результат в зависимости от типа объекта:
- Для графиков: URL изображения
- Для таблиц: HTML и JSON представление данных

#### Пример ответа для графика:

```json
{
  "success": true,
  "result": {
    "type": "image",
    "imageUrl": "http://localhost:3001/outputs/output_123456.png"
  }
}
```

#### Пример ответа для таблицы:

```json
{
  "success": true,
  "result": {
    "type": "table",
    "htmlUrl": "http://localhost:3001/tables/table_123456.html",
    "jsonUrl": "http://localhost:3001/tables/table_123456.json",
    "htmlContent": "<table>...</table>",
    "jsonData": [{"column1": "value1", ...}, ...]
  }
}
```

## Поддерживаемые типы визуализаций

Сервер поддерживает следующие типы визуализаций:

1. **Графики ggplot2** - стандартные графики, созданные с помощью библиотеки ggplot2
2. **Таблицы gt** - красиво оформленные таблицы, созданные с помощью библиотеки gt
3. **Обычные таблицы (data.frame)** - таблицы данных в формате data.frame
4. **Grid объекты** - объекты, созданные с помощью библиотеки grid

### Примеры скриптов

#### Пример с ggplot2:
```R
library(ggplot2)

# Создаем данные
data <- data.frame(
  x = 1:10,
  y = 1:10
)

# Создаем график
p <- ggplot(data, aes(x = x, y = y)) +
  geom_point() +
  labs(title = "Пример графика")

# График будет автоматически сохранен
```

#### Пример с gt:
```R
library(gt)

# Создаем данные
data <- data.frame(
  Name = c("Иван", "Мария", "Алексей"),
  Age = c(25, 30, 35),
  Score = c(85, 92, 78)
)

# Создаем таблицу
gt_table <- gt(data) %>%
  tab_header(title = "Пример таблицы")

# Таблица будет автоматически сохранена как HTML и JSON
```

#### Пример с data.frame:
```R
# Создаем данные
df <- data.frame(
  Name = c("Иван", "Мария", "Алексей"),
  Age = c(25, 30, 35),
  Score = c(85, 92, 78)
)

# Таблица будет автоматически сохранена как HTML и JSON
```

## Интеграция с фронтендом

В вашем React-приложении обновите константу `R_EXECUTION_SERVER` в файле `app/page.tsx`:

```typescript
const R_EXECUTION_SERVER = 'http://localhost:3001/execute-r';
```

## Тестирование

Для тестирования сервера с графиком ggplot2:
```bash
node test-api.js
```

Для тестирования сервера с таблицей gt:
```bash
node test-api-gt.js
```

Для тестирования сервера с обычной таблицей data.frame:
```bash
node test-api-table.js
``` 