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
    const { template, chatText, sqlQuery, sessionId: _sessionId, outputFormat = 'txt' } = body;

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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY не настроен');
    }

    const now = new Date();
    const dateVars = getNowVariables(now);
    const databaseContext = buildDatabaseContext(databaseData, databaseColumns, 30);

    // 1) План отчёта
    const plannedSections = await planReportStructure({
      templateName: template.name,
      templateContent: template.content,
      chatText,
      sqlQuery,
      databaseContext,
      dateVars
    });

    // 2) Генерация и улучшение секций
    const sectionContents: string[] = [];
    for (const section of plannedSections) {
      const generated = await generateSectionWithRefinement({
        section,
        templateContent: template.content,
        chatText,
        sqlQuery,
        databaseContext,
        dateVars,
        maxRefineIterations: 2,
      });
      sectionContents.push(generated);
    }

    // 3) Сборка отчёта
    const assembledReport = await assembleFinalReport({
      templateName: template.name,
      templateContent: template.content,
      sections: plannedSections,
      sectionContents,
      dateVars
    });

    // 4) Финальная проверка качества и замена переменных
    const finalReport = await finalizeAndVerify({
      reportDraft: assembledReport,
      templateContent: template.content,
      sqlQuery,
      databaseContext,
      dateVars
    });

    return finalReport;
  } catch (error) {
    console.error('Error in agentic report generation:', error);
    // Fallback — минимально полезная сборка
    return buildFallbackReport(template, chatText, sqlQuery, databaseData, databaseColumns);
  }
}

// -------- Agentic loop helpers --------

interface DateVars {
  date: string;
  time: string;
  month: string;
  year: string;
  period: string;
}

function getNowVariables(now: Date): DateVars {
  return {
    date: now.toLocaleDateString('ru-RU'),
    time: now.toLocaleTimeString('ru-RU'),
    month: now.toLocaleDateString('ru-RU', { month: 'long' }),
    year: String(now.getFullYear()),
    period: `${now.getMonth() + 1}/${now.getFullYear()}`,
  };
}

function buildDatabaseContext(data: any[], columns: string[], sampleRows: number): string {
  if (!data || data.length === 0) return 'Данные из базы отсутствуют.';
  const head = JSON.stringify(data.slice(0, sampleRows), null, 2);
  return [
    `Количество строк: ${data.length}`,
    `Колонки: ${columns.join(', ')}`,
    `Первые ${Math.min(sampleRows, data.length)} строк:`,
    head,
  ].join('\n');
}

interface PlannedSection {
  id: string;
  title: string;
  purpose: string;
  min_words?: number;
}

async function planReportStructure(args: {
  templateName: string;
  templateContent: string;
  chatText: string;
  sqlQuery?: string;
  databaseContext: string;
  dateVars: DateVars;
}): Promise<PlannedSection[]> {
  const { templateName, templateContent, chatText, sqlQuery, databaseContext, dateVars } = args;

  const system = `Ты — главный редактор отчётов. Сначала составь план секций (5–10) с целями.
Формат ответа — ТОЛЬКО валидный JSON без пояснений:
{
  "sections": [
    {"id":"intro","title":"Введение","purpose":"...","min_words":120},
    ...
  ]
}`;

  const user = [
    `Шаблон: ${templateName}`,
    `Даты: дата=${dateVars.date}, время=${dateVars.time}, месяц=${dateVars.month}, год=${dateVars.year}, период=${dateVars.period}`,
    `Шаблон-содержимое:\n${templateContent}`,
    `Текст чата:\n${chatText}`,
    sqlQuery ? `SQL:\n${sqlQuery}` : '',
    `Данные БД:\n${databaseContext}`,
    'Сопоставь план с логикой шаблона. '
    + 'Укажи понятные id для секций (латиница, коротко), заголовки и цель каждой секции.',
  ].join('\n\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw);
    const sections: PlannedSection[] = Array.isArray(parsed.sections) ? parsed.sections : [];
    if (sections.length === 0) throw new Error('empty sections');
    return sections;
  } catch {
    // fallback план
    return [
      { id: 'intro', title: 'Введение', purpose: 'Контекст и цели отчёта', min_words: 120 },
      { id: 'data_overview', title: 'Обзор данных', purpose: 'Описание источников и структуры данных', min_words: 200 },
      { id: 'analysis', title: 'Аналитика', purpose: 'Ключевые наблюдения и статистика', min_words: 300 },
      { id: 'insights', title: 'Выводы', purpose: 'Ключевые выводы и рекомендации', min_words: 180 },
      { id: 'appendix', title: 'Приложение', purpose: 'Доп. таблицы/SQL/описания', min_words: 100 },
    ];
  }
}

