'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { FiSend, FiUser, FiSettings, FiTrash2, FiBarChart2, FiCode, FiDatabase, FiFileText, FiDownload, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import SettingsModal from './SettingsModal';
import ColumnAnalysisModal from './ColumnAnalysisModal';
import TemplatesModal from './TemplatesModal';
import { getSessionId, getSettings, saveSettings, getColumnAnalysis, saveColumnAnalysis } from '../utils/storage';
import { generateDocumentFromTemplate, getDefaultVariables, processTemplateVariables } from '../utils/templateProcessor';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  chartData?: any; // Optional chart data
  responseType?: 'text' | 'chart' | 'image' | 'r_script' | 'file'; // Type of response
  imageUrl?: string; // URL to image if available
  rScript?: string; // R script for ggplot2 visualization
  sqlQuery?: string; // SQL query that was executed
  generatedFile?: string; // URL к сгенерированному файлу
  fileFormat?: string; // Формат сгенерированного файла
}

interface N8nResponse {
  response: string;
  sql_query: string;
  r_script?: string; // R script for ggplot2 visualization
  generated_file?: string; // URL к сгенерированному файлу (PDF/DOC)
  file_format?: string; // Формат сгенерированного файла
}

interface Settings {
  contextLength: number;
  // Add more settings here as needed
}

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  suggested_content: string;
  confidence: number;
  empty_description: boolean;
}

interface ChatWidgetProps {
  onChartDataReceived?: (data: any) => void;
}

