const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

// Создаем папку для логов
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Создаем поток для записи логов
const accessLogStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });

// Инициализация приложения Express
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// Настройка логирования
app.use(morgan('combined', { stream: accessLogStream }));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/outputs', express.static(path.join(__dirname, 'public/outputs')));
app.use('/tables', express.static(path.join(__dirname, 'public/tables')));

// Проверка наличия директорий
const ensureDirectories = () => {
  fs.ensureDirSync(path.join(__dirname, 'scripts'));
  fs.ensureDirSync(path.join(__dirname, 'public/outputs'));
  fs.ensureDirSync(path.join(__dirname, 'public/tables'));
};

// Эндпоинт для проверки статуса сервера
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'R Script Server is running' });
});

// Эндпоинт для выполнения R-скрипта
app.post('/execute-r', async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Получен запрос на выполнение R-скрипта`);
  
  try {
    const { script, text } = req.body;
    
    if (!script) {
      console.log(`[${requestId}] Ошибка: скрипт не предоставлен`);
      return res.status(400).json({ error: 'No script provided' });
    }
    
    // Текстовый вывод для включения в PDF
    const textForPdf = text || '';
    
    console.log(`[${requestId}] Выполнение R-скрипта ${textForPdf ? 'с текстом' : 'без текста'} для PDF`);
    if (textForPdf) {
      console.log(`[${requestId}] Длина текста: ${textForPdf.length}`);
      console.log(`[${requestId}] Начало текста: ${textForPdf.substring(0, 50)}...`);
      
      // Проверяем текст на наличие специальных символов
      const hasSpecialChars = /[\\$%&_#{}]/g.test(textForPdf);
      if (hasSpecialChars) {
        console.log(`[${requestId}] Текст содержит специальные символы, которые могут вызвать проблемы в LaTeX`);
      }
      
      // Сохраняем текст в отдельный файл для отладки
      const textFileName = `text_${requestId}.txt`;
      const textFilePath = path.join(__dirname, 'logs', textFileName);
      fs.writeFileSync(textFilePath, textForPdf);
      console.log(`[${requestId}] Текст сохранен в файл для отладки: ${textFilePath}`);
    }
    
    // Генерируем уникальные имена файлов
    const scriptId = uuidv4();
    const scriptFileName = `script_${scriptId}.R`;
    const outputFileName = `output_${scriptId}.png`;
    const htmlFileName = `table_${scriptId}.html`;
    const jsonFileName = `table_${scriptId}.json`;
    const pdfFileName = `export_${scriptId}.pdf`;
    const csvFileName = `export_${scriptId}.csv`;
    
    const scriptPath = path.join(__dirname, 'scripts', scriptFileName);
    const outputPath = path.join(__dirname, 'public/outputs', outputFileName);
    const htmlPath = path.join(__dirname, 'public/tables', htmlFileName);
    const jsonPath = path.join(__dirname, 'public/tables', jsonFileName);
    const pdfPath = path.join(__dirname, 'public/tables', pdfFileName);
    const csvPath = path.join(__dirname, 'public/tables', csvFileName);
    
    const relativeOutputPath = path.join('outputs', outputFileName);
    const relativeHtmlPath = path.join('tables', htmlFileName);
    const relativeJsonPath = path.join('tables', jsonFileName);
    const relativePdfPath = path.join('tables', pdfFileName);
    const relativeCsvPath = path.join('tables', csvFileName);
    
    console.log(`[${requestId}] Сгенерированы пути к файлам:`);
    console.log(`[${requestId}] - Скрипт: ${scriptPath}`);
    console.log(`[${requestId}] - PNG: ${outputPath}`);
    console.log(`[${requestId}] - HTML: ${htmlPath}`);
    console.log(`[${requestId}] - JSON: ${jsonPath}`);
    console.log(`[${requestId}] - PDF: ${pdfPath}`);
    console.log(`[${requestId}] - CSV: ${csvPath}`);
    
    const utilsPath = path.join(__dirname, 'utils.R').replace(/\\/g, '/');
    
    // Записываем скрипт в файл
    fs.writeFileSync(scriptPath, script);
    console.log(`[${requestId}] Скрипт записан в файл: ${scriptPath}`);
    
    // Создаем полный скрипт с необходимыми библиотеками и обработкой результатов
    const fullScript = `
# Загружаем необходимые библиотеки
if (!requireNamespace("ggplot2", quietly = TRUE)) {
  install.packages("ggplot2", repos="https://cloud.r-project.org")
}
library(ggplot2)

# Пробуем загрузить gt, если нужно
tryCatch({
  if (!requireNamespace("gt", quietly = TRUE)) {
    install.packages("gt", repos="https://cloud.r-project.org")
  }
  library(gt)
}, error = function(e) {
  message("Пакет gt не установлен, но это не критично, если он не используется в скрипте")
})

# Пробуем загрузить jsonlite, если нужно
tryCatch({
  if (!requireNamespace("jsonlite", quietly = TRUE)) {
    install.packages("jsonlite", repos="https://cloud.r-project.org")
  }
  library(jsonlite)
}, error = function(e) {
  message("Пакет jsonlite не установлен, но это не критично, если он не используется в скрипте")
})

# Пробуем загрузить knitr и rmarkdown, если нужно
tryCatch({
  if (!requireNamespace("knitr", quietly = TRUE)) {
    install.packages("knitr", repos="https://cloud.r-project.org")
  }
  if (!requireNamespace("rmarkdown", quietly = TRUE)) {
    install.packages("rmarkdown", repos="https://cloud.r-project.org")
  }
  library(knitr)
  library(rmarkdown)
}, error = function(e) {
  message("Пакеты knitr или rmarkdown не установлены, но будет использован альтернативный метод")
})

# Пробуем загрузить pdftools, если нужно
tryCatch({
  if (!requireNamespace("pdftools", quietly = TRUE)) {
    install.packages("pdftools", repos="https://cloud.r-project.org")
  }
  library(pdftools)
}, error = function(e) {
  message("Пакет pdftools не установлен, но это не критично для основной функциональности")
})

# Пробуем загрузить extrafont для поддержки шрифтов
tryCatch({
  if (!requireNamespace("extrafont", quietly = TRUE)) {
    install.packages("extrafont", repos="https://cloud.r-project.org")
  }
  library(extrafont)
  # Импортируем шрифты, если они еще не импортированы
  if (length(extrafont::fonts()) == 0) {
    extrafont::font_import(prompt = FALSE)
  }
  extrafont::loadfonts(quiet = TRUE)
}, error = function(e) {
  message("Пакет extrafont не установлен или возникла ошибка при работе с шрифтами, но это не критично: ", e$message)
})

# Проверяем и обновляем пакет xfun
tryCatch({
  if (!requireNamespace("xfun", quietly = TRUE)) {
    install.packages("xfun", repos="https://cloud.r-project.org")
  } else {
    xfun_version <- as.character(packageVersion("xfun"))
    if (compareVersion(xfun_version, "0.52") < 0) {
      message("Обновление пакета xfun до версии 0.52 или выше")
      install.packages("xfun", repos="https://cloud.r-project.org")
    }
  }
}, error = function(e) {
  message("Ошибка при проверке/обновлении пакета xfun: ", e$message)
})

# Пробуем загрузить kableExtra для улучшенного форматирования таблиц
tryCatch({
  if (!requireNamespace("kableExtra", quietly = TRUE)) {
    install.packages("kableExtra", repos="https://cloud.r-project.org")
  }
  library(kableExtra)
}, error = function(e) {
  message("Пакет kableExtra не установлен, но это не критично: ", e$message)
})

library(dplyr)
# Загружаем функции для сохранения результатов
source("${utilsPath}")

# Проверяем и обновляем все необходимые пакеты
tryCatch({
  check_and_update_packages()
}, error = function(e) {
  message("Ошибка при проверке/обновлении пакетов: ", e$message)
})

# Выполняем пользовательский скрипт
${script}

# Определяем последний созданный объект
last_obj <- NULL

# Пытаемся найти объект в порядке приоритета
if (exists("p")) {
  last_obj <- p
} else if (exists("table")) {
  last_obj <- table
} else if (exists("gt_table")) {
  last_obj <- gt_table
} else if (exists("df")) {
  last_obj <- df
} else {
  # Если не нашли по имени, ищем по типу
  all_objects <- ls()
  for (obj_name in all_objects) {
    obj <- get(obj_name)
    if ("gg" %in% class(obj) || "gt_tbl" %in% class(obj) || inherits(obj, "data.frame")) {
      last_obj <- obj
      break
    }
  }
}

# Если объект все еще не найден, выводим сообщение
if (is.null(last_obj)) {
  message("Не удалось найти объект для визуализации. Проверьте, что скрипт создает график или таблицу.")
}

# Определяем тип объекта
is_table <- FALSE
if (!is.null(last_obj)) {
  if ("gt_tbl" %in% class(last_obj) || inherits(last_obj, "data.frame")) {
    is_table <- TRUE
  }
}

# Сохраняем результат
if (!is.null(last_obj)) {
  if (is_table) {
    # Для таблиц экспортируем HTML, JSON, PDF и CSV
    table_result <- export_table(
      last_obj, 
      html_file = "${htmlPath.replace(/\\/g, '/')}", 
      json_file = "${jsonPath.replace(/\\/g, '/')}",
      pdf_file = "${pdfPath.replace(/\\/g, '/')}",
      csv_file = "${csvPath.replace(/\\/g, '/')}",
      text = ${textForPdf ? `"${textForPdf.replace(/"/g, '\\"')}"` : 'NULL'},
      title = "Результат анализа данных"
    )
    # Формируем относительные пути для вывода
    cat("TABLE_RESULT:", jsonlite::toJSON(list(
      type = "table",
      html_path = "${relativeHtmlPath.replace(/\\/g, '/')}",
      json_path = "${relativeJsonPath.replace(/\\/g, '/')}",
      pdf_path = "${relativePdfPath.replace(/\\/g, '/')}",
      csv_path = "${relativeCsvPath.replace(/\\/g, '/')}"
    )))
  } else {
    # Для графиков используем save_visual_output и экспортируем в PDF
    save_visual_output(last_obj, "${outputPath.replace(/\\/g, '/')}", width = 10, height = 6, dpi = 300)
    # Также сохраняем в PDF с текстом
    export_plot_to_pdf(
      last_obj, 
      "${pdfPath.replace(/\\/g, '/')}", 
      text = ${textForPdf ? `"${textForPdf.replace(/"/g, '\\"')}"` : 'NULL'}, 
      title = "Результат визуализации данных",
      width = 10, 
      height = 6
    )
    # Формируем относительные пути для вывода
    cat("VISUAL_RESULT:", jsonlite::toJSON(list(
      type = "image",
      image_path = "${relativeOutputPath.replace(/\\/g, '/')}",
      pdf_path = "${relativePdfPath.replace(/\\/g, '/')}"
    )))
  }
} else {
  stop("Не удалось найти объект для сохранения. Убедитесь, что скрипт создает ggplot (p), gt таблицу (gt_table) или data.frame (df)")
}
`;

    // Записываем полный скрипт в файл
    fs.writeFileSync(scriptPath, fullScript);
    console.log(`[${requestId}] Полный скрипт записан в файл: ${scriptPath}`);
    
    // Выполняем R-скрипт
    console.log(`[${requestId}] Начало выполнения R-скрипта`);
    
    exec(`Rscript "${scriptPath}"`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      console.log(`[${requestId}] R-скрипт выполнен`);
      
      if (error) {
        console.error(`[${requestId}] Ошибка выполнения R-скрипта:`, error);
        return res.status(500).json({ error: 'R script execution error', details: error.message, stderr });
      }
      
      if (stderr) {
        console.warn(`[${requestId}] Предупреждения при выполнении R-скрипта:`, stderr);
      }
      
      console.log(`[${requestId}] Вывод R-скрипта:`, stdout);
      
      let result = null;
      
      // Ищем результат таблицы
      const tableResultMatch = stdout.match(/TABLE_RESULT:\s*(\{.*\})/);
      if (tableResultMatch && tableResultMatch[1]) {
        try {
          console.log(`[${requestId}] Найден результат таблицы`);
          const tableResult = JSON.parse(tableResultMatch[1]);
          
          // Проверяем, созданы ли файлы HTML и JSON
          const htmlExists = fs.existsSync(htmlPath);
          const jsonExists = fs.existsSync(jsonPath);
          const pdfExists = fs.existsSync(pdfPath);
          const csvExists = fs.existsSync(csvPath);
          
          console.log(`[${requestId}] Проверка файлов таблицы:`);
          console.log(`[${requestId}] - HTML: ${htmlExists}`);
          console.log(`[${requestId}] - JSON: ${jsonExists}`);
          console.log(`[${requestId}] - PDF: ${pdfExists}`);
          console.log(`[${requestId}] - CSV: ${csvExists}`);
          
          if (htmlExists && jsonExists && pdfExists && csvExists) {
            // Читаем HTML и JSON
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            const jsonContent = fs.readFileSync(jsonPath, 'utf8');
            
            result = {
              type: 'table',
              htmlUrl: `${SERVER_URL}/${relativeHtmlPath}`,
              jsonUrl: `${SERVER_URL}/${relativeJsonPath}`,
              pdfUrl: `${SERVER_URL}/${relativePdfPath}`,
              csvUrl: `${SERVER_URL}/${relativeCsvPath}`,
              htmlContent: htmlContent,
              jsonData: JSON.parse(jsonContent)
            };
            
            console.log(`[${requestId}] Результат таблицы сформирован`);
          }
        } catch (parseError) {
          console.error(`[${requestId}] Ошибка при обработке результата таблицы:`, parseError);
        }
      }
      
      // Ищем результат визуализации
      const visualResultMatch = stdout.match(/VISUAL_RESULT:\s*(\{.*\})/);
      if (visualResultMatch && visualResultMatch[1]) {
        try {
          console.log(`[${requestId}] Найден результат визуализации`);
          const visualResult = JSON.parse(visualResultMatch[1]);
          
          // Проверяем, создан ли файл изображения
          const outputExists = fs.existsSync(outputPath);
          const pdfExists = fs.existsSync(pdfPath);
          
          console.log(`[${requestId}] Проверка файлов визуализации:`);
          console.log(`[${requestId}] - PNG: ${outputExists}`);
          console.log(`[${requestId}] - PDF: ${pdfExists}`);
          
          if (outputExists) {
            result = {
              type: 'image',
              imageUrl: `${SERVER_URL}/${relativeOutputPath}`,
              pdfUrl: `${SERVER_URL}/${relativePdfPath}`
            };
            
            console.log(`[${requestId}] Результат визуализации сформирован`);
          }
        } catch (parseError) {
          console.error(`[${requestId}] Ошибка при обработке результата визуализации:`, parseError);
        }
      }
      
      // Если не удалось распарсить результат, проверяем наличие файлов
      if (!result) {
        console.log(`[${requestId}] Результат не найден в выводе, проверяем наличие файлов`);
        
        if (fs.existsSync(outputPath)) {
          // Если есть изображение, возвращаем его
          console.log(`[${requestId}] Найден файл изображения: ${outputPath}`);
          
          result = {
            type: 'image',
            imageUrl: `${SERVER_URL}/${relativeOutputPath}`,
            pdfUrl: `${SERVER_URL}/${relativePdfPath}`
          };
        } else if (fs.existsSync(htmlPath) && fs.existsSync(jsonPath) && fs.existsSync(pdfPath) && fs.existsSync(csvPath)) {
          // Если есть HTML и JSON, возвращаем их
          console.log(`[${requestId}] Найдены файлы таблицы`);
          
          const htmlContent = fs.readFileSync(htmlPath, 'utf8');
          const jsonContent = fs.readFileSync(jsonPath, 'utf8');
          
          result = {
            type: 'table',
            htmlUrl: `${SERVER_URL}/${relativeHtmlPath}`,
            jsonUrl: `${SERVER_URL}/${relativeJsonPath}`,
            pdfUrl: `${SERVER_URL}/${relativePdfPath}`,
            csvUrl: `${SERVER_URL}/${relativeCsvPath}`,
            htmlContent: htmlContent,
            jsonData: JSON.parse(jsonContent)
          };
        } else {
          console.error(`[${requestId}] Файлы результатов не созданы`);
          return res.status(500).json({ 
            error: 'Output files not created',
            stdout: stdout,
            stderr: stderr
          });
        }
      }
      
      // Для отладки выводим все пути
      console.log(`[${requestId}] Пути к файлам:`);
      console.log(`[${requestId}] - HTML: ${htmlPath} -> ${relativeHtmlPath}`);
      console.log(`[${requestId}] - JSON: ${jsonPath} -> ${relativeJsonPath}`);
      console.log(`[${requestId}] - PDF: ${pdfPath} -> ${relativePdfPath}`);
      console.log(`[${requestId}] - CSV: ${csvPath} -> ${relativeCsvPath}`);
      console.log(`[${requestId}] - PNG: ${outputPath} -> ${relativeOutputPath}`);
      
      // Проверяем существование файлов
      console.log(`[${requestId}] Существование файлов:`);
      console.log(`[${requestId}] - HTML: ${fs.existsSync(htmlPath)}`);
      console.log(`[${requestId}] - JSON: ${fs.existsSync(jsonPath)}`);
      console.log(`[${requestId}] - PDF: ${fs.existsSync(pdfPath)}`);
      console.log(`[${requestId}] - CSV: ${fs.existsSync(csvPath)}`);
      console.log(`[${requestId}] - PNG: ${fs.existsSync(outputPath)}`);
      
      // Проверяем размеры файлов
      if (fs.existsSync(pdfPath)) {
        const pdfStats = fs.statSync(pdfPath);
        console.log(`[${requestId}] Размер PDF файла: ${pdfStats.size} байт`);
        
        if (pdfStats.size === 0) {
          console.error(`[${requestId}] ОШИБКА: PDF файл имеет нулевой размер!`);
        }
      }
      
      console.log(`[${requestId}] Отправка ответа клиенту`);
      res.json({ 
        success: true,
        result: result,
        stdout: stdout
      });
    });
  } catch (err) {
    console.error(`[${requestId}] Ошибка сервера:`, err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Запуск сервера
app.listen(PORT, HOST, () => {
  ensureDirectories();
  console.log(`R Script Server running on http://${HOST}:${PORT}`);
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Serving static files from ${path.join(__dirname, 'public')}`);
}); 