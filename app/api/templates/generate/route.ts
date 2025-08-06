import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('API called with request:', request.url);
    const body = await request.json();
    console.log('Request body:', body);
    const { template, data, format } = body;

    if (!template || !data) {
      console.log('Missing template or data');
      return NextResponse.json(
        { error: 'Missing template or data' },
        { status: 400 }
      );
    }

    // Создаем папку для сгенерированных файлов, если её нет
    const outputDir = path.join(process.cwd(), 'public', 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const fileName = `report_${timestamp}`;
    let filePath = '';
    let fileUrl = '';

    if (format === 'pdf') {
      filePath = path.join(outputDir, `${fileName}.pdf`);
      fileUrl = `/generated/${fileName}.pdf`;
      
      // Здесь должна быть логика генерации PDF
      // Для демонстрации создаем простой текстовый файл
      const content = `Отчёт\n\n${data.response}\n\nSQL: ${data.sql_query || 'Нет данных'}`;
      fs.writeFileSync(filePath.replace('.pdf', '.txt'), content);
      
      // В реальном приложении здесь будет генерация PDF
      console.log('PDF generation would happen here');
      
    } else if (format === 'doc') {
      filePath = path.join(outputDir, `${fileName}.docx`);
      fileUrl = `/generated/${fileName}.docx`;
      
      // Здесь должна быть логика генерации DOC
      // Для демонстрации создаем простой текстовый файл
      const content = `Отчёт\n\n${data.response}\n\nSQL: ${data.sql_query || 'Нет данных'}`;
      fs.writeFileSync(filePath.replace('.docx', '.txt'), content);
      
      // В реальном приложении здесь будет генерация DOC
      console.log('DOC generation would happen here');
      
    } else {
      // Текстовый формат
      filePath = path.join(outputDir, `${fileName}.txt`);
      fileUrl = `/generated/${fileName}.txt`;
      
      // Используем содержимое шаблона, если оно есть
      let content = '';
      if (template.content) {
        content = template.content;
        // Заменяем переменные данными из ответа
        content = content.replace(/\{\{ дата_создания \}\}/g, new Date().toLocaleDateString('ru-RU'));
        content = content.replace(/\{\{ период_анализа \}\}/g, `${new Date().getMonth() + 1}/${new Date().getFullYear()}`);
        
        // Добавляем ответ n8n в конец
        content += `\n\n📋 Ответ системы:\n${data.response}`;
        if (data.sql_query) {
          content += `\n\n🔍 SQL запрос:\n${data.sql_query}`;
        }
      } else {
        content = `Отчёт\n\n${data.response}\n\nSQL: ${data.sql_query || 'Нет данных'}`;
      }
      
      fs.writeFileSync(filePath, content);
    }

    const response = {
      success: true,
      fileUrl: fileUrl,
      format: format || 'text'
    };
    console.log('API response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
} 