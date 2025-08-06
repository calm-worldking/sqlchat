// Тестовый файл для проверки API генерации документов
// Этот файл можно удалить после тестирования

export async function testGenerateDocument() {
  const testData = {
    template: {
      id: 'test-1',
      name: 'Тестовый шаблон',
      format: 'text' as const,
      type: 'report' as const
    },
    data: {
      response: 'Тестовый ответ от системы',
      sql_query: 'SELECT * FROM test_table',
      r_script: 'library(ggplot2)\n# Тестовый R скрипт'
    },
    format: 'text'
  };

  try {
    const response = await fetch('/api/templates/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('Test result:', result);
    return result;
  } catch (error) {
    console.error('Test error:', error);
    throw error;
  }
} 