export default function ChatWidget({ onChartDataReceived }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Я чат-бот. Чем могу помочь?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({ contextLength: 5 });
  const [isColumnAnalysisOpen, setIsColumnAnalysisOpen] = useState(false);
  const [columnAnalysisData, setColumnAnalysisData] = useState<ColumnInfo[]>([]);
  const [isColumnAnalysisLoading, setIsColumnAnalysisLoading] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isColumnAnalysisLoadedFromStorage, setIsColumnAnalysisLoadedFromStorage] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'doc' | 'pdf'>('txt');
  // По умолчанию SQL-блоки скрыты. Показываем содержимое только для id, попавших в этот набор
  const [expandedSqlQueries, setExpandedSqlQueries] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Replace with your n8n webhook URL
  const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/chat';
  const COLUMN_ANALYSIS_WEBHOOK_URL = 'http://localhost:5678/webhook/column-analysis';

  // Initialize session ID and settings from storage
  useEffect(() => {
    const storedSessionId = getSessionId();
    const storedSettings = getSettings();
    const storedColumnAnalysis = getColumnAnalysis();
    
    setSessionId(storedSessionId);
    setSettings(storedSettings);
    setColumnAnalysisData(storedColumnAnalysis);
    
    // Устанавливаем флаг только если есть сохраненные данные
    if (storedColumnAnalysis.length > 0) {
      setIsColumnAnalysisLoadedFromStorage(true);
    }
    
    console.log('Session ID:', storedSessionId);
    console.log('Settings loaded:', storedSettings);
    console.log('Column analysis loaded:', storedColumnAnalysis.length, 'items');
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageToN8n = async (messageText: string, template?: any) => {
    console.log("sendMessageToN8n called with selectedTemplate:", selectedTemplate, "and passed template:", template);
    try {
      // Подготавливаем данные для отправки
      const requestData: any = {
        message: messageText,
        sessionId: sessionId,
        settings: {
          contextLength: settings.contextLength
        }
      };

      // Добавляем информацию о шаблоне, если он выбран
      if (selectedTemplate) {
        requestData.template = {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          format: selectedTemplate.format,
          fileUrl: selectedTemplate.fileUrl,
          type: selectedTemplate.type,
          content: selectedTemplate.content  // Добавляем содержимое шаблона
        };
      }

      // Send message to n8n webhook with session ID and settings
      const response = await axios.post(N8N_WEBHOOK_URL, requestData);

      // Выводим весь ответ для отладки
      console.log("Raw response data:", response.data);
      if (typeof response.data === 'string') {
        try {
          const parsedData = JSON.parse(response.data);
          console.log("Parsed response data:", parsedData);
        } catch (e) {
          console.log("Could not parse response data as JSON");
        }
      }
      console.log("Full response from n8n:", JSON.stringify(response.data));

      // Extract response from the n8n webhook format
      let botResponseText = 'Извините, я не смог обработать ваш запрос.';
      let chartData = null;
      let responseType = 'text';
      let imageUrl: string | undefined = undefined;
      let rScript: string | undefined = undefined;
      let generatedFile: string | undefined = undefined;
      let fileFormat: string | undefined = undefined;
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const n8nResponse = response.data[0] as N8nResponse;
        console.log("Received response from n8n:", n8nResponse);
        
        // Используем новый формат ответа
        if (n8nResponse.response) {
          botResponseText = n8nResponse.response;
        }
        
        // Проверяем наличие r_script
        if (n8nResponse.r_script) {
          console.log("Found r_script in response:", n8nResponse.r_script);
          rScript = n8nResponse.r_script;
          responseType = 'r_script';
        }
        
        // Выводим SQL запрос для отладки
        if (n8nResponse.sql_query) {
          console.log("SQL query:", n8nResponse.sql_query);
        }
        
        // Проверяем наличие сгенерированного файла
        if (n8nResponse.generated_file) {
          console.log("Generated file:", n8nResponse.generated_file);
          generatedFile = n8nResponse.generated_file;
          fileFormat = n8nResponse.file_format;
          responseType = 'file';
        }
        
        // Если есть выбранный шаблон, генерируем документ
        const templateToUse = template || selectedTemplate;
        console.log("Checking for selected template:", selectedTemplate, "and passed template:", template);
        if (templateToUse) {
          console.log("Selected template found:", templateToUse);
          try {
            setIsGeneratingReport(true);
            console.log("Generating document from template:", templateToUse);
            const result = await generateDocumentFromTemplate(templateToUse, {
              response: botResponseText,
              sql_query: n8nResponse.sql_query
            }, sessionId, selectedFormat);
            
            generatedFile = result.fileUrl;
            fileFormat = result.format;
            responseType = 'file';
            
            console.log("Document generated successfully:", result);
            console.log("Updated responseType to 'file'");
            console.log("Generated file URL:", generatedFile);
            console.log("File format:", fileFormat);
          } catch (error) {
            console.error("Error generating document:", error);
            // Не меняем responseType, оставляем как есть
          } finally {
            setIsGeneratingReport(false);
          }
        } else {
          console.log("No selected template found");
        }
      }

      // Add bot response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date(),
        chartData: chartData,
        responseType: responseType as 'text' | 'chart' | 'image' | 'r_script' | 'file',
        imageUrl: imageUrl,
        rScript: rScript,
        sqlQuery: response.data && Array.isArray(response.data) && response.data.length > 0 ? response.data[0].sql_query : undefined,
        generatedFile: generatedFile,
        fileFormat: fileFormat
      };

      console.log("Created bot message:", {
        responseType: botMessage.responseType,
        generatedFile: botMessage.generatedFile,
        fileFormat: botMessage.fileFormat
      });
      
      setMessages((prev) => [...prev, botMessage]);
      
      // Если есть R-скрипт, отправляем его в родительский компонент
      if (rScript && onChartDataReceived) {
        console.log("Sending R script to parent:", rScript);
        onChartDataReceived({ 
          type: 'r_script', 
          rScript: rScript,
          textOutput: botResponseText // Передаем текстовый вывод
        });
      }
      
      // Если есть URL изображения, отправляем его в родительский компонент
      if (imageUrl && onChartDataReceived) {
        onChartDataReceived({ 
          type: 'image', 
          imageUrl: imageUrl,
          textOutput: botResponseText // Передаем текстовый вывод
        });
      }
      
      // Сбрасываем выбранный шаблон ПОСЛЕ всех операций
      setSelectedTemplate(null);
      
    } catch (error) {
      console.error('Error sending message to webhook:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Извините, произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.',
        sender: 'bot',
        timestamp: new Date(),
        responseType: 'text'
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    await sendMessageToN8n(input, selectedTemplate);
  };

  const handleColumnAnalysis = async () => {
    setIsColumnAnalysisLoading(true);
    setIsColumnAnalysisLoadedFromStorage(false); // Сбрасываем флаг при новом анализе
    
    try {
      const response = await axios.post(COLUMN_ANALYSIS_WEBHOOK_URL, {
        sessionId: sessionId,
        settings: {
          contextLength: settings.contextLength
        }
      });

      console.log("Column analysis response:", response.data);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const analysisData = response.data[0].output;
        if (analysisData && analysisData.columns) {
          setColumnAnalysisData(analysisData.columns);
          saveColumnAnalysis(analysisData.columns); // Сохраняем данные анализа
        } else {
          setColumnAnalysisData([]);
        }
      } else {
        setColumnAnalysisData([]);
      }
    } catch (error) {
      console.error('Error analyzing columns:', error);
      setColumnAnalysisData([]);
    } finally {
      setIsColumnAnalysisLoading(false);
    }
  };

  const handleOpenColumnAnalysis = () => {
    setIsColumnAnalysisOpen(true);
    
    // Если данных анализа нет, запускаем анализ автоматически
    if (columnAnalysisData.length === 0) {
      handleColumnAnalysis();
    }
  };

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    setIsSettingsOpen(false);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        text: 'Чат очищен. Задавайте вопросы!',
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
    
    // Очистить изображение в родительском компоненте
    if (onChartDataReceived) {
      onChartDataReceived(null);
    }
    
    // Очистить данные анализа колонок
    setColumnAnalysisData([]);
    setIsColumnAnalysisLoadedFromStorage(false);
    localStorage.removeItem('sql_chat_column_analysis');
  };

  const handleClearColumnAnalysis = () => {
    setColumnAnalysisData([]);
    setIsColumnAnalysisLoadedFromStorage(false);
    localStorage.removeItem('sql_chat_column_analysis');
  };

  const handleTemplateSelect = (template: any, query?: string) => {
    console.log("handleTemplateSelect called with:", { template, query });
    // Сохраняем выбранный шаблон
    setSelectedTemplate(template);
    console.log("Selected template set:", template);
    
    if (query) {
      console.log("Query provided, sending message:", query);
      // Если передан запрос, отправляем его сразу
      setInput(query);
      // Автоматически отправляем сообщение после обновления input
      setTimeout(() => {
        const userMessage: Message = {
          id: Date.now().toString(),
          text: query,
          sender: 'user',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        
        // Вызываем логику отправки сообщения
        sendMessageToN8n(query, template);
      }, 100);
    } else {
      // Для PDF/DOC шаблонов обрабатываем как раньше
      const variables = getDefaultVariables();
      let processedContent = processTemplateVariables(template.content, variables);
      
      // Добавляем информацию о формате шаблона
      if (template.format && template.format !== 'text') {
        processedContent += `\n\nФормат шаблона: ${template.format.toUpperCase()}`;
        if (template.fileUrl) {
          processedContent += `\nФайл шаблона: ${template.fileUrl}`;
        }
      }
      
      // Вставляем обработанное содержимое шаблона в поле ввода
      setInput(processedContent);
    }
  };

  return (
    <div className="w-96 border-l border-gray-200 flex flex-col h-full bg-white shadow-lg">
      <div className="flex flex-col h-full max-h-screen">
        {/* Chat header */}
        <div className="p-4 border-b border-gray-200 bg-primary text-white flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-semibold">Chat Assistant</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsTemplatesOpen(true)}
              className="p-2 rounded-full hover:bg-primary-dark transition-colors"
              title="Шаблоны отчётов"
            >
              <FiFileText size={20} />
            </button>
            <button 
              onClick={handleOpenColumnAnalysis}
              disabled={isColumnAnalysisLoading}
              className="p-2 rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50"
              title="Анализ колонок без комментариев"
            >
              <FiDatabase size={20} />
            </button>
            <button 
              onClick={handleClearChat}
              className="p-2 rounded-full hover:bg-primary-dark transition-colors"
              title="Очистить чат"
            >
              <FiTrash2 size={20} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-primary-dark transition-colors"
              title="Настройки"
            >
              <FiSettings size={20} />
            </button>
          </div>
        </div>

        {/* Main content area with conditional rendering */}
        <div className="flex flex-grow overflow-hidden">
          {/* Chat messages */}
          <div 
            className={`flex-col flex-grow transition-all duration-300 ease-in-out ${
              isSettingsOpen ? 'w-0 opacity-0' : 'w-full opacity-100'
            }`}
            style={{ display: isSettingsOpen ? 'none' : 'flex' }}
          >
            <div className="flex-grow overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      {message.sender === 'user' ? (
                        <FiUser className="mr-2" />
                      ) : (
                        <FaRobot className="mr-2" />
                      )}
                      <span className="text-xs opacity-75">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {message.responseType === 'chart' && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                          <FiBarChart2 className="mr-1" size={12} />
                          График
                        </span>
                      )}
                      {message.responseType === 'image' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center">
                          <img src={message.imageUrl} alt="Chart" className="w-4 h-4 mr-1" />
                          Изображение
                        </span>
                      )}
                      {message.responseType === 'r_script' && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full flex items-center">
                          <FiCode className="mr-1" size={12} />
                        </span>
                      )}
                      {message.responseType === 'file' && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                          <FiDownload className="mr-1" size={12} />
                          Файл
                        </span>
                      )}
                    </div>
                    {message.sqlQuery && (
                      <div className="mb-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center justify-between p-3">
                            <span className="text-xs font-medium text-blue-700 flex items-center">
                              <FiDatabase className="mr-1" size={12} />
                              SQL Query
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedSqlQueries);
                                  if (newExpanded.has(message.id)) {
                                    newExpanded.delete(message.id);
                                  } else {
                                    newExpanded.add(message.id);
                                  }
                                  setExpandedSqlQueries(newExpanded);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                title={expandedSqlQueries.has(message.id) ? "Свернуть" : "Развернуть"}
                              >
                                {expandedSqlQueries.has(message.id) ? (
                                  <>
                                    <FiChevronUp className="mr-1" size={12} />
                                    Свернуть
                                  </>
                                ) : (
                                  <>
                                    <FiChevronDown className="mr-1" size={12} />
                                    Развернуть
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(message.sqlQuery || '');
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                                title="Копировать запрос"
                              >
                                Копировать
                              </button>
                            </div>
                          </div>
                          {expandedSqlQueries.has(message.id) && (
                            <div className="px-3 pb-3">
                              <pre className="text-xs text-blue-800 bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                                {message.sqlQuery}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <ReactMarkdown 
                      components={{
                        // Кастомные стили для элементов markdown
                        h1: ({children}) => <h1 className="text-xl font-bold mb-2 text-gray-800">{children}</h1>,
                        h2: ({children}) => <h2 className="text-lg font-semibold mb-2 text-gray-800">{children}</h2>,
                        h3: ({children}) => <h3 className="text-base font-medium mb-2 text-gray-800">{children}</h3>,
                        p: ({children}) => <p className="mb-2 text-gray-700">{children}</p>,
                        ul: ({children}) => <ul className="list-disc list-inside mb-2 text-gray-700">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal list-inside mb-2 text-gray-700">{children}</ol>,
                        li: ({children}) => <li className="mb-1">{children}</li>,
                        code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                        pre: ({children}) => <pre className="bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto mb-2">{children}</pre>,
                        blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">{children}</blockquote>,
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                        em: ({children}) => <em className="italic">{children}</em>,
                        table: ({children}) => <table className="w-full border-collapse border border-gray-300 mb-2">{children}</table>,
                        thead: ({children}) => <thead className="bg-gray-50">{children}</thead>,
                        tbody: ({children}) => <tbody>{children}</tbody>,
                        tr: ({children}) => <tr className="border-b border-gray-300">{children}</tr>,
                        th: ({children}) => <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{children}</th>,
                        td: ({children}) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                    {message.responseType === 'chart' && message.chartData && (
                      <button
                        onClick={() => onChartDataReceived && onChartDataReceived(message.chartData)}
                        className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Показать график
                      </button>
                    )}
                    {message.responseType === 'image' && message.imageUrl && (
                      <div className="mt-2">
                        <img src={message.imageUrl} alt="Chart" className="max-w-full h-auto rounded-md" />
                      </div>
                    )}
                    {message.responseType === 'r_script' && message.rScript && (
                      <div className="mt-2">
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700 flex items-center">
                              <FiCode className="mr-1" size={12} />
                              R Script
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(message.rScript || '');
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                              title="Копировать скрипт"
                            >
                              Копировать
                            </button>
                          </div>
                          <pre className="text-xs text-gray-800 bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                            {message.rScript}
                          </pre>
                        </div>
                      </div>
                    )}
                    {message.responseType === 'file' && message.generatedFile && (
                      <div className="mt-2">
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-green-700 flex items-center">
                              <FiDownload className="mr-1" size={12} />
                              Сгенерированный файл ({message.fileFormat?.toUpperCase()})
                            </span>
                            <button
                              onClick={() => {
                                window.open(message.generatedFile, '_blank');
                              }}
                              className="text-xs text-green-600 hover:text-green-800"
                              title="Скачать файл"
                            >
                              Скачать
                            </button>
                          </div>
                          <div className="text-xs text-green-800 bg-white p-2 rounded border">
                            Файл успешно сгенерирован и готов к скачиванию
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              {isLoading && (
                <div className="text-center text-sm text-gray-500 mb-2">
                  Бот печатает...
                </div>
              )}
              {isGeneratingReport && (
                <div className="text-center text-sm text-blue-500 mb-2">
                  🤖 Генерирую отчёт с помощью ИИ...
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Введите ваш вопрос..."
                  className="flex-grow border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading || isGeneratingReport}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || isGeneratingReport || !input.trim()}
                  className="bg-primary text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none disabled:opacity-50"
                >
                  <FiSend />
                </button>
              </div>
            </div>
          </div>

          {/* Settings panel */}
          <div 
            className={`flex-col flex-grow transition-all duration-300 ease-in-out ${
              isSettingsOpen ? 'w-full opacity-100' : 'w-0 opacity-0'
            }`}
            style={{ display: isSettingsOpen ? 'flex' : 'none' }}
          >
            <SettingsModal 
              settings={settings} 
              onSave={handleSettingsChange} 
              onClose={() => setIsSettingsOpen(false)}
              isSlideIn={true}
            />
          </div>
        </div>
      </div>
      
      {/* Column Analysis Modal */}
      <ColumnAnalysisModal
        isOpen={isColumnAnalysisOpen}
        onClose={() => setIsColumnAnalysisOpen(false)}
        columns={columnAnalysisData}
        isLoading={isColumnAnalysisLoading}
        onRefresh={handleColumnAnalysis}
        onClear={handleClearColumnAnalysis}
        isLoadedFromStorage={isColumnAnalysisLoadedFromStorage}
      />
      
      {/* Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onTemplateSelect={handleTemplateSelect}
        selectedFormat={selectedFormat}
        onFormatChange={setSelectedFormat}
      />
    </div>
  );
} 