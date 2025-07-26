const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Чтение тестового R-скрипта с таблицей gt
const scriptPath = path.join(__dirname, 'test-gt-table.R');
const script = fs.readFileSync(scriptPath, 'utf8');

// URL сервера
const serverUrl = 'http://localhost:3001/execute-r';

// Функция для тестирования API
async function testApi() {
  try {
    console.log('Sending test GT table script to API...');
    
    const response = await axios.post(serverUrl, { script });
    
    console.log('API Response:', response.data);
    
    if (response.data.success) {
      console.log(`Image generated successfully at: ${response.data.imageUrl}`);
    } else {
      console.error('Failed to generate image');
    }
  } catch (error) {
    console.error('Error testing API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Запуск теста
testApi(); 