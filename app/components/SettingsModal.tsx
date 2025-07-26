'use client';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';

interface Settings {
  contextLength: number;
  // Add more settings here as needed
}

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
  isSlideIn?: boolean; // Optional prop to determine if modal should slide in
}

export default function SettingsModal({ settings, onSave, onClose, isSlideIn = false }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<Settings>({
    ...settings,
  });

  const handleSave = () => {
    onSave(localSettings);
  };

  // If isSlideIn is true, render an inline version without the modal overlay
  if (isSlideIn) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Настройки</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-grow overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Длина контекста (количество сообщений)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={localSettings.contextLength}
              onChange={(e) => 
                setLocalSettings({
                  ...localSettings,
                  contextLength: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Определяет, сколько предыдущих сообщений будет отправлено в n8n для контекста.
            </p>
          </div>
          
          {/* Add more settings here as needed */}
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Original modal version with overlay for non-slide-in cases
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-80 max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Настройки</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Длина контекста (количество сообщений)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={localSettings.contextLength}
              onChange={(e) => 
                setLocalSettings({
                  ...localSettings,
                  contextLength: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Определяет, сколько предыдущих сообщений будет отправлено в n8n для контекста.
            </p>
          </div>
          
          {/* Add more settings here as needed */}
          
          <div className="flex justify-end space-x-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 