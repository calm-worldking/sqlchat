# SQL Chat

Интерактивное приложение для работы с SQL-запросами и визуализации данных с использованием R и n8n workflow.

## Структура проекта

- `app/` - Frontend приложение на Next.js
- `r-server/` - Backend сервер для выполнения R-скриптов
- `workflows/` - JSON файлы экспортированных n8n workflows (опционально)
- `credentials/` - Зашифрованные учетные данные для n8n (OpenAI API, PostgreSQL и др.)
- `database/` - Скрипты инициализации и резервные копии базы данных PostgreSQL

## Запуск с использованием Docker

### Предварительные требования

- Docker
- Docker Compose

### Запуск приложения

#### Использование скриптов для настройки

Для удобства настройки и запуска приложения предоставлены скрипты:

- **Linux/macOS**: Используйте `setup-docker.sh`
  ```bash
  chmod +x setup-docker.sh
  ./setup-docker.sh
  ```

- **Windows**: Используйте `setup-docker.bat`
  ```
  setup-docker.bat
  ```

Эти скрипты предоставляют интерактивное меню для управления Docker-контейнерами.

#### Ручной запуск

1. Клонируйте репозиторий:

```bash
git clone <repository-url>
cd sqlchat
```

2. Настройте переменные окружения (опционально):

```bash
# Linux/macOS
export OPENAI_API_KEY=your-openai-api-key

# Windows
set OPENAI_API_KEY=your-openai-api-key
```

3. Запустите приложение с помощью Docker Compose:

```bash
docker-compose up -d
```

4. Откройте приложение в браузере:

```
http://localhost:3000
```

5. Настройка n8n:

После запуска контейнеров, откройте n8n в браузере:

```
http://localhost:5678
```

Импортируйте ваш рабочий процесс n8n и настройте вебхук по адресу:
```
http://localhost:5678/webhook-test/chat
```

#### Использование примеров workflow

В папке `workflows/` находятся примеры workflow для SQL Chat:

##### Базовый пример workflow