async function generateSectionWithRefinement(args: {
  section: PlannedSection;
  templateContent: string;
  chatText: string;
  sqlQuery?: string;
  databaseContext?: string;
  dateVars: DateVars;
  maxRefineIterations: number;
}): Promise<string> {
  const { section, templateContent, chatText, sqlQuery, databaseContext, dateVars, maxRefineIterations } = args;

  // Черновик секции
  let sectionDraft = await callOpenAI({
    system: `Ты — автор секции отчёта. Пиши по-русски, без преамбул и без тройных кавычек. Используй markdown заголовок секции.`,
    user: [
      `Секция: ${section.title} (id=${section.id})`,
      `Цель: ${section.purpose}`,
      section.min_words ? `Минимальный объём: ${section.min_words} слов` : '',
      `Даты: ${JSON.stringify(dateVars)}`,
      `Шаблон (контекст):\n${templateContent}`,
      `Текст чата:\n${chatText}`,
      sqlQuery ? `SQL:\n${sqlQuery}` : '',
      databaseContext ? `Данные БД:\n${databaseContext}` : '',
      'Соблюдай логику шаблона. Замени переменные {{...}} реальными значениями.',
    ].filter(Boolean).join('\n\n'),
    max_tokens: 1200,
    temperature: 0.5,
  });

  // Итеративная критика и улучшение
  for (let i = 0; i < maxRefineIterations; i++) {
    const critique = await callOpenAI({
      system: 'Ты — критик разделов отчёта. Дай краткий список проблем по пунктам, если они есть. Если всё хорошо — верни "OK".',
      user: [
        `Секция (${section.title}):`,
        sectionDraft,
        'Проверь: соответствие цели, полноту, фактическую корректность относительно данных, стиль, отсутствие незаменённых {{...}}.',
      ].join('\n\n'),
      max_tokens: 400,
      temperature: 0.2,
    });

    if (/^OK\s*$/i.test(critique.trim())) break;

    sectionDraft = await callOpenAI({
      system: 'Ты — редактор. Улучшай текст секции на основе критики. Итог — полный обновлённый текст секции без комментариев.',
      user: [
        'Текущая версия секции:',
        sectionDraft,
        'Критика:',
        critique,
      ].join('\n\n'),
      max_tokens: 1200,
      temperature: 0.4,
    });
  }

  return sectionDraft;
}

async function assembleFinalReport(args: {
  templateName: string;
  templateContent: string;
  sections: PlannedSection[];
  sectionContents: string[];
  dateVars: DateVars;
}): Promise<string> {
  const { templateName, templateContent, sections, sectionContents, dateVars } = args;
  const joined = sectionContents.join('\n\n');
  const assembled = await callOpenAI({
    system: 'Ты — сборщик отчёта. Собери цельный документ, сохраняя логику шаблона и порядок секций. Не добавляй преамбул и не оборачивай в тройные кавычки.',
    user: [
      `Шаблон: ${templateName}`,
      `Даты: ${JSON.stringify(dateVars)}`,
      `Шаблон-содержимое:\n${templateContent}`,
      'Секции по порядку:',
      ...sections.map((s, idx) => `${idx + 1}. ${s.title} (id=${s.id})`),
      'Тексты секций (по порядку):',
      joined,
    ].join('\n\n'),
    max_tokens: 3500,
    temperature: 0.5,
  });
  return assembled;
}

async function finalizeAndVerify(args: {
  reportDraft: string;
  templateContent: string;
  sqlQuery?: string;
  databaseContext?: string;
  dateVars: DateVars;
}): Promise<string> {
  const { reportDraft, templateContent, sqlQuery, databaseContext, dateVars } = args;

  let verified = await callOpenAI({
    system: 'Ты — верификатор. Проверь документ: стиль, единообразие, отсутствие незаменённых переменных {{...}}. Верни исправленный текст без комментариев.',
    user: [
      `Даты: ${JSON.stringify(dateVars)}`,
      `Шаблон (контекст):\n${templateContent}`,
      sqlQuery ? `SQL:\n${sqlQuery}` : '',
      databaseContext ? `Данные БД:\n${databaseContext}` : '',
      'Документ:',
      reportDraft,
    ].filter(Boolean).join('\n\n'),
    max_tokens: 2000,
    temperature: 0.3,
  });

  // Быстрая техническая замена базовых переменных дат, если вдруг остались
  verified = applyDateVariables(verified, dateVars);

  // Удаляем возможные ``` обёртки
  verified = verified.replace(/^```[a-zA-Z]*\n?|```$/g, '');

  return verified;
}

function applyDateVariables(text: string, vars: DateVars): string {
  return text
    .replace(/\{\{\s*дата_создания\s*\}\}/g, vars.date)
    .replace(/\{\{\s*время_создания\s*\}\}/g, vars.time)
    .replace(/\{\{\s*дата_время_создания\s*\}\}/g, `${vars.date} ${vars.time}`)
    .replace(/\{\{\s*период_анализа\s*\}\}/g, vars.period)
    .replace(/\{\{\s*месяц\s*\}\}/g, vars.month)
    .replace(/\{\{\s*год\s*\}\}/g, vars.year);
}

async function callOpenAI(args: {
  system: string;
  user: string;
  max_tokens: number;
  temperature: number;
}): Promise<string> {
  const { system, user, max_tokens, temperature } = args;
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens,
    temperature,
    presence_penalty: 0,
    frequency_penalty: 0,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}

function buildFallbackReport(
  template: any,
  chatText: string,
  sqlQuery: string | undefined,
  databaseData: any[],
  databaseColumns: string[]
): string {
  const now = new Date();
  const vars = getNowVariables(now);
  let report = template.content;
  report = applyDateVariables(report, vars);
  report += `\n\n📋 Данные из чата:\n${chatText}`;
  if (sqlQuery) {
    report += `\n\n🔍 SQL запрос:\n${sqlQuery}`;
  }
  if (databaseData.length > 0) {
    report += `\n\n📊 Данные из базы (${databaseData.length} строк):\n`;
    report += `Колонки: ${databaseColumns.join(', ')}\n\n`;
    report += JSON.stringify(databaseData.slice(0, 5), null, 2);
  }
  report += `\n\n⏰ Время создания: ${vars.date} ${vars.time}`;
  report += `\n⚠️ OpenAI недоступен, использован fallback режим`;
  return report;
}