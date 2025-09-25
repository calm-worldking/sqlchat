'use client';

import { useState, useEffect } from 'react';
import { FiX, FiPlus, FiEdit2, FiTrash2, FiFileText, FiSave, FiDownload, FiUpload } from 'react-icons/fi';

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  type: 'report' | 'reference';
  format: 'text' | 'pdf' | 'doc';
  fileUrl?: string; // URL к загруженному файлу шаблона
  createdAt: Date;
  updatedAt: Date;
}

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (template: any, query?: string) => void;
  selectedFormat?: 'txt' | 'doc' | 'pdf';
  onFormatChange?: (format: 'txt' | 'doc' | 'pdf') => void;
}

export default function TemplatesModal({ 
  isOpen, 
  onClose, 
  onTemplateSelect,
  selectedFormat = 'txt',
  onFormatChange
}: TemplatesModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    type: 'report' as 'report' | 'reference',
    format: 'text' as 'text' | 'pdf' | 'doc'
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [showQueryInput, setShowQueryInput] = useState(false);
  const [selectedTemplateForReport, setSelectedTemplateForReport] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Загружаем шаблоны из localStorage при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    try {
      const savedTemplates = localStorage.getItem('reportTemplates');
      
      // Принудительно обновляем шаблоны при каждом запуске
      const defaultTemplates: Template[] = [
        {
          id: '1',
          name: 'Справка по спортзалам в Казахстане',
          description: 'Подробная информация о спортзалах с детальной статистикой',
          content: `📄 Справка по спортзалам в Казахстане
Дата составления: {дата_создания}

🏙️ Город: {город}
📌 Общее количество спортзалов: {общее_количество_залов}
🧾 Список спортзалов
№	Название зала	Адрес	Виды тренировок	Время работы	Контакты
1	{название_зала}	{адрес}	{список_услуг}	{график_работы}	{телефон/сайт}
2	...	...	...	...	...

📊 Статистика по городу
Количество залов с бассейнами: {число_с_бассейнами}

Количество 24/7 залов: {число_круглосуточных}

Средняя стоимость абонемента: {средняя_цена} ₸

Популярные виды тренировок: {топ_тренировок}

🏅 Лучшие залы по отзывам пользователей
Название зала	Средняя оценка	Кол-во отзывов
{зал_1}	{рейтинг_1}⭐️	{отзывов_1}
{зал_2}	{рейтинг_2}⭐️	{отзывов_2}
...	...	...

🗺️ Распределение по районам
Район	Кол-во залов
{район_1}	{число_1}
{район_2}	{число_2}
...	...`,
          type: 'reference',
          format: 'text',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Отчёт по пользователям',
          description: 'Анализ количества пользователей по городам с детальной статистикой',
          content: `📊 Отчёт по пользователям
Дата составления: {дата_создания}

👥 Общая статистика
Общее количество пользователей: {общее_количество_пользователей}
Активных пользователей: {активных_пользователей}
Новых пользователей за месяц: {новых_за_месяц}

🏙️ Распределение по городам
Город	Количество пользователей	Процент от общего числа
{город_1}	{количество_1}	{процент_1}%
{город_2}	{количество_2}	{процент_2}%
...	...	...

👫 Демографическая статистика
Средний возраст: {средний_возраст} лет
Распределение по полу:
- Мужчины: {мужчин} ({процент_мужчин}%)
- Женщины: {женщин} ({процент_женщин}%)

📈 Активность пользователей
Средняя активность в день: {средняя_активность_в_день}
Пользователей с высокой активностью: {высокоактивных}
Пользователей с низкой активностью: {низкоактивных}

🏆 Топ городов по активности
Город	Средняя активность	Рейтинг
{топ_город_1}	{активность_1}	{рейтинг_1}
{топ_город_2}	{активность_2}	{рейтинг_2}
...	...	...`,
          type: 'report',
          format: 'text',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          name: 'Анализ активности пользователей',
          description: 'Отчёт по активности пользователей за последний месяц с графиками',
          content: `📈 Анализ активности пользователей
Дата составления: {дата_создания}
Период анализа: {период_анализа}

📊 Общая статистика активности
Общее количество активных пользователей: {общее_количество_активных}
Средняя активность в день: {средняя_активность_в_день}
Пиковая активность: {пиковая_активность}
Минимальная активность: {минимальная_активность}

📅 Активность по дням недели
День недели	Количество активных пользователей	Процент от общего числа
Понедельник	{пн_активных}	{пн_процент}%
Вторник	{вт_активных}	{вт_процент}%
Среда	{ср_активных}	{ср_процент}%
Четверг	{чт_активных}	{чт_процент}%
Пятница	{пт_активных}	{пт_процент}%
Суббота	{сб_активных}	{сб_процент}%
Воскресенье	{вс_активных}	{вс_процент}%

⏰ Активность по времени суток
Время	Количество активных пользователей
06:00-09:00	{утро_активных}
09:00-12:00	{утро_день_активных}
12:00-15:00	{день_активных}
15:00-18:00	{день_вечер_активных}
18:00-21:00	{вечер_активных}
21:00-00:00	{ночь_активных}

🏆 Топ пользователей по активности
Пользователь	Количество активных дней	Средняя активность
{топ_пользователь_1}	{дни_1}	{активность_1}
{топ_пользователь_2}	{дни_2}	{активность_2}
...	...	...

📉 Тренды активности
Тренд за неделю: {тренд_неделя}
Тренд за месяц: {тренд_месяц}
Прогноз на следующую неделю: {прогноз}`,
          type: 'report',
          format: 'text',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Всегда сохраняем новые шаблоны, заменяя старые
      saveTemplates(defaultTemplates);
      console.log('Шаблоны обновлены с правильным форматом переменных');
      
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveTemplates = (newTemplates: Template[]) => {
    try {
      localStorage.setItem('reportTemplates', JSON.stringify(newTemplates));
      setTemplates(newTemplates);
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  };

  const handleCreateTemplate = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      type: 'report',
      format: 'text'
    });
    setUploadedFile(null);
    setEditingTemplate(null);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditTemplate = (template: Template) => {
    setFormData({
      name: template.name,
      description: template.description,
      content: template.content,
      type: template.type,
      format: template.format
    });
    setUploadedFile(null);
    setEditingTemplate(template);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSaveTemplate = () => {
    if (!formData.name.trim()) {
      alert('Пожалуйста, заполните название шаблона');
      return;
    }

    // Проверяем, что для форматов PDF/DOC загружен файл
    if ((formData.format === 'pdf' || formData.format === 'doc') && !uploadedFile && !editingTemplate?.fileUrl) {
      alert('Пожалуйста, загрузите файл шаблона для выбранного формата');
      return;
    }

    // Проверяем, что для текстового формата есть содержимое
    if (formData.format === 'text' && !formData.content.trim()) {
      alert('Пожалуйста, заполните содержимое шаблона');
      return;
    }

    const newTemplate: Template = {
      id: editingTemplate?.id || Date.now().toString(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      content: formData.content.trim(),
      type: formData.type,
      format: formData.format,
      fileUrl: editingTemplate?.fileUrl || (uploadedFile ? URL.createObjectURL(uploadedFile) : undefined),
      createdAt: editingTemplate?.createdAt || new Date(),
      updatedAt: new Date()
    };

    let newTemplates: Template[];
    if (isEditing) {
      newTemplates = templates.map(t => t.id === editingTemplate?.id ? newTemplate : t);
    } else {
      newTemplates = [...templates, newTemplate];
    }

    saveTemplates(newTemplates);
    setShowForm(false);
    setFormData({ name: '', description: '', content: '', type: 'report', format: 'text' });
    setEditingTemplate(null);
    setIsEditing(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот шаблон?')) {
      const newTemplates = templates.filter(t => t.id !== templateId);
      saveTemplates(newTemplates);
    }
  };

  const handleUseTemplate = (template: Template) => {
    if (template.format === 'text') {
      // Для текстовых шаблонов показываем поле для ввода запроса
      setSelectedTemplateForReport(template);
      setShowQueryInput(true);
    } else {
      // Для PDF/DOC шаблонов сразу отправляем в чат
      if (onTemplateSelect) {
        onTemplateSelect(template);
        onClose();
      }
    }
  };

  const handleGenerateReport = () => {
    if (!queryInput.trim()) {
      alert('Пожалуйста, введите запрос для генерации отчёта');
      return;
    }

    if (onTemplateSelect && selectedTemplateForReport) {
      onTemplateSelect(selectedTemplateForReport, queryInput.trim());
      setShowQueryInput(false);
      setQueryInput('');
      setSelectedTemplateForReport(null);
      onClose();
    }
  };

  const handleExportTemplates = () => {
    try {
      const dataStr = JSON.stringify(templates, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'report-templates.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting templates:', error);
      alert('Ошибка при экспорте шаблонов');
    }
  };

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTemplates = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedTemplates)) {
          const newTemplates = [...templates, ...importedTemplates];
          saveTemplates(newTemplates);
          alert(`Импортировано ${importedTemplates.length} шаблонов`);
        } else {
          alert('Неверный формат файла');
        }
      } catch (error) {
        console.error('Error importing templates:', error);
        alert('Ошибка при импорте шаблонов');
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются только файлы PDF и DOC/DOCX');
      return;
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    setUploadedFile(file);
    
    // Автоматически устанавливаем формат на основе типа файла
    if (file.type === 'application/pdf') {
      setFormData({ ...formData, format: 'pdf' });
    } else if (file.type.includes('word')) {
      setFormData({ ...formData, format: 'doc' });
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFormData({ ...formData, format: 'text' });
  };

  // Функция для подсветки найденного текста
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  // Фильтрация шаблонов по поисковому запросу
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FiFileText className="text-blue-600" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Шаблоны отчётов</h2>
              <p className="text-gray-600">Выберите шаблон для генерации отчёта</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Формат документа */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Формат:</span>
              <select
                value={selectedFormat}
                onChange={(e) => onFormatChange?.(e.target.value as 'txt' | 'doc' | 'pdf')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="txt">TXT</option>
                <option value="doc">DOC</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar with templates list */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <button
                onClick={handleCreateTemplate}
                className="w-full flex items-center justify-center p-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors mb-4"
              >
                <FiPlus className="mr-2" size={16} />
                Создать шаблон
              </button>

              {/* Поиск по шаблонам */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию, описанию или содержимому..."
                    className="w-full p-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <div className="mt-2 text-xs text-gray-500">
                    Найдено: {filteredTemplates.length} из {templates.length} шаблонов
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {filteredTemplates.length === 0 && searchQuery ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">По запросу "{searchQuery}" ничего не найдено</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs text-primary hover:text-primary-dark underline"
                    >
                      Очистить поиск
                    </button>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-3 border border-gray-200 rounded-lg hover:border-primary transition-colors cursor-pointer"
                      onClick={() => handleUseTemplate(template)}
                    >
                    <div className="flex items-center justify-between mb-2">
                      <h3 
                        className="font-medium text-gray-800 truncate"
                        dangerouslySetInnerHTML={{ 
                          __html: searchQuery ? highlightText(template.name, searchQuery) : template.name 
                        }}
                      />
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template);
                          }}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Редактировать"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                          title="Удалить"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p 
                      className="text-sm text-gray-600 mb-2 line-clamp-2"
                      dangerouslySetInnerHTML={{ 
                        __html: searchQuery ? highlightText(template.description, searchQuery) : template.description 
                      }}
                    />
                                         <div className="flex items-center justify-between text-xs text-gray-500">
                       <div className="flex space-x-1">
                         <span className={`px-2 py-1 rounded-full ${
                           template.type === 'report' 
                             ? 'bg-blue-100 text-blue-800' 
                             : 'bg-green-100 text-green-800'
                         }`}>
                           {template.type === 'report' ? 'Отчёт' : 'Справка'}
                         </span>
                                                   <span className={`px-2 py-1 rounded-full ${
                            (!template.format || template.format === 'text')
                              ? 'bg-gray-100 text-gray-800'
                              : template.format === 'pdf'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {(template.format || 'text').toUpperCase()}
                          </span>
                       </div>
                       <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
                     </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto">
            {showForm ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {isEditing ? 'Редактировать шаблон' : 'Создать шаблон'}
                  </h3>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название шаблона *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Введите название шаблона"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Описание
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      placeholder="Краткое описание шаблона"
                    />
                  </div>

                                     <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Тип шаблона
                     </label>
                     <select
                       value={formData.type}
                       onChange={(e) => setFormData({ ...formData, type: e.target.value as 'report' | 'reference' })}
                       className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                     >
                       <option value="report">Отчёт</option>
                       <option value="reference">Справка</option>
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Формат шаблона
                     </label>
                     <select
                       value={formData.format}
                       onChange={(e) => setFormData({ ...formData, format: e.target.value as 'text' | 'pdf' | 'doc' })}
                       className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                     >
                       <option value="text">Текстовый</option>
                       <option value="pdf">PDF</option>
                       <option value="doc">DOC/DOCX</option>
                     </select>
                   </div>

                   {(formData.format === 'pdf' || formData.format === 'doc') && (
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Загрузить файл шаблона *
                       </label>
                       <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                         {uploadedFile ? (
                           <div>
                             <p className="text-sm text-gray-600 mb-2">Загружен файл: {uploadedFile.name}</p>
                             <button
                               type="button"
                               onClick={handleRemoveFile}
                               className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                             >
                               Удалить файл
                             </button>
                           </div>
                         ) : (
                           <div>
                             <p className="text-sm text-gray-600 mb-2">
                               Перетащите файл сюда или нажмите для выбора
                             </p>
                             <input
                               type="file"
                               accept=".pdf,.doc,.docx"
                               onChange={handleFileUpload}
                               className="hidden"
                               id="template-file-upload"
                             />
                             <label
                               htmlFor="template-file-upload"
                               className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark cursor-pointer"
                             >
                               Выбрать файл
                             </label>
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {formData.format === 'text' && (
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Содержимое шаблона *
                       </label>
                       <textarea
                         value={formData.content}
                         onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                         rows={12}
                         placeholder="Введите содержимое шаблона..."
                       />
                       <p className="text-xs text-gray-500 mt-1">
                         Используйте переменные в формате {'{variable}'} для динамического контента
                       </p>
                     </div>
                   )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center"
                    >
                      <FiSave className="mr-2" size={16} />
                      {isEditing ? 'Сохранить' : 'Создать'}
                    </button>
                  </div>
                </div>
              </div>
            ) : showQueryInput ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Генерация отчёта
                  </h3>
                  <button
                    onClick={() => {
                      setShowQueryInput(false);
                      setQueryInput('');
                      setSelectedTemplateForReport(null);
                    }}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Выбранный шаблон:</h4>
                    <p className="text-blue-700">{selectedTemplateForReport?.name}</p>
                    <p className="text-sm text-blue-600 mt-1">{selectedTemplateForReport?.description}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Запрос для генерации отчёта *
                    </label>
                    <textarea
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={4}
                      placeholder="Введите ваш запрос для генерации отчёта..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Например: "Покажи количество пользователей по городам" или "Создай отчёт по активности за последний месяц"
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setShowQueryInput(false);
                        setQueryInput('');
                        setSelectedTemplateForReport(null);
                      }}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleGenerateReport}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center"
                    >
                      <FiFileText className="mr-2" size={16} />
                      Сгенерировать отчёт
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <FiFileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Выберите шаблон слева или создайте новый</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 