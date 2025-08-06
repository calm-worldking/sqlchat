import { NextRequest, NextResponse } from 'next/server';
import { testConnection, getTableInfo, executeQuery } from '../../../utils/database';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    
    // Тестируем подключение
    const isConnected = await testConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    }
    
    // Получаем информацию о таблицах
    const tableInfo = await getTableInfo();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tables: tableInfo.success ? tableInfo.data : [],
      tableCount: tableInfo.success ? tableInfo.data?.length : 0
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sqlQuery } = body;
    
    if (!sqlQuery) {
      return NextResponse.json({
        success: false,
        error: 'SQL query is required'
      }, { status: 400 });
    }
    
    console.log('Executing test SQL query:', sqlQuery);
    
    const result = await executeQuery(sqlQuery);
    
    return NextResponse.json({
      success: result.success,
      data: result.data,
      rowCount: result.rowCount,
      columns: result.columns,
      error: result.error
    });
    
  } catch (error) {
    console.error('SQL test error:', error);
    return NextResponse.json({
      success: false,
      error: 'SQL test failed'
    }, { status: 500 });
  }
} 