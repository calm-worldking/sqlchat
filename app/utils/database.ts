import { Pool, PoolClient } from 'pg';

// Конфигурация подключения к PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sqlchat',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Интерфейс для результатов запроса
export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  rowCount?: number;
  columns?: string[];
}

// Функция для выполнения SQL запроса
export async function executeQuery(sqlQuery: string): Promise<QueryResult> {
  let client: PoolClient | null = null;
  
  try {
    console.log('Executing SQL query:', sqlQuery);
    
    client = await pool.connect();
    const result = await client.query(sqlQuery);
    
    console.log('Query executed successfully, rows returned:', result.rowCount);
    
    return {
      success: true,
      data: result.rows,
      rowCount: result.rowCount || 0,
      columns: result.fields.map(field => field.name)
    };
    
  } catch (error) {
    console.error('Database query error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Функция для тестирования подключения
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Функция для получения информации о таблицах
export async function getTableInfo(): Promise<QueryResult> {
  const query = `
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;
  
  return await executeQuery(query);
}

// Функция для получения данных из таблицы с ограничением
export async function getTableData(tableName: string, limit: number = 100): Promise<QueryResult> {
  const query = `SELECT * FROM "${tableName}" LIMIT ${limit}`;
  return await executeQuery(query);
}

// Закрытие пула соединений при завершении приложения
process.on('SIGINT', () => {
  pool.end();
  process.exit(0);
}); 