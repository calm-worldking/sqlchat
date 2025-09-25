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

// Флаг для отслеживания инициализации пакетов
let packagesInitialized = false;

// Функция для инициализации пакетов (выполняется только один раз)
const initializePackages = async () => {
  if (packagesInitialized) return;
  
  console.log('Инициализация R пакетов...');
  const rLibPath = path.join(__dirname, 'r-lib');
  fs.ensureDirSync(rLibPath);
  
  const initScript = `
# Настройка локальной пользовательской библиотеки
rlib <- normalizePath("${rLibPath.replace(/\\/g, '/')}", winslash = "/", mustWork = FALSE)
if (!dir.exists(rlib)) dir.create(rlib, recursive = TRUE)
.libPaths(c(rlib, .libPaths()))
options(repos = c(CRAN = "https://cloud.r-project.org"))

# Проверяем и устанавливаем только отсутствующие пакеты
required_packages <- c("ggplot2", "dplyr", "jsonlite", "knitr", "rmarkdown", "xfun")

for (pkg in required_packages) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    tryCatch({
      install.packages(pkg, lib = rlib, quiet = TRUE)
      cat("Установлен пакет:", pkg, "\\n")
    }, error = function(e) {
      cat("Ошибка установки пакета", pkg, ":", e$message, "\\n")
    })
  } else {
    cat("Пакет", pkg, "уже установлен\\n")
  }
}

cat("Инициализация пакетов завершена\\n")
`;

  const initScriptPath = path.join(__dirname, 'init_packages.R');
  fs.writeFileSync(initScriptPath, initScript);
  
  return new Promise((resolve, reject) => {
    exec(`Rscript "${initScriptPath}"`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.warn('Предупреждение при инициализации пакетов:', error.message);
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
      } else {
        console.log('Пакеты инициализированы:', stdout);
      }
      packagesInitialized = true;
      resolve();
    });
  });
};

// Эндпоинт для проверки статуса сервера
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'R Script Server is running', packagesInitialized });
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
    
    // Инициализируем пакеты при первом запросе
    if (!packagesInitialized) {
      await initializePackages();
    }
    
    // Текстовый вывод для включения в PDF
    const textForPdf = text || '';
    
    console.log(`[${requestId}] Выполнение R-скрипта ${textForPdf ? 'с текстом' : 'без текста'} для PDF`);
    
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
    
    console.log(`[${requestId}] Сгенерированы пути к файлам`);
    
    const utilsPath = path.join(__dirname, 'utils.R').replace(/\\/g, '/');
    const rLibPath = path.join(__dirname, 'r-lib');
    
    // Создаем оптимизированный скрипт без установки пакетов
    const fullScript = `
# Настройка локальной пользовательской библиотеки
rlib <- normalizePath("${rLibPath.replace(/\\/g, '/')}", winslash = "/", mustWork = FALSE)
.libPaths(c(rlib, .libPaths()))

# Загружаем библиотеки (без установки)
suppressPackageStartupMessages({
  tryCatch({ library(ggplot2, lib.loc = rlib) }, error = function(e) { message("ggplot2 не загружен: ", e$message) })
  tryCatch({ library(dplyr, lib.loc = rlib) }, error = function(e) { message("dplyr не загружен: ", e$message) })
  tryCatch({ library(jsonlite, lib.loc = rlib) }, error = function(e) { message("jsonlite не загружен: ", e$message) })
  tryCatch({ library(knitr, lib.loc = rlib) }, error = function(e) { message("knitr не загружен: ", e$message) })
  tryCatch({ library(rmarkdown, lib.loc = rlib) }, error = function(e) { message("rmarkdown не загружен: ", e$message) })
  tryCatch({ library(xfun, lib.loc = rlib) }, error = function(e) { message("xfun не загружен: ", e$message) })
})

# Загружаем функции для сохранения результатов
tryCatch({
  source("${utilsPath}")
}, error = function(e) {
  message("Ошибка загрузки utils.R: ", e$message)
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
    tryCatch({
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
    }, error = function(e) {
      message("Ошибка экспорта таблицы: ", e$message)
    })
  } else {
    # Для графиков используем save_visual_output и экспортируем в PDF
    tryCatch({
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
    }, error = function(e) {
      message("Ошибка экспорта графика: ", e$message)
    })
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
    
    const childEnv = { 
      ...process.env,
      R_LIBS_USER: rLibPath,
      R_LIBS: rLibPath
    };
    
    exec(`Rscript "${scriptPath}"`, { maxBuffer: 1024 * 1024 * 10, env: childEnv }, (error, stdout, stderr) => {
      console.log(`[${requestId}] R-скрипт выполнен`);
      
      if (error) {
        console.error(`[${requestId}] Ошибка выполнения R-скрипта:`, error);
        return res.status(500).json({ 
          requestId,
          error: 'R script execution error', 
          details: error.message, 
          stdout,
          stderr 
        });
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
            
            const serverUrl = `http://localhost:${PORT}`;
            result = {
              type: 'table',
              htmlUrl: `${serverUrl}/${relativeHtmlPath}`,
              jsonUrl: `${serverUrl}/${relativeJsonPath}`,
              pdfUrl: `${serverUrl}/${relativePdfPath}`,
              csvUrl: `${serverUrl}/${relativeCsvPath}`,
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
            const serverUrl = `http://localhost:${PORT}`;
            result = {
              type: 'image',
              imageUrl: `${serverUrl}/${relativeOutputPath}`,
              pdfUrl: `${serverUrl}/${relativePdfPath}`
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
          
          const serverUrl = `http://localhost:${PORT}`;
          result = {
            type: 'image',
            imageUrl: `${serverUrl}/${relativeOutputPath}`,
            pdfUrl: `${serverUrl}/${relativePdfPath}`
          };
        } else if (fs.existsSync(htmlPath) && fs.existsSync(jsonPath) && fs.existsSync(pdfPath) && fs.existsSync(csvPath)) {
          // Если есть HTML и JSON, возвращаем их
          console.log(`[${requestId}] Найдены файлы таблицы`);
          
          const htmlContent = fs.readFileSync(htmlPath, 'utf8');
          const jsonContent = fs.readFileSync(jsonPath, 'utf8');
          
          const serverUrl = `http://localhost:${PORT}`;
          result = {
            type: 'table',
            htmlUrl: `${serverUrl}/${relativeHtmlPath}`,
            jsonUrl: `${serverUrl}/${relativeJsonPath}`,
            pdfUrl: `${serverUrl}/${relativePdfPath}`,
            csvUrl: `${serverUrl}/${relativeCsvPath}`,
            htmlContent: htmlContent,
            jsonData: JSON.parse(jsonContent)
          };
        } else {
          console.error(`[${requestId}] Файлы результатов не созданы`);
          return res.status(500).json({ 
            requestId,
            error: 'Output files not created',
            stdout: stdout,
            stderr: stderr
          });
        }
      }
      
      console.log(`[${requestId}] Отправка ответа клиенту`);
      res.json({ 
        requestId,
        success: true,
        result: result,
        stdout: stdout
      });
    });
  } catch (err) {
    console.error(`[${requestId}] Ошибка сервера:`, err);
    res.status(500).json({ requestId, error: 'Server error', details: err.message });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  ensureDirectories();
  console.log(`R Script Server running on port ${PORT}`);
  console.log(`Serving static files from ${path.join(__dirname, 'public')}`);
}); 