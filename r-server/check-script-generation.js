const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// URL сервера
const serverUrl = 'http://localhost:3001/execute-r';

// Простой тестовый скрипт
const simpleScript = `
library(ggplot2)

# Создаем простой график
data <- data.frame(x = 1:10, y = 1:10)
p <- ggplot(data, aes(x = x, y = y)) + 
     geom_point() + 
     labs(title = "Тестовый график")

print(p)
`;

// Функция для отправки скрипта на сервер и проверки сгенерированного файла
async function testScriptGeneration() {
  try {
    console.log('Отправляем тестовый скрипт на сервер...');
    
    // Генерируем уникальный ID для отслеживания
    const testId = uuidv4();
    console.log(`Тестовый ID: ${testId}`);
    
    // Добавляем комментарий с ID для отслеживания
    const scriptWithId = `
# Тестовый ID: ${testId}
${simpleScript}
`;
    
    // Отправляем скрипт на сервер
    const response = await axios.post(serverUrl, { script: scriptWithId });
    
    console.log('Ответ сервера:', response.data);
    
    if (response.data.success) {
      console.log(`Изображение успешно создано: ${response.data.imageUrl}`);
      
      // Ищем сгенерированный R-скрипт
      const scriptsDir = path.join(__dirname, 'scripts');
      const files = fs.readdirSync(scriptsDir);
      
      // Ищем файл с нашим тестовым ID
      let foundScript = null;
      
      for (const file of files) {
        if (file.endsWith('.R')) {
          const filePath = path.join(scriptsDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          if (content.includes(`# Тестовый ID: ${testId}`)) {
            foundScript = filePath;
            break;
          }
        }
      }
      
      if (foundScript) {
        console.log(`Найден сгенерированный скрипт: ${foundScript}`);
        
        // Проверяем содержимое скрипта
        const scriptContent = fs.readFileSync(foundScript, 'utf8');
        
        console.log('\n--- Содержимое сгенерированного скрипта ---');
        console.log(scriptContent);
        console.log('--- Конец содержимого ---\n');
        
        // Проверяем, использует ли скрипт save_visual_output вместо ggsave
        if (scriptContent.includes('save_visual_output(')) {
          console.log('✅ Скрипт использует функцию save_visual_output');
        } else if (scriptContent.includes('ggsave(')) {
          console.log('❌ Скрипт использует прямой вызов ggsave вместо save_visual_output');
        } else {
          console.log('❓ Не найдено ни save_visual_output, ни ggsave в скрипте');
        }
      } else {
        console.log('❌ Не удалось найти сгенерированный скрипт');
      }
    } else {
      console.error('❌ Не удалось создать изображение');
    }
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    if (error.response) {
      console.error('Данные ответа:', error.response.data);
    }
  }
}

// Запускаем тест
testScriptGeneration(); 