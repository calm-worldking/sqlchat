import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import { executeQuery, QueryResult } from '../../../utils/database';
import { generateDocument } from '../../../utils/documentGenerator';

interface ReportRequest {
  template: {
    id: string;
    name: string;
    content: string;
    type: 'report' | 'reference';
    format: string;
  };
  chatText: string;
  sqlQuery?: string;
  sessionId: string;
  outputFormat?: 'txt' | 'doc' | 'pdf';
}

interface ReportResponse {
  success: boolean;
  fileUrl?: string;
  format?: string;
  error?: string;
}

// Инициализируем OpenAI клиент
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();
    const { template, chatText, sqlQuery, sessionId, outputFormat = 'txt' } = body;

    console.log('Generating report with template:', template.name);
    console.log('Chat text length:', chatText.length);
    console.log('SQL query:', sqlQuery);
    console.log('Output format:', outputFormat);

    // Выполняем SQL запрос к базе данных, если он предоставлен
    let databaseData: any[] = [];
    let databaseColumns: string[] = [];
    let databaseRowCount = 0;
    
    if (sqlQuery) {
      console.log('Executing SQL query to database...');
      const queryResult: QueryResult = await executeQuery(sqlQuery);
      
      if (queryResult.success && queryResult.data) {
        databaseData = queryResult.data;
        databaseColumns = queryResult.columns || [];
        databaseRowCount = queryResult.rowCount || 0;
        console.log('Database query successful, rows:', databaseRowCount);
      } else {
        console.error('Database query failed:', queryResult.error);
        return NextResponse.json({
          success: false,
          error: `Database query failed: ${queryResult.error}`
        } as ReportResponse, { status: 500 });
      }
    }

    // Генерируем отчёт с помощью OpenAI, используя данные из базы
    const generatedReport = await generateReportWithAI(template, chatText, sqlQuery, databaseData, databaseColumns);

    // Создаём директорию для отчётов если её нет
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Генерируем уникальное имя файла
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `report_${template.id}_${timestamp}`;
    const fileExtension = outputFormat === 'doc' ? 'docx' : outputFormat;
    const filePath = path.join(reportsDir, `${fileName}.${fileExtension}`);
    const fileUrl = `/reports/${fileName}.${fileExtension}`;

    // Генерируем документ в выбранном формате
    await generateDocument(
      generatedReport,
      template.name,
      outputFormat,
      filePath
    );

    console.log('Report generated successfully:', fileUrl);

    return NextResponse.json({
      success: true,
      fileUrl,
      format: outputFormat
    } as ReportResponse);

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate report'
    } as ReportResponse, { status: 500 });
  }
}

async function generateReportWithAI(
  template: any, 
  chatText: string, 
  sqlQuery?: string, 
  databaseData: any[] = [], 
  databaseColumns: string[] = []
): Promise<string> {
  try {
    // Проверяем наличие API ключа
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY не настроен');
    }

    // Формируем данные из базы для промпта
    let databaseInfo = '';
    if (databaseData.length > 0) {
      databaseInfo = `
Данные из базы данных:
Количество строк: ${databaseData.length}
Колонки: ${databaseColumns.join(', ')}

Первые 10 строк данных:
${JSON.stringify(databaseData.slice(0, 10), null, 2)}
`;
    }

    // Формируем улучшенный промпт для OpenAI
    const systemPrompt = `Ты - эксперт по анализу данных и составлению профессиональных отчётов. 
    Твоя задача - создать качественный отчёт на основе шаблона и данных из базы данных.

    Шаблон отчёта:
    ${template.content}

    Инструкции:
    1. Используй структуру шаблона как основу, но адаптируй под реальные данные из базы
    2. Замени все переменные в {{ }} на реальные данные из базы данных
    3. Если данных недостаточно, используй разумные предположения и укажи это
    4. Сохрани профессиональный стиль и форматирование
    5. Добавь анализ и выводы на основе данных из базы
    6. Используй эмодзи для улучшения читаемости
    7. Сделай отчёт информативным, структурированным и полезным
    8. Если есть SQL запрос, проанализируй его и включи результаты
    9. Добавь рекомендации и выводы в конце отчёта
    10. Используй таблицы и списки для лучшей структуризации данных
    11. Анализируй данные из базы и делай статистические выводы
    12. Используй markdown форматирование для заголовков (# ## ###)

    Важно: Отчёт должен быть готовым к использованию и профессиональным.`;

    const userPrompt = `Данные из чата:
${chatText}

${sqlQuery ? `SQL запрос: ${sqlQuery}` : ''}

${databaseInfo}

Создай профессиональный отчёт на основе шаблона "${template.name}" используя предоставленные данные из базы данных. 
Отчёт должен быть структурированным, информативным и готовым к использованию.`;

    console.log('Sending request to OpenAI...');
    console.log('Template type:', template.type);
    console.log('Chat text length:', chatText.length);
    console.log('Database rows:', databaseData.length);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const generatedReport = completion.choices[0]?.message?.content || '';

    if (!generatedReport) {
      throw new Error('OpenAI не вернул содержимое отчёта');
    }

    console.log('OpenAI response received, length:', generatedReport.length);

    // Возвращаем только сгенерированный отчёт без метаданных
    return generatedReport;

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    
    // Fallback: используем простую логику если OpenAI недоступен
    const now = new Date();
    const reportDate = now.toLocaleDateString('ru-RU');
    
    let report = template.content;
    
    // Заменяем базовые переменные
    report = report.replace(/\{\{ дата_создания \}\}/g, reportDate);
    report = report.replace(/\{\{ период_анализа \}\}/g, `${now.getMonth() + 1}/${now.getFullYear()}`);
    
    // Добавляем данные из чата
    report += `\n\n📋 Данные из чата:\n${chatText}`;
    
    if (sqlQuery) {
      report += `\n\n🔍 SQL запрос:\n${sqlQuery}`;
    }
    
    // Добавляем данные из базы
    if (databaseData.length > 0) {
      report += `\n\n📊 Данные из базы (${databaseData.length} строк):\n`;
      report += `Колонки: ${databaseColumns.join(', ')}\n\n`;
      report += JSON.stringify(databaseData.slice(0, 5), null, 2);
    }
    
    // Добавляем информацию о генерации
    report += `\n\n📊 Отчёт сгенерирован автоматически на основе шаблона "${template.name}"`;
    report += `\n⏰ Время создания: ${now.toLocaleString('ru-RU')}`;
    report += `\n⚠️ OpenAI недоступен, использован fallback режим`;
    report += `\n💡 Для улучшения качества отчётов настройте OpenAI API ключ`;
    
    return report;
  }
} 