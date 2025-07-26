const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Чтение тестового R-скрипта с таблицей data.frame
const scriptPath = path.join(__dirname, 'test-data-table.R');
const script = fs.readFileSync(scriptPath, 'utf8');

// URL сервера
const serverUrl = 'http://localhost:3001/execute-r';

// Функция для тестирования API
async function testApi() {
  try {
    console.log('Отправляем тестовый скрипт с таблицей на API...');
    
    const response = await axios.post(serverUrl, { script });
    
    console.log('Тип ответа:', response.data.result?.type);
    
    if (response.data.success) {
      if (response.data.result?.type === 'table') {
        console.log('✅ Таблица успешно получена!');
        console.log('HTML URL:', response.data.result.htmlUrl);
        console.log('JSON URL:', response.data.result.jsonUrl);
        
        // Выводим первые 5 строк данных
        console.log('\nПервые 5 строк данных:');
        const rows = response.data.result.jsonData.slice(0, 5);
        console.table(rows);
        
        // Сохраняем HTML в файл для просмотра
        const htmlOutputPath = path.join(__dirname, 'table-output.html');
        fs.writeFileSync(htmlOutputPath, response.data.result.htmlContent);
        console.log(`\nHTML таблица сохранена в: ${htmlOutputPath}`);
        console.log('Откройте этот файл в браузере для просмотра таблицы');
      } else {
        console.log('❌ Получен не табличный результат:', response.data.result);
      }
    } else {
      console.error('❌ Не удалось выполнить скрипт');
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    if (error.response) {
      console.error('Данные ответа:', error.response.data);
    }
  }
}

// Запуск теста
testApi(); 