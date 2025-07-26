-- Создаем пользователя для n8n, если его еще нет
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8n') THEN
    CREATE USER n8n WITH PASSWORD 'n8n';
  END IF;
END
$$;

-- Создаем базу данных для n8n, если её еще нет
CREATE DATABASE IF NOT EXISTS n8n;
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;

-- Создаем схему для данных SQL Chat
CREATE SCHEMA IF NOT EXISTS sqlchat;

-- Создаем таблицу пользователей
CREATE TABLE IF NOT EXISTS sqlchat.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создаем таблицу сессий
CREATE TABLE IF NOT EXISTS sqlchat.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES sqlchat.users(id),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создаем таблицу сообщений
CREATE TABLE IF NOT EXISTS sqlchat.messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sqlchat.sessions(id),
    message_text TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL, -- 'user' или 'bot'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создаем таблицу для примера данных
CREATE TABLE IF NOT EXISTS sqlchat.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    in_stock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Вставляем примеры данных
INSERT INTO sqlchat.products (name, description, price, category) VALUES
('Ноутбук', 'Мощный ноутбук для работы и игр', 75000.00, 'Электроника'),
('Смартфон', 'Современный смартфон с отличной камерой', 45000.00, 'Электроника'),
('Наушники', 'Беспроводные наушники с шумоподавлением', 12000.00, 'Аксессуары'),
('Клавиатура', 'Механическая клавиатура для геймеров', 8500.00, 'Периферия'),
('Мышь', 'Эргономичная мышь с высоким DPI', 3500.00, 'Периферия'),
('Монитор', '27-дюймовый монитор с высоким разрешением', 25000.00, 'Электроника'),
('Планшет', 'Компактный планшет для работы и развлечений', 35000.00, 'Электроника'),
('Внешний SSD', 'Быстрый внешний SSD на 1TB', 15000.00, 'Хранение данных'),
('Веб-камера', 'HD веб-камера для видеоконференций', 4500.00, 'Периферия'),
('Роутер', 'Мощный Wi-Fi роутер с поддержкой Wi-Fi 6', 9000.00, 'Сетевое оборудование');

-- Создаем таблицу заказов
CREATE TABLE IF NOT EXISTS sqlchat.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES sqlchat.users(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создаем таблицу элементов заказа
CREATE TABLE IF NOT EXISTS sqlchat.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES sqlchat.orders(id),
    product_id INTEGER REFERENCES sqlchat.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL
);

-- Создаем пользователей для примера
INSERT INTO sqlchat.users (username, email) VALUES
('user1', 'user1@example.com'),
('user2', 'user2@example.com'),
('user3', 'user3@example.com');

-- Создаем сессии для примера
INSERT INTO sqlchat.sessions (user_id, session_id) VALUES
(1, 'session1'),
(2, 'session2'),
(3, 'session3');

-- Создаем заказы для примера
INSERT INTO sqlchat.orders (user_id, total_amount, status) VALUES
(1, 87000.00, 'completed'),
(2, 45000.00, 'processing'),
(3, 15500.00, 'new');

-- Добавляем элементы заказов
INSERT INTO sqlchat.order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 75000.00),
(1, 3, 1, 12000.00),
(2, 2, 1, 45000.00),
(3, 4, 1, 8500.00),
(3, 5, 2, 3500.00);

-- Предоставляем права пользователю n8n
GRANT USAGE ON SCHEMA sqlchat TO n8n;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sqlchat TO n8n;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sqlchat TO n8n; 