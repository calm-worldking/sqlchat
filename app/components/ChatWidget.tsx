'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FiSend, FiUser, FiSettings, FiTrash2, FiBarChart2, FiCode } from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import SettingsModal from './SettingsModal';
import { getSessionId, getSettings, saveSettings } from '../utils/storage';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  chartData?: any; // Optional chart data
  responseType?: 'text' | 'chart' | 'image' | 'r_script'; // Type of response
  imageUrl?: string; // URL to image if available
  rScript?: string; // R script for ggplot2 visualization
}

interface N8nResponse {
  output: {
    Full_response_report: string;
    chart_data?: any; // Data for charts if available
    response_type?: 'text' | 'chart' | 'image' | 'r_script'; // Type of response
    imageUrl?: string; // URL to image if response_type is 'image'
    r_script?: string; // R script for ggplot2 visualization
  };
}

interface Settings {
  contextLength: number;
  // Add more settings here as needed
}

interface ChatWidgetProps {
  onChartDataReceived?: (data: any) => void;
}

export default function ChatWidget({ onChartDataReceived }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Я чат-бот SQL Chat. Чем могу помочь?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({ contextLength: 5 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Replace with your n8n webhook URL
  const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook-test/chat';

  // Initialize session ID and settings from storage
  useEffect(() => {
    const storedSessionId = getSessionId();
    const storedSettings = getSettings();
    
    setSessionId(storedSessionId);
    setSettings(storedSettings);
    
    console.log('Session ID:', storedSessionId);
    console.log('Settings loaded:', storedSettings);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    try {
      // Send message to n8n webhook with session ID and settings
      const response = await axios.post(N8N_WEBHOOK_URL, {
        message: input,
        sessionId: sessionId,
        settings: {
          contextLength: settings.contextLength
        }
      });

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
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const n8nResponse = response.data[0] as N8nResponse;
        console.log("Received response from n8n:", n8nResponse.output);
        
        // Проверяем все поля в ответе
        const output = response.data[0].output;
        if (output) {
          console.log("All fields in output:", Object.keys(output));
          
          // Проверяем каждое поле на наличие r_script или подобного
          for (const key of Object.keys(output)) {
            if (key.toLowerCase().includes('script') || key.toLowerCase().includes('r_')) {
              console.log(`Found potential script field: ${key}:`, output[key]);
            }
          }
        }
        
        // Проверяем наличие r_script напрямую в ответе
        if (response.data[0].output && response.data[0].output.r_script) {
          console.log("Found r_script directly in response:", response.data[0].output.r_script);
        }
        
        if (n8nResponse.output) {
          // Всегда берем текст ответа, если он есть
          if (n8nResponse.output.Full_response_report) {
            botResponseText = n8nResponse.output.Full_response_report;
          }
          
          // Ищем поле r_script независимо от регистра
          const output = n8nResponse.output as Record<string, any>;
          for (const key of Object.keys(output)) {
            if (key.toLowerCase() === 'r_script') {
              console.log(`Found r_script field with key ${key}:`, output[key]);
              rScript = output[key];
              responseType = 'r_script';
              break;
            }
          }
          
          // Если не нашли r_script, проверяем наличие URL изображения
          if (!rScript && n8nResponse.output.imageUrl) {
            imageUrl = n8nResponse.output.imageUrl;
            responseType = 'image';
          }
          
          // Если указан тип ответа в response_type, используем его
          if (n8nResponse.output.response_type) {
            responseType = n8nResponse.output.response_type;
          }
        }
      }

      // Add bot response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date(),
        chartData: chartData,
        responseType: responseType as 'text' | 'chart' | 'image' | 'r_script',
        imageUrl: imageUrl,
        rScript: rScript
      };

      console.log("Created bot message with r_script:", botMessage.rScript);
      
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

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    setIsSettingsOpen(false);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        text: 'Чат очищен. Чем могу помочь?',
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
    
    // Очистить изображение в родительском компоненте
    if (onChartDataReceived) {
      onChartDataReceived(null);
    }
  };

  return (
    <div className="w-96 border-l border-gray-200 flex flex-col h-full bg-white shadow-lg">
      <div className="flex flex-col h-full max-h-screen">
        {/* Chat header */}
        <div className="p-4 border-b border-gray-200 bg-primary text-white flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-semibold">SQL Chat Assistant</h2>
          <div className="flex space-x-2">
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
                    </div>
                    <p className="whitespace-pre-wrap">{message.text}</p>
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
                    {message.responseType === 'r_script' && (
                      <div className="mt-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <div className="animate-pulse w-4 h-4 bg-purple-400 rounded-full mr-2"></div>
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
              <div className="flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Введите ваш вопрос..."
                  className="flex-grow border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
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
    </div>
  );
} 