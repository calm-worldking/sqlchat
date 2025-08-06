# Настройка PostgreSQL

## Шаг 1: Установка PostgreSQL

1. Скачайте и установите PostgreSQL с [официального сайта](https://www.postgresql.org/download/)
2. При установке запомните пароль для пользователя postgres
3. Убедитесь, что PostgreSQL запущен как служба

## Шаг 2: Создание базы данных

1. Откройте pgAdmin или psql
2. Создайте новую базу данных:
   ```sql
   CREATE DATABASE sqlchat;
   ```

## Шаг 3: Настройка переменных окружения

1. Создайте или обновите файл `.env.local` в корне проекта
2. Добавьте следующие строки:

```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=sqlchat
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here
```

3. Замените `your_postgres_password` на ваш реальный пароль PostgreSQL
4. Замените `sk-your-openai-api-key-here` на ваш OpenAI API ключ

## Шаг 4: Тестирование подключения

1. Перезапустите сервер разработки:
   ```bash
   npm run dev
   ```

2. Проверьте подключение к базе данных в консоли сервера

## Шаг 5: Создание тестовых данных

Вы можете создать тестовые таблицы для проверки работы:

```sql
-- Создание таблицы пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    city VARCHAR(50),
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы спортзалов
CREATE TABLE gyms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    services TEXT[],
    rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставка тестовых данных
INSERT INTO users (name, email, city, age) VALUES
('Иван Петров', 'ivan@example.com', 'Алматы', 25),
('Мария Сидорова', 'maria@example.com', 'Астана', 30),
('Алексей Козлов', 'alex@example.com', 'Алматы', 28);

INSERT INTO gyms (name, address, city, services, rating) VALUES
('Фитнес-центр "Здоровье"', 'ул. Абая, 123', 'Алматы', ARRAY['тренажеры', 'бассейн', 'йога'], 4.5),
('Спортзал "Сила"', 'пр. Республики, 45', 'Астана', ARRAY['тренажеры', 'бокс'], 4.2),
('Фитнес-клуб "Энергия"', 'ул. Толе би, 67', 'Алматы', ARRAY['тренажеры', 'бассейн', 'сауна'], 4.8);
```

## Проверка работы

1. Откройте приложение
2. Выберите шаблон отчёта
3. Отправьте запрос с SQL, например:
   ```
   Покажи всех пользователей из Алматы
   ```
4. Проверьте, что отчёт генерируется на основе данных из базы

## Примечания

- Убедитесь, что PostgreSQL запущен
- Проверьте, что порт 5432 не занят другими приложениями
- Для продакшена настройте SSL соединение
- Храните пароли в безопасном месте 