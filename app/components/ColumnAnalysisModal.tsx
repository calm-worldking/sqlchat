'use client';

import { useState } from 'react';
import { FiX, FiDatabase, FiFileText, FiDownload, FiRefreshCw, FiTrash2 } from 'react-icons/fi';

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  suggested_content: string;
  confidence: number;
  empty_description: boolean;
}

interface ColumnAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnInfo[];
  isLoading: boolean;
  onRefresh: () => void;
  onClear: () => void;
  isLoadedFromStorage?: boolean;
}

export default function ColumnAnalysisModal({ 
  isOpen, 
  onClose, 
  columns, 
  isLoading, 
  onRefresh,
  onClear,
  isLoadedFromStorage = false
}: ColumnAnalysisModalProps) {
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedDescriptionFilter, setSelectedDescriptionFilter] = useState<string>('all');
  
  if (!isOpen) return null;

  const tables = Array.from(new Set(columns.map(col => col.table_name)));
  
  // Фильтрация по таблице
  let filteredColumns = selectedTable === 'all' 
    ? columns 
    : columns.filter(col => col.table_name === selectedTable);
  
  // Фильтрация по наличию описания
  if (selectedDescriptionFilter === 'with_description') {
    filteredColumns = filteredColumns.filter(col => !col.empty_description);
  } else if (selectedDescriptionFilter === 'without_description') {
    filteredColumns = filteredColumns.filter(col => col.empty_description);
  }

     const exportToCSV = () => {
     const headers = ['Таблица', 'Колонка', 'Тип данных', 'Nullable', 'Предполагаемое содержимое', 'Уверенность', 'Без описания'];
     const csvContent = [
       headers.join(','),
       ...filteredColumns.map(col => [
         col.table_name,
         col.column_name,
         col.data_type,
         col.is_nullable,
         `"${col.suggested_content}"`,
         col.confidence,
         col.empty_description ? 'Да' : 'Нет'
       ].join(','))
     ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `column_analysis_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FiDatabase className="text-blue-600" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Анализ колонок</h2>
              <p className="text-gray-600">
                Найдено {columns.length} колонок
                {isLoadedFromStorage && !isLoading && (
                  <span className="ml-2 text-blue-600 text-sm">(загружено из сохранения)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClear}
              disabled={isLoading || columns.length === 0}
              className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50"
              title="Очистить данные анализа"
            >
              <FiTrash2 size={20} />
            </button>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50"
              title="Обновить анализ"
            >
              <FiRefreshCw className={`${isLoading ? 'animate-spin' : ''}`} size={20} />
            </button>
            <button
              onClick={exportToCSV}
              className="p-2 text-gray-600 hover:text-green-600"
              title="Экспорт в CSV"
            >
              <FiDownload size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-red-600"
              title="Закрыть"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

                 {/* Filters */}
         <div className="p-4 border-b border-gray-200 bg-gray-50">
           <div className="flex items-center space-x-4">
             <label className="text-sm font-medium text-gray-700">Фильтр по таблице:</label>
             <select
               value={selectedTable}
               onChange={(e) => setSelectedTable(e.target.value)}
               className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             >
               <option value="all">Все таблицы ({tables.length})</option>
               {tables.map(table => (
                 <option key={table} value={table}>
                   {table} ({columns.filter(col => col.table_name === table).length})
                 </option>
               ))}
             </select>
             
             <label className="text-sm font-medium text-gray-700">Фильтр по описанию:</label>
             <select
               value={selectedDescriptionFilter}
               onChange={(e) => setSelectedDescriptionFilter(e.target.value)}
               className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             >
               <option value="all">Все колонки</option>
               <option value="with_description">С описанием</option>
               <option value="without_description">Без описания</option>
             </select>
           </div>
         </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-3">
                <FiRefreshCw className="animate-spin text-blue-600" size={24} />
                <span className="text-gray-600">Анализируем колонки...</span>
              </div>
            </div>
                     ) : filteredColumns.length === 0 ? (
             <div className="flex items-center justify-center p-8">
               <div className="text-center">
                 <FiFileText className="mx-auto text-gray-400" size={48} />
                 <p className="mt-2 text-gray-600">Колонки не найдены</p>
               </div>
             </div>
          ) : (
                         <div className="p-6 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
               <div className="grid gap-4">
                 {filteredColumns.map((column, index) => (
                   <div key={index} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                     column.empty_description 
                       ? 'border-yellow-200 bg-yellow-50' 
                       : 'border-green-200 bg-green-50'
                   }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            {column.table_name}
                          </span>
                          <span className="text-lg font-semibold text-gray-900">
                            {column.column_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({column.data_type})
                          </span>
                                                     {column.is_nullable === 'YES' && (
                             <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                               NULL
                             </span>
                           )}
                           {column.empty_description ? (
                             <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                               Без описания
                             </span>
                           ) : (
                             <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                               С описанием
                             </span>
                           )}
                        </div>
                        <div className="mb-2">
                          <p className="text-gray-700">{column.suggested_content}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${column.confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {column.confidence}% уверенность
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

                 {/* Footer */}
         <div className="p-4 border-t border-gray-200 bg-gray-50">
           <div className="flex items-center justify-between text-sm text-gray-600">
             <div className="flex items-center space-x-4">
               <span>Показано {filteredColumns.length} из {columns.length} колонок</span>
               <span className="text-green-600">С описанием: {columns.filter(col => !col.empty_description).length}</span>
               <span className="text-yellow-600">Без описания: {columns.filter(col => col.empty_description).length}</span>
             </div>
             <span>Последнее обновление: {new Date().toLocaleString()}</span>
           </div>
         </div>
      </div>
    </div>
  );
} 