1. Откройте n8n в браузере (http://localhost:5678)
2. Нажмите на кнопку "+ Create workflow" или на меню (три точки) в верхнем правом углу и выберите "Import from file"
3. Выберите файл `workflows/sql-chat-example-workflow.json`
4. После импорта нажмите на кнопку "Save" (дискета) и затем "Activate" (переключатель в верхнем правом углу)

Этот пример workflow обрабатывает следующие типы запросов:
- Запросы на визуализацию данных (ключевые слова: "график", "визуализация", "диаграмма")
- Запросы на работу с SQL (ключевые слова: "sql", "запрос", "таблица")

##### Расширенный workflow с PostgreSQL и OpenAI

1. Откройте n8n в браузере (http://localhost:5678)
2. Нажмите на кнопку "+ Create workflow" или на меню (три точки) в верхнем правом углу и выберите "Import from file"
3. Выберите файл `workflows/sql-chat-postgres-workflow.json`
4. После импорта нажмите на кнопку "Save" (дискета) и затем "Activate" (переключатель в верхнем правом углу)
5. Убедитесь, что у вас настроены credentials для OpenAI API и PostgreSQL (см. раздел "Настройка учетных данных (credentials) для n8n")

Этот расширенный workflow позволяет:
- Анализировать запросы пользователя с помощью OpenAI
- Генерировать SQL-запросы к базе данных PostgreSQL
- Визуализировать результаты запросов с помощью R
- Отвечать на вопросы о данных в базе

#### Настройка учетных данных (credentials) для n8n

1. **OpenAI API**:
   - Перейдите в n8n -> Settings -> Credentials
   - Создайте новый credential типа "OpenAI API"
   - Введите ваш API-ключ OpenAI

2. **PostgreSQL**:
   - Перейдите в n8n -> Settings -> Credentials
   - Создайте новый credential типа "PostgreSQL"
   - Введите следующие данные:
     - Host: postgres
     - Database: sqlchat
     - User: n8n
     - Password: n8n
     - Port: 5432

#### Доступ к базе данных PostgreSQL

База данных PostgreSQL доступна по адресу `localhost:5432` со следующими учетными данными:
- Database: sqlchat
- User: postgres
- Password: postgres

В базе данных уже созданы таблицы и примеры данных в схеме `sqlchat`.

### Остановка приложения

```bash
docker-compose down
```

### Сборка и публикация Docker образов

Для сборки Docker образов и их публикации в реестре предоставлены скрипты:

- **Linux/macOS**:
  ```bash
  chmod +x build-images.sh
  ./build-images.sh --registry your-registry.com --tag v1.0.0 --push
  ```

- **Windows**:
  ```
  build-images.bat --registry your-registry.com --tag v1.0.0 --push
  ```

### Развертывание в продакшн

Для развертывания в продакшн используйте файл `docker-compose.prod.yml`:

```bash
# Установите переменные окружения
export DOCKER_REGISTRY=your-registry.com
export TAG=v1.0.0
export R_SERVER_URL=http://your-domain.com:3001
export N8N_URL=http://your-domain.com:5678
export N8N_ENCRYPTION_KEY=your-secure-encryption-key
export OPENAI_API_KEY=your-openai-api-key
export POSTGRES_PASSWORD=secure-password

# Запустите контейнеры
docker-compose -f docker-compose.prod.yml up -d
```

На Windows:
```
set DOCKER_REGISTRY=your-registry.com
set TAG=v1.0.0
set R_SERVER_URL=http://your-domain.com:3001
set N8N_URL=http://your-domain.com:5678
set N8N_ENCRYPTION_KEY=your-secure-encryption-key
set OPENAI_API_KEY=your-openai-api-key
set POSTGRES_PASSWORD=secure-password
docker-compose -f docker-compose.prod.yml up -d
```

## Запуск в режиме разработки

### Предварительные требования

- Node.js (версия 18 или выше)
- R (версия 4.0 или выше)
- Необходимые R-пакеты: ggplot2, gt, jsonlite, knitr, rmarkdown, pdftools, extrafont, xfun, kableExtra, dplyr
- n8n (для обработки запросов пользователя)
- PostgreSQL (для хранения данных)

### Установка и запуск

1. Установите зависимости для frontend:

```bash
npm install
```

2. Установите зависимости для R-сервера:

```bash
cd r-server
npm install
```

3. Запустите PostgreSQL:

```bash
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=sqlchat postgres:14
```

4. Запустите n8n:

```bash
npx n8n
```

5. Запустите R-сервер:

```bash
cd r-server
npm run dev
```

6. В отдельном терминале запустите frontend:

```bash
npm run dev
```

7. Откройте приложение в браузере:

```
http://localhost:3000
```

## Работа с n8n workflows

### Экспорт workflow

1. Откройте n8n в браузере (http://localhost:5678)
2. Перейдите к нужному workflow
3. Нажмите на меню (три точки) в правом верхнем углу
4. Выберите "Export" -> "Workflow"
5. Сохраните JSON файл в папку `workflows/`

### Импорт workflow

1. Откройте n8n в браузере (http://localhost:5678)
2. Нажмите на кнопку "+ Create workflow" или на меню (три точки) в верхнем правом углу и выберите "Import from file"
3. Выберите JSON файл из папки `workflows/`
4. После импорта не забудьте активировать workflow

### Создание собственного workflow

1. Откройте n8n в браузере (http://localhost:5678)
2. Нажмите на кнопку "+ Create workflow"
3. Добавьте узел "Webhook" и настройте его на путь "webhook-test/chat"
4. Добавьте узлы для обработки запросов пользователя
5. Добавьте узел "Respond to Webhook" для отправки ответа
6. Активируйте workflow

## Работа с базой данных PostgreSQL

### Подключение к базе данных

Вы можете подключиться к базе данных PostgreSQL с помощью любого SQL-клиента (например, pgAdmin, DBeaver, DataGrip) по следующим параметрам:
- Host: localhost
- Port: 5432
- Database: sqlchat
- User: postgres
- Password: postgres

### Структура базы данных

База данных содержит следующие таблицы в схеме `sqlchat`:
- `users` - пользователи системы
- `sessions` - сессии пользователей
- `messages` - сообщения в чате
- `products` - пример таблицы с продуктами
- `orders` - пример таблицы с заказами
- `order_items` - пример таблицы с элементами заказов

### Резервное копирование и восстановление

Для создания резервной копии базы данных:
```bash
docker exec -t postgres pg_dump -U postgres sqlchat > database/backup/sqlchat_backup.sql
```

Для восстановления из резервной копии:
```bash
cat database/backup/sqlchat_backup.sql | docker exec -i postgres psql -U postgres -d sqlchat
```

## Конфигурация

Для настройки приложения можно использовать следующие переменные окружения:

### Frontend

- `NEXT_PUBLIC_R_SERVER_URL` - URL R-сервера (по умолчанию: http://localhost:3001)
- `NEXT_PUBLIC_N8N_URL` - URL n8n сервера (по умолчанию: http://localhost:5678)

### R-сервер

- `PORT` - Порт для запуска R-сервера (по умолчанию: 3001)
- `HOST` - Хост для запуска R-сервера (по умолчанию: 0.0.0.0)
- `SERVER_URL` - URL для доступа к R-серверу (по умолчанию: http://localhost:3001)

### n8n

- `N8N_PORT` - Порт для запуска n8n (по умолчанию: 5678)
- `N8N_ENCRYPTION_KEY` - Ключ шифрования для n8n
- `N8N_WEBHOOK_URL` - URL для вебхуков n8n (по умолчанию: http://localhost:5678/)
- `TIMEZONE` - Часовой пояс (по умолчанию: Europe/Moscow)
- `N8N_OPENAI_API_KEY` - API-ключ OpenAI

### PostgreSQL

- `POSTGRES_USER` - Имя пользователя PostgreSQL (по умолчанию: postgres)
- `POSTGRES_PASSWORD` - Пароль пользователя PostgreSQL (по умолчанию: postgres)
- `POSTGRES_DB` - Имя базы данных PostgreSQL (по умолчанию: sqlchat)
- `POSTGRES_PORT` - Порт PostgreSQL (по умолчанию: 5432) 