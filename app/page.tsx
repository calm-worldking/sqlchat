'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ChatWidget from './components/ChatWidget';
import { FiImage, FiCode } from 'react-icons/fi';

// Define data type for visualization
interface VisualizationData {
  type: string;
  imageUrl?: string;
  rScript?: string;
  textOutput?: string;
}

export default function Home() {
  // URL вашего сервера для выполнения R-скриптов
  const R_EXECUTION_SERVER = 'http://localhost:3001/execute-r';
    const MAX_R_TIMEOUT_MS = 120000; // 120 секунд на выполнение R-скрипта
    const MAX_R_RETRIES = 2; // количество повторных попыток при таймауте/временных ошибках
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Интерфейс для результата таблицы
  interface TableResult {
    htmlContent: string;
    jsonData: any;
    pdfUrl?: string;
    csvUrl?: string;
  }

  const [visualData, setVisualData] = useState<VisualizationData | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultTable, setResultTable] = useState<TableResult | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Effect to execute R script when it's received
  useEffect(() => {
    if (visualData?.type === 'r_script' && visualData.rScript && !isExecuting && !resultImage) {
      executeRScript(visualData.rScript);
    }
  }, [visualData]);

  // Effect to check server status on mount
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        setServerStatus('checking');
        await axios.get(`${R_EXECUTION_SERVER.split('/execute-r')[0]}/health`, {
          timeout: 5000
        });
        setServerStatus('online');
      } catch (error) {
        setServerStatus('offline');
      }
    };

    checkServerStatus();
  }, []);

  // Function to handle receiving visualization data from ChatWidget
  const handleVisualizationDataReceived = (data: any) => {
    console.log("Visualization data received in parent:", data);
    
    // Если получен R-скрипт, сбрасываем предыдущие результаты
    if (data && data.type === 'r_script') {
      setResultImage(null);
      setResultTable(null);
      setError(null);
    }
    
    setVisualData(data);
  };

  // Function to execute R script on the server
  const executeRScript = async (script: string) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      console.log("Executing R script on server");
      
      // Получаем текстовый вывод, если он есть
      const textOutput = visualData?.textOutput || '';
      
      // Отправляем R-скрипт на сервер с увеличенным таймаутом и ретраями
      let response: any;
      let lastError: any = null;
      for (let attempt = 0; attempt <= MAX_R_RETRIES; attempt++) {
        try {
          response = await axios.post(R_EXECUTION_SERVER, {
            script: script,
            text: textOutput
          }, {
            timeout: MAX_R_TIMEOUT_MS
          });
          break; // успех
        } catch (err: any) {
          lastError = err;
          const status = err?.response?.status;
          const isTimeout = err?.code === 'ECONNABORTED';
          const isRetryable = isTimeout || status === 502 || status === 503 || status === 504;
          if (attempt < MAX_R_RETRIES && isRetryable) {
            const backoffMs = 1500 * (attempt + 1);
            console.warn(`R-server request failed (attempt ${attempt + 1}). Retrying in ${backoffMs} ms...`);
            await sleep(backoffMs);
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        throw lastError || new Error('Не удалось получить ответ от сервера R');
      }
      
      console.log("Server response:", response.data);
      
      if (response.data && response.data.success && response.data.result) {
        const result = response.data.result;
        
        if (result.type === 'image' && result.imageUrl) {
          // Для изображений
          setResultImage(result.imageUrl);
          setResultTable(null);
          
          // Сохраняем URL PDF для последующего использования
          console.log("PDF URL для графика:", result.pdfUrl);
          setPdfUrl(result.pdfUrl || null);
        } else if (result.type === 'table' && result.htmlContent) {
          // Для таблиц
          setResultImage(null);
          setPdfUrl(null); // Сбрасываем URL PDF для изображений
          
          // Проверяем наличие URL для PDF и CSV
          if (!result.pdfUrl) {
            console.warn("Отсутствует URL для PDF таблицы");
          }
          if (!result.csvUrl) {
            console.warn("Отсутствует URL для CSV таблицы");
          }
          
          console.log("PDF URL для таблицы:", result.pdfUrl);
          console.log("CSV URL для таблицы:", result.csvUrl);
          console.log("HTML URL для таблицы:", result.htmlUrl);
          console.log("JSON URL для таблицы:", result.jsonUrl);
          
          // Создаем объект с результатами таблицы
          const tableResult: TableResult = {
            htmlContent: result.htmlContent,
            jsonData: result.jsonData,
            pdfUrl: result.pdfUrl || null,
            csvUrl: result.csvUrl || null
          };
          
          setResultTable(tableResult);
        } else {
          setError('Неизвестный тип результата');
        }
      } else {
        setError('Не удалось получить результат выполнения скрипта');
      }
    } catch (err: any) {
      console.error('Error executing R script:', err);
      
      let errorMessage = 'Произошла ошибка при выполнении R-скрипта';
      
      // Более детальная обработка ошибок
      if (err.code === 'ECONNREFUSED') {
        errorMessage = 'Сервер R недоступен. Убедитесь, что сервер запущен на порту 3001.';
      } else if (err.code === 'ENOTFOUND') {
        errorMessage = 'Не удается подключиться к серверу R. Проверьте настройки подключения.';
      } else if (err.response) {
        // Ошибка от сервера
        const status = err.response.status;
        if (status === 500) {
          const reqId = err.response.data?.requestId ? ` (ID: ${err.response.data.requestId})` : '';
          const tailStderr = (err.response.data?.stderr || '').toString().split('\n').slice(-5).join('\n');
          errorMessage = `Внутренняя ошибка сервера R${reqId}. Последние строки лога:\n${tailStderr || '—'}`;
        } else if (status === 404) {
          errorMessage = 'Эндпоинт R-сервера не найден. Проверьте конфигурацию.';
        } else {
          errorMessage = `Ошибка сервера: ${status} - ${err.response.data?.message || 'Неизвестная ошибка'}`;
        }
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Превышено время ожидания ответа от сервера R. Попробуйте еще раз.';
      } else if (err.message) {
        errorMessage = `Ошибка подключения: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  };

  // Функция для скачивания файлов
  const downloadFile = (url: string, filename: string) => {
    if (!url) {
      console.error(`URL для ${filename} отсутствует`);
      return;
    }
    
    console.log(`Скачивание файла: ${url} как ${filename}`);
    
    // Создаем полный URL, если это относительный путь
    let fullUrl = url;
    if (url.startsWith('/')) {
      const baseUrl = R_EXECUTION_SERVER.split('/').slice(0, 3).join('/');
      fullUrl = `${baseUrl}${url}`;
      console.log(`Преобразован относительный URL в абсолютный: ${fullUrl}`);
    } else if (!url.startsWith('data:') && !url.startsWith('http')) {
      // Если URL не начинается с data: или http, добавляем базовый URL
      const baseUrl = R_EXECUTION_SERVER.split('/').slice(0, 3).join('/');
      fullUrl = `${baseUrl}/${url}`;
      console.log(`Добавлен базовый URL: ${fullUrl}`);
    }
    
    // Для отладки
    console.log(`Итоговый URL для скачивания: ${fullUrl}`);
    
    try {
      // Создаем элемент для скачивания
      const a = document.createElement('a');
      a.href = fullUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      
      // Для файлов, которые могут не скачаться как загрузка, открываем в новом окне
      if (!url.startsWith('data:')) {
        window.open(fullUrl, '_blank');
      }
      
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Ошибка при скачивании файла: ${error}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full h-screen">
        {/* Center content - visualization display or placeholder */}
        <div className="flex-grow flex items-center justify-center overflow-hidden">
          <div className="h-full w-full p-8 flex flex-col">
            {visualData && visualData.type === 'image' && visualData.imageUrl ? (
              <div className="visualization-container w-full h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-4 text-primary flex items-center justify-center">
                  <FiImage className="mr-2" /> Визуализация данных
                </h2>
                <div className="bg-white rounded-lg shadow-lg p-6 flex-grow flex flex-col overflow-hidden">
                  <div className="flex flex-col items-center justify-center flex-grow overflow-auto">
                    <div className="relative p-1 border-4 border-primary/20 rounded-lg shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg"></div>
                      <img 
                        src={visualData.imageUrl} 
                        alt="Визуализация данных" 
                        className="max-w-full max-h-[600px] rounded-lg shadow-inner z-10 relative" 
                      />
                    </div>
                    <p className="mt-6 text-gray-600 italic">
                      Визуализация сгенерирована на основе ваших данных
                    </p>
                  </div>
                </div>
              </div>
            ) : visualData && visualData.type === 'r_script' ? (
              <div className="visualization-container w-full h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-4 text-primary flex items-center justify-center">
                  <FiCode className="mr-2" /> Визуализация данных (R)
                </h2>
                <div className="bg-white rounded-lg shadow-lg p-6 flex-grow flex flex-col overflow-hidden">
                  {isExecuting ? (
                    <div className="flex flex-col items-center justify-center flex-grow">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                      <p className="mt-4 text-gray-600">Выполняется построение графика...</p>
                      <div className="mt-4 text-sm text-gray-500 text-center max-w-md">
                        <p>Это может занять несколько секунд</p>
                        <p className="mt-1">Сервер R обрабатывает ваш запрос</p>
                      </div>
                    </div>
                  ) : resultImage ? (
                    <div className="flex flex-col items-center justify-center flex-grow overflow-auto">
                      <div className="relative p-1 border-4 border-primary/20 rounded-lg shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg"></div>
                        <img 
                          src={resultImage} 
                          alt="Визуализация данных" 
                          className="max-w-full max-h-[600px] rounded-lg shadow-inner z-10 relative" 
                        />
                      </div>
                      <div className="mt-6 flex items-center justify-between w-full">
                        <p className="text-gray-600 italic">
                          График построен с использованием R и библиотеки ggplot2
                          {visualData?.textOutput && (
                            <span className="block text-xs text-gray-500 mt-1">
                              PDF включает текстовый отчет
                            </span>
                          )}
                        </p>
                        {pdfUrl && (
                          <button
                            onClick={() => downloadFile(pdfUrl, 'chart_data.pdf')}
                            className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm font-medium flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                            Скачать PDF
                          </button>
                        )}
                      </div>
                    </div>
                  ) : resultTable ? (
                    <div className="flex flex-col w-full h-full">
                      <div className="overflow-auto flex-grow">
                        <div 
                          className="table-container h-full"
                          dangerouslySetInnerHTML={{ __html: resultTable.htmlContent }}
                        />
                      </div>
                      <style jsx global>{`
                        .table-container {
                          padding: 1rem;
                          min-width: 100%;
                        }
                        .table-container table {
                          width: 100%;
                          border-collapse: collapse;
                          margin-bottom: 1rem;
                          font-size: 0.9rem;
                        }
                        .table-container th {
                          background-color: #f0f9ff;
                          color: #1e40af;
                          font-weight: bold;
                          text-align: left;
                          padding: 0.75rem;
                          border: 1px solid #e5e7eb;
                          position: sticky;
                          top: 0;
                          z-index: 10;
                        }
                        .table-container td {
                          padding: 0.75rem;
                          border: 1px solid #e5e7eb;
                        }
                        .table-container tr:nth-child(even) {
                          background-color: #f9fafb;
                        }
                        .table-container tr:hover {
                          background-color: #f0f9ff;
                        }
                        .data-table {
                          width: 100%;
                          border-collapse: collapse;
                          margin-bottom: 1rem;
                        }
                        .data-table th {
                          background-color: #f0f9ff;
                          color: #1e40af;
                          font-weight: bold;
                          text-align: left;
                          padding: 0.75rem;
                          border: 1px solid #e5e7eb;
                          position: sticky;
                          top: 0;
                          z-index: 10;
                        }
                        .data-table td {
                          padding: 0.75rem;
                          border: 1px solid #e5e7eb;
                        }
                        .data-table tr:nth-child(even) {
                          background-color: #f9fafb;
                        }
                        .data-table tr:hover {
                          background-color: #f0f9ff;
                        }
                      `}</style>
                      <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
                        <p className="text-gray-600 italic">
                          Таблица создана на основе ваших данных
                          {visualData?.textOutput && (
                            <span className="block text-xs text-gray-500 mt-1">
                              PDF включает текстовый отчет
                            </span>
                          )}
                        </p>
                        <div className="flex space-x-2">
                          {resultTable.pdfUrl && (
                            <button
                              onClick={() => downloadFile(resultTable.pdfUrl!, 'table_data.pdf')}
                              className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm font-medium flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                              </svg>
                              PDF
                            </button>
                          )}
                          {resultTable.csvUrl && (
                            <button
                              onClick={() => downloadFile(resultTable.csvUrl!, 'table_data.csv')}
                              className="px-4 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm font-medium flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              CSV
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const dataStr = JSON.stringify(resultTable.jsonData, null, 2);
                              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                              downloadFile(dataUri, 'table_data.json');
                            }}
                            className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm font-medium flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            JSON
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center flex-grow">
                      <div className="text-center">
                        <div className="mb-4">
                          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Произошла ошибка при выполнении R-скрипта</h3>
                        <p className="text-red-500 mb-4">{error}</p>
                        <div className="text-sm text-gray-600 mb-6">
                          <div className="flex items-center justify-center mb-3">
                            <span className="mr-2">Статус сервера R:</span>
                            {serverStatus === 'online' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                                Онлайн
                              </span>
                            )}
                            {serverStatus === 'offline' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
                                Офлайн
                              </span>
                            )}
                            {serverStatus === 'checking' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1 animate-pulse"></div>
                                Проверка...
                              </span>
                            )}
                          </div>
                          <p>Возможные причины:</p>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Сервер R временно недоступен</li>
                            <li>Ошибка в синтаксисе R-скрипта</li>
                            <li>Отсутствуют необходимые библиотеки</li>
                            <li>Проблемы с данными</li>
                          </ul>
                        </div>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => visualData.rScript && executeRScript(visualData.rScript)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Попробовать снова
                          </button>
                          <button 
                            onClick={() => {
                              setServerStatus('checking');
                              axios.get(`${R_EXECUTION_SERVER.split('/execute-r')[0]}/health`, {
                                timeout: 5000
                              }).then(() => setServerStatus('online')).catch(() => setServerStatus('offline'));
                            }}
                            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                          >
                            Проверить сервер
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-grow">
                      <p className="text-gray-600">Подготовка к построению графика...</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <h1 className="text-4xl font-bold mb-8 text-primary">Chat Assistant</h1>
                <div className="mb-8 flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    {/* Внешний круг с градиентом */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 animate-pulse" style={{animationDuration: '3s'}} />
                    
                    {/* Средний круг */}
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 animate-pulse" style={{animationDuration: '2.5s'}} />
                    
                    {/* Внутренний круг */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-300 to-purple-400 animate-pulse" style={{animationDuration: '2s'}} />
                    
                    {/* Центральный круг с надписью SQL */}
                    <div className="absolute inset-8 rounded-full bg-gradient-to-br from-white to-blue-50 shadow-lg flex items-center justify-center">
                      <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        SQL
                      </span>
                    </div>
                    
                    {/* Дополнительные декоративные элементы */}
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}} />
                    <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '1s'}} />
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '1.5s'}} />
                  </div>
                </div>
                <p className="text-xl mb-4 text-center text-gray-600 max-w-md">
                  Добро пожаловать! Задавайте вопросы в чате справа и получайте подробные ответы.
                </p>
                <div className="flex space-x-2 mt-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.3s'}} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{animationDelay: '0.6s'}} />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Chat widget */}
        <ChatWidget onChartDataReceived={handleVisualizationDataReceived} />
      </div>
    </main>
  );
} 