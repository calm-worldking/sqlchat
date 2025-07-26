# Функция для сохранения визуальных объектов (ggplot, gt, grid)
save_visual_output <- function(obj, filename = "output.png", width = 8, height = 5, dpi = 300) {
  # Определить расширение
  ext <- tolower(tools::file_ext(filename))
  is_png <- ext == "png"
  is_pdf <- ext == "pdf"
  is_svg <- ext == "svg"

  # 1. Случай: gt-таблица
  if ("gt_tbl" %in% class(obj)) {
    if (!requireNamespace("gt", quietly = TRUE)) {
      stop("Пакет 'gt' не установлен.")
    }
    gt::gtsave(data = obj, filename = filename)
    message("✅ gt-таблица успешно сохранена как ", filename)
    return(invisible(TRUE))
  }

  # 2. Случай: ggplot-график
  if ("gg" %in% class(obj)) {
    ggplot2::ggsave(filename = filename, plot = obj, width = width, height = height, dpi = dpi)
    message("✅ ggplot-график успешно сохранён как ", filename)
    return(invisible(TRUE))
  }

  # 3. Случай: tableGrob или grid-таблица
  if ("grob" %in% class(obj) || "gtable" %in% class(obj)) {
    if (!requireNamespace("grid", quietly = TRUE)) {
      stop("Пакет 'grid' не установлен.")
    }

    # Открываем устройство для записи
    if (is_pdf) {
      pdf(filename, width = width, height = height)
    } else if (is_svg) {
      svg(filename, width = width, height = height)
    } else {
      png(filename, width = width * dpi, height = height * dpi, res = dpi)
    }

    grid::grid.newpage()
    grid::grid.draw(obj)
    dev.off()
    message("✅ Таблица (grob) успешно сохранена как ", filename)
    return(invisible(TRUE))
  }

  # Неизвестный тип
  stop("❌ Объект не является ни ggplot, ни gt-таблицей, ни grid-таблицей.")
}

# Функция для логирования
log_message <- function(msg) {
  cat(format(Sys.time(), "%Y-%m-%d %H:%M:%S"), "-", msg, "\n", file = "r-server-log.txt", append = TRUE)
  message(msg)
}

# Функция для экспорта таблиц в HTML, JSON, PDF и CSV
export_table <- function(obj, html_file = NULL, json_file = NULL, pdf_file = NULL, csv_file = NULL, text = NULL, title = NULL) {
  log_message("Начало экспорта таблицы")
  
  result <- list(
    type = NULL,
    html = NULL,
    json = NULL,
    pdf = NULL,
    csv = NULL
  )
  
  # 1. Случай: gt-таблица
  if ("gt_tbl" %in% class(obj)) {
    log_message("Обнаружена gt-таблица")
    result$type <- "gt_table"
    
    # Экспорт в HTML
    if (!is.null(html_file)) {
      if (!requireNamespace("gt", quietly = TRUE)) {
        stop("Пакет 'gt' не установлен.")
      }
      html_content <- gt::as_raw_html(obj)
      writeLines(html_content, html_file)
      result$html <- html_content
      message("✅ gt-таблица экспортирована в HTML: ", html_file)
    }
    
    # Экспорт в JSON
    if (!is.null(json_file)) {
      if (!requireNamespace("jsonlite", quietly = TRUE)) {
        install.packages("jsonlite", repos = "https://cloud.r-project.org")
      }
      
      # Извлекаем данные из gt таблицы
      table_data <- obj[["_data"]]
      json_content <- jsonlite::toJSON(table_data, pretty = TRUE, auto_unbox = TRUE)
      writeLines(json_content, json_file)
      result$json <- json_content
      message("✅ gt-таблица экспортирована в JSON: ", json_file)
    }
    
    # Экспорт в PDF
    if (!is.null(pdf_file)) {
      log_message(paste("Экспорт gt-таблицы в PDF:", pdf_file))
      if (!requireNamespace("gt", quietly = TRUE)) {
        stop("Пакет 'gt' не установлен.")
      }
      
      if (!is.null(text) && text != "") {
        log_message(paste("Создание PDF с текстом для gt-таблицы. Длина текста:", nchar(text)))
        # Если есть текст, используем безопасный метод создания PDF
        tryCatch({
          safe_create_pdf(obj, pdf_file, text = text, title = title)
          log_message("PDF с текстом для gt-таблицы успешно создан")
        }, error = function(e) {
          # В случае ошибки используем стандартный метод
          log_message(paste("Ошибка при создании PDF с текстом:", e$message))
          log_message("Используем стандартный метод сохранения")
          gt::gtsave(obj, filename = pdf_file, expand = 10)
        })
      } else {
        # Если текста нет, используем стандартный метод
        log_message("Использование стандартного метода сохранения gt-таблицы в PDF")
        gt::gtsave(obj, filename = pdf_file, expand = 10)
      }
      
      # Проверяем, что файл создан
      if (file.exists(pdf_file)) {
        log_message(paste("PDF файл успешно создан:", pdf_file))
        # Проверяем размер файла
        file_info <- file.info(pdf_file)
        log_message(paste("Размер PDF файла:", file_info$size, "байт"))
        
        result$pdf <- pdf_file
      } else {
        log_message(paste("ОШИБКА: PDF файл не был создан:", pdf_file))
      }
      
      message("✅ gt-таблица экспортирована в PDF: ", pdf_file)
    }
    
    # Экспорт в CSV
    if (!is.null(csv_file)) {
      if (!requireNamespace("readr", quietly = TRUE)) {
        install.packages("readr", repos = "https://cloud.r-project.org")
      }
      
      # Извлекаем данные из gt таблицы
      table_data <- obj[["_data"]]
      readr::write_csv(table_data, csv_file)
      result$csv <- csv_file
      message("✅ gt-таблица экспортирована в CSV: ", csv_file)
    }
    
    return(result)
  }
  
  # 2. Случай: data.frame или tibble
  if (inherits(obj, "data.frame")) {
    result$type <- "data_frame"
    
    # Экспорт в HTML
    if (!is.null(html_file)) {
      # Создаем простую HTML таблицу
      html_content <- paste0(
        "<table class='data-table'>\n",
        "  <thead>\n",
        "    <tr>\n",
        paste0("      <th>", names(obj), "</th>\n", collapse = ""),
        "    </tr>\n",
        "  </thead>\n",
        "  <tbody>\n"
      )
      
      # Добавляем строки
      for (i in 1:nrow(obj)) {
        html_content <- paste0(
          html_content,
          "    <tr>\n",
          paste0("      <td>", as.character(unlist(obj[i,])), "</td>\n", collapse = ""),
          "    </tr>\n"
        )
      }
      
      html_content <- paste0(
        html_content,
        "  </tbody>\n",
        "</table>"
      )
      
      writeLines(html_content, html_file)
      result$html <- html_content
      message("✅ data.frame экспортирован в HTML: ", html_file)
    }
    
    # Экспорт в JSON
    if (!is.null(json_file)) {
      if (!requireNamespace("jsonlite", quietly = TRUE)) {
        install.packages("jsonlite", repos = "https://cloud.r-project.org")
      }
      
      json_content <- jsonlite::toJSON(obj, pretty = TRUE, auto_unbox = TRUE)
      writeLines(json_content, json_file)
      result$json <- json_content
      message("✅ data.frame экспортирован в JSON: ", json_file)
    }
    
    # Экспорт в PDF
    if (!is.null(pdf_file)) {
      log_message(paste("Экспорт data.frame в PDF:", pdf_file))
      if (!requireNamespace("gridExtra", quietly = TRUE)) {
        install.packages("gridExtra", repos = "https://cloud.r-project.org")
      }
      
      if (!requireNamespace("grid", quietly = TRUE)) {
        install.packages("grid", repos = "https://cloud.r-project.org")
      }
      
      if (!is.null(text) && text != "") {
        log_message(paste("Создание PDF с текстом для data.frame. Длина текста:", nchar(text)))
        # Если есть текст, используем безопасный метод создания PDF
        tryCatch({
          safe_create_pdf(obj, pdf_file, text = text, title = title)
          log_message("PDF с текстом для data.frame успешно создан")
        }, error = function(e) {
          # В случае ошибки используем стандартный метод
          log_message(paste("Ошибка при создании PDF с текстом:", e$message))
          log_message("Используем стандартный метод сохранения")
          
          # Создаем таблицу для PDF
          pdf_table <- gridExtra::tableGrob(obj, rows = NULL)
          
          # Сохраняем в PDF
          pdf(pdf_file, width = 10, height = 8)
          grid::grid.newpage()
          grid::grid.draw(pdf_table)
          dev.off()
        })
      } else {
        # Если текста нет, используем стандартный метод
        log_message("Использование стандартного метода сохранения data.frame в PDF")
        # Создаем таблицу для PDF
        pdf_table <- gridExtra::tableGrob(obj, rows = NULL)
        
        # Сохраняем в PDF
        pdf(pdf_file, width = 10, height = 8)
        grid::grid.newpage()
        grid::grid.draw(pdf_table)
        dev.off()
      }
      
      # Проверяем, что файл создан
      if (file.exists(pdf_file)) {
        log_message(paste("PDF файл успешно создан:", pdf_file))
        # Проверяем размер файла
        file_info <- file.info(pdf_file)
        log_message(paste("Размер PDF файла:", file_info$size, "байт"))
        
        result$pdf <- pdf_file
      } else {
        log_message(paste("ОШИБКА: PDF файл не был создан:", pdf_file))
      }
      
      message("✅ data.frame экспортирован в PDF: ", pdf_file)
    }
    
    # Экспорт в CSV
    if (!is.null(csv_file)) {
      if (!requireNamespace("readr", quietly = TRUE)) {
        install.packages("readr", repos = "https://cloud.r-project.org")
      }
      
      readr::write_csv(obj, csv_file)
      result$csv <- csv_file
      message("✅ data.frame экспортирован в CSV: ", csv_file)
    }
    
    return(result)
  }
  
  # Неподдерживаемый тип
  stop("❌ Объект не является таблицей (gt_table или data.frame).")
}

# Функция для экспорта графиков в PDF
export_plot_to_pdf <- function(plot_obj, pdf_file, text = NULL, title = NULL, width = 8, height = 6) {
  log_message(paste("Начало экспорта графика в PDF:", pdf_file))
  
  if ("gg" %in% class(plot_obj)) {
    log_message("Обнаружен график ggplot")
    # Для ggplot2
    if (!requireNamespace("ggplot2", quietly = TRUE)) {
      stop("Пакет 'ggplot2' не установлен.")
    }
    
    if (!is.null(text) && text != "") {
      log_message(paste("Создание PDF с текстом для графика. Длина текста:", nchar(text)))
      # Если есть текст, используем безопасный метод создания PDF
      tryCatch({
        safe_create_pdf(plot_obj, pdf_file, text = text, width = width, title = title)
        log_message("PDF с текстом для графика успешно создан")
      }, error = function(e) {
        # В случае ошибки используем стандартный метод
        log_message(paste("Ошибка при создании PDF с текстом:", e$message))
        log_message("Используем стандартный метод сохранения")
        ggplot2::ggsave(filename = pdf_file, plot = plot_obj, width = width, height = height)
      })
    } else {
      # Если текста нет, используем стандартный метод
      log_message("Использование стандартного метода сохранения графика в PDF")
      ggplot2::ggsave(filename = pdf_file, plot = plot_obj, width = width, height = height)
    }
    
    # Проверяем, что файл создан
    if (file.exists(pdf_file)) {
      log_message(paste("PDF файл успешно создан:", pdf_file))
      # Проверяем размер файла
      file_info <- file.info(pdf_file)
      log_message(paste("Размер PDF файла:", file_info$size, "байт"))
    } else {
      log_message(paste("ОШИБКА: PDF файл не был создан:", pdf_file))
    }
    
    message("✅ ggplot-график экспортирован в PDF: ", pdf_file)
    return(TRUE)
  } else if ("grob" %in% class(plot_obj) || "gtable" %in% class(plot_obj)) {
    log_message("Обнаружен grid объект")
    # Для grid объектов
    if (!requireNamespace("grid", quietly = TRUE)) {
      stop("Пакет 'grid' не установлен.")
    }
    
    if (!is.null(text) && text != "") {
      log_message(paste("Создание PDF с текстом для grid объекта. Длина текста:", nchar(text)))
      # Если есть текст, используем безопасный метод создания PDF
      tryCatch({
        safe_create_pdf(plot_obj, pdf_file, text = text, width = width, title = title)
        log_message("PDF с текстом для grid объекта успешно создан")
      }, error = function(e) {
        # В случае ошибки используем стандартный метод
        log_message(paste("Ошибка при создании PDF с текстом:", e$message))
        log_message("Используем стандартный метод сохранения")
        pdf(pdf_file, width = width, height = height)
        grid::grid.newpage()
        grid::grid.draw(plot_obj)
        dev.off()
      })
    } else {
      # Если текста нет, используем стандартный метод
      log_message("Использование стандартного метода сохранения grid объекта в PDF")
      pdf(pdf_file, width = width, height = height)
      grid::grid.newpage()
      grid::grid.draw(plot_obj)
      dev.off()
    }
    
    # Проверяем, что файл создан
    if (file.exists(pdf_file)) {
      log_message(paste("PDF файл успешно создан:", pdf_file))
      # Проверяем размер файла
      file_info <- file.info(pdf_file)
      log_message(paste("Размер PDF файла:", file_info$size, "байт"))
    } else {
      log_message(paste("ОШИБКА: PDF файл не был создан:", pdf_file))
    }
    
    message("✅ Grid-объект экспортирован в PDF: ", pdf_file)
    return(TRUE)
  } else {
    log_message("Неизвестный тип объекта для экспорта в PDF")
    stop("❌ Объект не является графиком (ggplot или grid).")
  }
}

# Функция для создания PDF с текстом и визуализацией
create_pdf_with_text <- function(obj, pdf_file, text = NULL, width = 8, height = NULL, title = NULL) {
  log_message(paste("Начало создания PDF с текстом:", pdf_file))
  
  # Проверяем, установлен ли пакет knitr
  if (!requireNamespace("knitr", quietly = TRUE)) {
    log_message("Установка пакета knitr")
    install.packages("knitr", repos = "https://cloud.r-project.org")
  }
  
  # Проверяем, установлен ли пакет rmarkdown
  if (!requireNamespace("rmarkdown", quietly = TRUE)) {
    log_message("Установка пакета rmarkdown")
    install.packages("rmarkdown", repos = "https://cloud.r-project.org")
  }
  
  # Определяем тип объекта
  is_ggplot <- "gg" %in% class(obj)
  is_gt_table <- "gt_tbl" %in% class(obj)
  is_grob <- "grob" %in% class(obj) || "gtable" %in% class(obj)
  is_dataframe <- inherits(obj, "data.frame")
  
  log_message(paste("Тип объекта:", 
                   if(is_ggplot) "ggplot" 
                   else if(is_gt_table) "gt_table" 
                   else if(is_grob) "grob" 
                   else if(is_dataframe) "data.frame" 
                   else "unknown"))
  
  # Если текст не предоставлен, устанавливаем пустую строку
  if (is.null(text)) {
    text <- ""
  }
  
  log_message(paste("Длина текста:", nchar(text)))
  if (nchar(text) > 0) {
    log_message(paste("Начало текста:", substr(text, 1, 50), "..."))
  }
  
  # Определяем, нужна ли альбомная ориентация для широких таблиц
  use_landscape <- FALSE
  if (is_dataframe || is_gt_table) {
    # Проверяем ширину таблицы
    if (is_dataframe) {
      n_cols <- ncol(obj)
    } else if (is_gt_table) {
      n_cols <- ncol(obj[["_data"]])
    }
    
    # Если больше 6 колонок, используем альбомную ориентацию
    if (n_cols > 6) {
      use_landscape <- TRUE
      log_message("Используем альбомную ориентацию для широкой таблицы")
    }
  }
  
  # Создаем временный файл для Rmd
  temp_rmd <- tempfile(fileext = ".Rmd")
  log_message(paste("Создан временный Rmd файл:", temp_rmd))
  
  # Определяем тип объекта для Rmd
  obj_type <- "unknown"
  if (is_ggplot) {
    obj_type <- "ggplot"
  } else if (is_gt_table) {
    obj_type <- "gt_table"
  } else if (is_dataframe) {
    obj_type <- "data_frame"
  } else if (is_grob) {
    obj_type <- "grob"
  }
  
  # Сохраняем объект во временный файл RDS
  temp_obj <- tempfile(fileext = ".rds")
  log_message(paste("Сохранение объекта во временный RDS файл:", temp_obj))
  tryCatch({
    saveRDS(obj, temp_obj)
    log_message("Объект успешно сохранен в RDS")
  }, error = function(e) {
    log_message(paste("Ошибка при сохранении объекта в RDS:", e$message))
  })
  
  # Создаем содержимое Rmd файла
  log_message("Создание содержимого Rmd файла")
  
  # Экранируем специальные символы в тексте для R Markdown
  escaped_text <- gsub("\\", "\\\\", text, fixed = TRUE)
  escaped_text <- gsub("`", "\\`", escaped_text, fixed = TRUE)
  escaped_text <- gsub("$", "\\$", escaped_text, fixed = TRUE)
  
  # Создаем YAML заголовок с поддержкой русского языка
  rmd_content <- paste0(
    "---\n",
    "title: \"", if(!is.null(title)) title else "Результат анализа данных", "\"\n",
    "output:\n",
    "  pdf_document:\n",
    "    latex_engine: xelatex\n",
    "    keep_tex: false\n",
    if(use_landscape) "    geometry: landscape\n" else "",
    "mainfont: DejaVu Serif\n",
    "sansfont: DejaVu Sans\n",
    "monofont: DejaVu Sans Mono\n",
    "lang: ru-RU\n",
    "header-includes:\n",
    "  - \\usepackage[utf8]{inputenc}\n",
    "  - \\usepackage[T2A]{fontenc}\n",
    "  - \\usepackage[russian]{babel}\n",
    "  - \\usepackage{booktabs}\n",
    "  - \\usepackage{longtable}\n",
    "  - \\usepackage{array}\n",
    "  - \\usepackage{multirow}\n",
    "  - \\usepackage{wrapfig}\n",
    "  - \\usepackage{float}\n",
    "  - \\usepackage{colortbl}\n",
    "  - \\usepackage{pdflscape}\n",
    "  - \\usepackage{tabu}\n",
    "  - \\usepackage{threeparttable}\n",
    "  - \\usepackage{threeparttablex}\n",
    "  - \\usepackage[normalem]{ulem}\n",
    "  - \\usepackage{makecell}\n",
    "  - \\usepackage{xcolor}\n",
    "---\n\n",
    
    "```{r setup, include=FALSE}\n",
    "knitr::opts_chunk$set(echo = FALSE, warning = FALSE, message = FALSE)\n",
    "library(ggplot2)\n",
    "if(requireNamespace('gt', quietly = TRUE)) library(gt)\n",
    "if(requireNamespace('gridExtra', quietly = TRUE)) library(gridExtra)\n",
    "if(requireNamespace('grid', quietly = TRUE)) library(grid)\n",
    "if(requireNamespace('kableExtra', quietly = TRUE)) library(kableExtra)\n",
    "```\n\n"
  )
  
  # Добавляем текст, если он есть
  if (text != "") {
    log_message("Добавление текста в Rmd файл")
    # Разбиваем текст на абзацы
    paragraphs <- strsplit(text, "\n\n")[[1]]
    
    # Добавляем каждый абзац отдельно
    for (para in paragraphs) {
      if (trimws(para) != "") {
        rmd_content <- paste0(rmd_content, trimws(para), "\n\n")
      }
    }
    
    # Добавляем разделитель
    rmd_content <- paste0(rmd_content, "---\n\n")
  }
  
  # Определяем размер шрифта для таблицы в зависимости от количества колонок
  font_size <- 9
  if (is_dataframe || is_gt_table) {
    if (is_dataframe) {
      n_cols <- ncol(obj)
    } else if (is_gt_table) {
      n_cols <- ncol(obj[["_data"]])
    }
    
    if (n_cols > 6) font_size <- 8
    if (n_cols > 8) font_size <- 7
    if (n_cols > 10) font_size <- 6
  }
  
  # Добавляем код для отображения объекта в зависимости от его типа
  log_message("Добавление кода для отображения объекта")
  rmd_content <- paste0(
    rmd_content,
    "```{r visualize, fig.width=", width, ", fig.height=", if(is.null(height)) 6 else height, "}\n",
    "obj <- readRDS('", gsub("\\\\", "/", temp_obj), "')\n",
    
    # Код для отображения в зависимости от типа объекта
    if(obj_type == "ggplot") {
      "print(obj)\n"
    } else if(obj_type == "gt_table") {
      "if(requireNamespace('gt', quietly = TRUE)) {\n  obj\n}\n"
    } else if(obj_type == "data_frame") {
      paste0("if(requireNamespace('knitr', quietly = TRUE) && requireNamespace('kableExtra', quietly = TRUE)) {\n  
  # Улучшенное форматирование таблицы
  options(knitr.kable.NA = '')
  
  # Определяем размер шрифта в зависимости от количества колонок
  font_size <- ", font_size, "
  
  # Создаем таблицу с улучшенным форматированием
  knitr::kable(obj, 
    booktabs = TRUE, 
    longtable = TRUE,
    row.names = FALSE,
    align = rep('c', ncol(obj)),
    format.args = list(big.mark = ' '),
    font_size = font_size
  ) %>%
  kableExtra::kable_styling(
    latex_options = c('striped', 'hold_position', 'repeat_header', 'scale_down'),
    stripe_color = 'gray!10',
    full_width = TRUE,
    font_size = font_size
  ) %>%
  kableExtra::row_spec(0, bold = TRUE, background = 'gray!20') %>%
  kableExtra::column_spec(1:ncol(obj), width = paste0(round(100/ncol(obj), 1), '%'))
}\n")
    } else if(obj_type == "grob") {
      "if(requireNamespace('grid', quietly = TRUE)) {\n  grid::grid.draw(obj)\n}\n"
    } else {
      "print(obj)\n"
    },
    "```\n"
  )
  
  # Записываем Rmd файл
  log_message("Запись Rmd файла")
  tryCatch({
    writeLines(rmd_content, temp_rmd)
    log_message("Rmd файл успешно записан")
    
    # Записываем копию Rmd файла для отладки
    debug_rmd <- paste0(dirname(pdf_file), "/debug_", basename(temp_rmd))
    writeLines(rmd_content, debug_rmd)
    log_message(paste("Копия Rmd файла для отладки:", debug_rmd))
  }, error = function(e) {
    log_message(paste("Ошибка при записи Rmd файла:", e$message))
  })
  
  # Рендерим Rmd в PDF с поддержкой русского языка
  log_message("Начало рендеринга Rmd в PDF")
  tryCatch({
    rmarkdown::render(
      input = temp_rmd,
      output_file = pdf_file,
      quiet = FALSE,
      encoding = "UTF-8"
    )
    log_message(paste("PDF успешно создан:", pdf_file))
    
    # Удаляем временные файлы
    if (file.exists(temp_rmd)) {
      file.remove(temp_rmd)
      log_message("Временный Rmd файл удален")
    }
    if (file.exists(temp_obj)) {
      file.remove(temp_obj)
      log_message("Временный RDS файл удален")
    }
    
    return(invisible(TRUE))
  }, error = function(e) {
    log_message(paste("❌ Ошибка при рендеринге PDF:", e$message))
    
    # Удаляем временные файлы
    if (file.exists(temp_rmd)) {
      file.remove(temp_rmd)
      log_message("Временный Rmd файл удален")
    }
    if (file.exists(temp_obj)) {
      file.remove(temp_obj)
      log_message("Временный RDS файл удален")
    }
    
    # Пробуем использовать более простой метод для сохранения
    if (is_ggplot) {
      log_message("Пробуем сохранить с помощью ggsave...")
      ggplot2::ggsave(filename = pdf_file, plot = obj, width = width, height = if(is.null(height)) 6 else height)
    } else if (is_gt_table) {
      log_message("Пробуем сохранить с помощью gtsave...")
      if (requireNamespace("gt", quietly = TRUE)) {
        gt::gtsave(obj, filename = pdf_file)
      }
    } else if (is_dataframe) {
      log_message("Пробуем сохранить data.frame как таблицу...")
      if (requireNamespace("gridExtra", quietly = TRUE)) {
        pdf(pdf_file, width = width, height = if(is.null(height)) 6 else height, 
            encoding = "CP1251", family = "serif")
        grid_table <- gridExtra::tableGrob(obj, rows = NULL)
        grid::grid.draw(grid_table)
        dev.off()
      }
    } else if (is_grob) {
      log_message("Пробуем сохранить grid объект...")
      pdf(pdf_file, width = width, height = if(is.null(height)) 6 else height, 
          encoding = "CP1251", family = "serif")
      grid::grid.newpage()
      grid::grid.draw(obj)
      dev.off()
    }
    
    if (file.exists(pdf_file)) {
      log_message(paste("✅ PDF создан альтернативным методом:", pdf_file))
      return(invisible(TRUE))
    } else {
      log_message("Не удалось создать PDF ни одним из методов")
      stop("Не удалось создать PDF ни одним из методов")
    }
  })
} 

# Функция для создания PDF с текстом и визуализацией с использованием grid
create_pdf_with_text_direct <- function(obj, pdf_file, text = NULL, width = 8, height = NULL, title = NULL) {
  log_message(paste("Начало создания PDF с текстом напрямую:", pdf_file))
  
  # Проверяем, установлен ли пакет grid
  if (!requireNamespace("grid", quietly = TRUE)) {
    install.packages("grid", repos = "https://cloud.r-project.org")
  }
  
  # Проверяем, установлен ли пакет extrafont для поддержки шрифтов
  if (!requireNamespace("extrafont", quietly = TRUE)) {
    log_message("Установка пакета extrafont для поддержки шрифтов")
    install.packages("extrafont", repos = "https://cloud.r-project.org")
  }
  
  # Загружаем шрифты
  tryCatch({
    extrafont::loadfonts(quiet = TRUE)
    log_message("Шрифты успешно загружены")
  }, error = function(e) {
    log_message(paste("Ошибка при загрузке шрифтов:", e$message))
  })
  
  # Определяем тип объекта
  is_ggplot <- "gg" %in% class(obj)
  is_gt_table <- "gt_tbl" %in% class(obj)
  is_grob <- "grob" %in% class(obj) || "gtable" %in% class(obj)
  is_dataframe <- inherits(obj, "data.frame")
  
  log_message(paste("Тип объекта:", 
                   if(is_ggplot) "ggplot" 
                   else if(is_gt_table) "gt_table" 
                   else if(is_grob) "grob" 
                   else if(is_dataframe) "data.frame" 
                   else "unknown"))
  
  # Если текст не предоставлен, устанавливаем пустую строку
  if (is.null(text)) {
    text <- ""
  }
  
  log_message(paste("Длина текста:", nchar(text)))
  if (nchar(text) > 0) {
    log_message(paste("Начало текста:", substr(text, 1, 50), "..."))
  }
  
  # Разбиваем текст на строки
  text_lines <- strsplit(text, "\n")[[1]]
  text_height <- length(text_lines) * 0.2  # примерно 0.2 дюйма на строку
  
  # Определяем, нужна ли альбомная ориентация для широких таблиц
  use_landscape <- FALSE
  if (is_dataframe || is_gt_table) {
    # Проверяем ширину таблицы
    if (is_dataframe) {
      n_cols <- ncol(obj)
    } else if (is_gt_table) {
      n_cols <- ncol(obj[["_data"]])
    }
    
    # Если больше 6 колонок, используем альбомную ориентацию
    if (n_cols > 5) {
      use_landscape <- TRUE
      log_message("Используем альбомную ориентацию для широкой таблицы")
      # Меняем местами ширину и высоту для альбомной ориентации
      if (is.null(height)) {
        height <- width
        width <- 11  # Стандартная ширина для альбомной ориентации
      } else {
        temp <- width
        width <- height
        height <- temp
      }
    }
  }
  
  # Если высота не указана, рассчитываем ее
  if (is.null(height)) {
    # Минимальная высота для визуализации
    viz_height <- 6
    
    # Общая высота = высота текста + высота визуализации + отступы
    height <- text_height + viz_height + 1
  }
  
  # Решаем, использовать ли подход с R Markdown для сложных таблиц
  use_rmarkdown_approach <- FALSE
  if ((is_dataframe || is_gt_table) && n_cols > 4) {
    use_rmarkdown_approach <- TRUE
    log_message("Используем подход R Markdown для сложных таблиц")
    
    # Создаем временный Rmd файл
    temp_rmd <- tempfile(fileext = ".Rmd")
    log_message(paste("Создан временный Rmd файл:", temp_rmd))
    
    # Сохраняем объект во временный файл RDS
    temp_obj <- tempfile(fileext = ".rds")
    log_message(paste("Сохранение объекта во временный RDS файл:", temp_obj))
    tryCatch({
      saveRDS(obj, temp_obj)
      log_message("Объект успешно сохранен в RDS")
    }, error = function(e) {
      log_message(paste("Ошибка при сохранении объекта в RDS:", e$message))
      use_rmarkdown_approach <- FALSE
    })
    
    if (use_rmarkdown_approach) {
      # Создаем содержимое Rmd файла
      log_message("Создание содержимого Rmd файла")
      
      # Экранируем специальные символы в тексте для R Markdown
      escaped_text <- gsub("\\", "\\\\", text, fixed = TRUE)
      escaped_text <- gsub("`", "\\`", escaped_text, fixed = TRUE)
      escaped_text <- gsub("$", "\\$", escaped_text, fixed = TRUE)
      
      # Создаем YAML заголовок с поддержкой русского языка
      rmd_content <- paste0(
        "---\n",
        "title: \"", if(!is.null(title)) title else "Результат анализа данных", "\"\n",
        "output:\n",
        "  pdf_document:\n",
        "    latex_engine: xelatex\n",
        "    keep_tex: false\n",
        if(use_landscape) "    geometry: landscape\n" else "",
        "mainfont: DejaVu Serif\n",
        "sansfont: DejaVu Sans\n",
        "monofont: DejaVu Sans Mono\n",
        "lang: ru-RU\n",
        "header-includes:\n",
        "  - \\usepackage[utf8]{inputenc}\n",
        "  - \\usepackage[T2A]{fontenc}\n",
        "  - \\usepackage[russian]{babel}\n",
        "  - \\usepackage{booktabs}\n",
        "  - \\usepackage{longtable}\n",
        "  - \\usepackage{array}\n",
        "  - \\usepackage{multirow}\n",
        "  - \\usepackage{wrapfig}\n",
        "  - \\usepackage{float}\n",
        "  - \\usepackage{colortbl}\n",
        "  - \\usepackage{pdflscape}\n",
        "  - \\usepackage{tabu}\n",
        "  - \\usepackage{threeparttable}\n",
        "  - \\usepackage{threeparttablex}\n",
        "  - \\usepackage[normalem]{ulem}\n",
        "  - \\usepackage{makecell}\n",
        "  - \\usepackage{xcolor}\n",
        "---\n\n",
        
        "```{r setup, include=FALSE}\n",
        "knitr::opts_chunk$set(echo = FALSE, warning = FALSE, message = FALSE)\n",
        "library(ggplot2)\n",
        "if(requireNamespace('gt', quietly = TRUE)) library(gt)\n",
        "if(requireNamespace('gridExtra', quietly = TRUE)) library(gridExtra)\n",
        "if(requireNamespace('grid', quietly = TRUE)) library(grid)\n",
        "if(requireNamespace('kableExtra', quietly = TRUE)) library(kableExtra)\n",
        "```\n\n"
      )
      
      # Добавляем текст, если он есть
      if (text != "") {
        log_message("Добавление текста в Rmd файл")
        # Разбиваем текст на абзацы
        paragraphs <- strsplit(text, "\n\n")[[1]]
        
        # Добавляем каждый абзац отдельно
        for (para in paragraphs) {
          if (trimws(para) != "") {
            rmd_content <- paste0(rmd_content, trimws(para), "\n\n")
          }
        }
        
        # Добавляем разделитель
        rmd_content <- paste0(rmd_content, "---\n\n")
      }
      
      # Определяем размер шрифта для таблицы в зависимости от количества колонок
      font_size <- 9
      if (is_dataframe || is_gt_table) {
        if (n_cols > 6) font_size <- 8
        if (n_cols > 8) font_size <- 7
        if (n_cols > 10) font_size <- 6
      }
      
      # Добавляем код для отображения объекта в зависимости от его типа
      log_message("Добавление кода для отображения объекта")
      rmd_content <- paste0(
        rmd_content,
        "```{r visualize, fig.width=", width, ", fig.height=", if(is.null(height)) 6 else height, "}\n",
        "obj <- readRDS('", gsub("\\\\", "/", temp_obj), "')\n",
        
        # Код для отображения в зависимости от типа объекта
        if(is_gt_table) {
          "if(requireNamespace('gt', quietly = TRUE)) {\n  obj\n}\n"
        } else if(is_dataframe) {
          paste0("if(requireNamespace('knitr', quietly = TRUE) && requireNamespace('kableExtra', quietly = TRUE)) {\n  
  # Улучшенное форматирование таблицы
  options(knitr.kable.NA = '')
  
  # Определяем размер шрифта в зависимости от количества колонок
  font_size <- ", font_size, "
  
  # Создаем таблицу с улучшенным форматированием
  knitr::kable(obj, 
    booktabs = TRUE, 
    longtable = TRUE,
    row.names = FALSE,
    align = rep('c', ncol(obj)),
    format.args = list(big.mark = ' '),
    font_size = font_size
  ) %>%
  kableExtra::kable_styling(
    latex_options = c('striped', 'hold_position', 'repeat_header', 'scale_down'),
    stripe_color = 'gray!10',
    full_width = TRUE,
    font_size = font_size
  ) %>%
  kableExtra::row_spec(0, bold = TRUE, background = 'gray!20') %>%
  kableExtra::column_spec(1:ncol(obj), width = paste0(round(100/ncol(obj), 1), '%'))
}\n")
        } else {
          "print(obj)\n"
        },
        "```\n"
      )
      
      # Записываем Rmd файл
      log_message("Запись Rmd файла")
      tryCatch({
        writeLines(rmd_content, temp_rmd)
        log_message("Rmd файл успешно записан")
        
        # Записываем копию Rmd файла для отладки
        debug_rmd <- paste0(dirname(pdf_file), "/debug_", basename(temp_rmd))
        writeLines(rmd_content, debug_rmd)
        log_message(paste("Копия Rmd файла для отладки:", debug_rmd))
      }, error = function(e) {
        log_message(paste("Ошибка при записи Rmd файла:", e$message))
        use_rmarkdown_approach <- FALSE
      })
      
      # Рендерим Rmd в PDF с поддержкой русского языка
      log_message("Начало рендеринга Rmd в PDF")
      tryCatch({
        rmarkdown::render(
          input = temp_rmd,
          output_file = pdf_file,
          quiet = FALSE,
          encoding = "UTF-8"
        )
        log_message(paste("PDF успешно создан:", pdf_file))
        
        # Удаляем временные файлы
        if (file.exists(temp_rmd)) {
          file.remove(temp_rmd)
          log_message("Временный Rmd файл удален")
        }
        if (file.exists(temp_obj)) {
          file.remove(temp_obj)
          log_message("Временный RDS файл удален")
        }
        
        return(invisible(TRUE))
      }, error = function(e) {
        log_message(paste("❌ Ошибка при рендеринге PDF:", e$message))
        use_rmarkdown_approach <- FALSE
      })
    }
  }
  
  # Если подход с R Markdown не используется или не удался, используем стандартный подход
  if (!use_rmarkdown_approach) {
    # Открываем PDF устройство с поддержкой кириллицы
    # Если используем альбомную ориентацию, меняем местами ширину и высоту
    if (use_landscape) {
      pdf(pdf_file, width = width, height = height, encoding = "CP1251", family = "serif", paper = "special")
    } else {
      pdf(pdf_file, width = width, height = height, encoding = "CP1251", family = "serif")
    }
    
    # Создаем единую страницу для всего контента
    grid::grid.newpage()
    
    # Если есть заголовок, добавляем его
    current_y <- 0.95
    if (!is.null(title)) {
      grid::grid.text(title, x = 0.5, y = current_y, just = "center", 
                     gp = grid::gpar(fontsize = 16, fontface = "bold", fontfamily = "serif"))
      current_y <- current_y - 0.05
    }
    
    # Добавляем текст, если он есть
    if (text != "") {
      # Разбиваем текст на абзацы
      paragraphs <- strsplit(text, "\n\n")[[1]]
      
      # Добавляем каждый абзац отдельно
      for (para in paragraphs) {
        if (trimws(para) != "") {
          # Разбиваем абзац на строки с учетом кириллицы
          para_lines <- strwrap(para, width = 80)
          
          for (line in para_lines) {
            grid::grid.text(line, x = 0.1, y = current_y, just = "left", 
                           gp = grid::gpar(fontsize = 10, fontfamily = "serif"))
            current_y <- current_y - 0.03
          }
          
          # Дополнительный отступ между абзацами
          current_y <- current_y - 0.02
        }
      }
      
      # Добавляем разделительную линию
      grid::grid.lines(
        x = c(0.05, 0.95),
        y = c(current_y, current_y),
        gp = grid::gpar(col = "gray", lwd = 1)
      )
      current_y <- current_y - 0.03  # Уменьшаем отступ после линии
    }
    
    # Определяем оставшееся пространство для визуализации
    viz_height_ratio <- min(0.7, (current_y - 0.05) / 0.95)
    
    # Добавляем визуализацию
    if (is_ggplot) {
      # Для ggplot используем viewport
      vp <- grid::viewport(x = 0.5, y = current_y/2, width = 0.9, height = viz_height_ratio, 
                          just = c("center", "top"))
      grid::pushViewport(vp)
      print(obj, newpage = FALSE)
      grid::popViewport()
    } else if (is_gt_table) {
      # Для gt таблицы
      if (!requireNamespace("gt", quietly = TRUE)) {
        stop("Пакет 'gt' не установлен.")
      }
      
      # Преобразуем gt в grob, если возможно
      tryCatch({
        if (requireNamespace("gridExtra", quietly = TRUE) && requireNamespace("ggplot2", quietly = TRUE)) {
          # Извлекаем данные из gt таблицы
          table_data <- obj[["_data"]]
          
          # Создаем таблицу с помощью gridExtra
          if (requireNamespace("gridExtra", quietly = TRUE)) {
            vp <- grid::viewport(x = 0.5, y = current_y/2, width = 0.9, height = viz_height_ratio, 
                               just = c("center", "top"))
            grid::pushViewport(vp)
            
            # Настраиваем размер шрифта в зависимости от количества колонок
            font_size <- 0.8
            if (ncol(table_data) > 6) font_size <- 0.7
            if (ncol(table_data) > 8) font_size <- 0.6
            if (ncol(table_data) > 10) font_size <- 0.5
            
            # Создаем таблицу с адаптивным размером шрифта
            grid_table <- gridExtra::tableGrob(
              table_data, 
              rows = NULL, 
              theme = gridExtra::ttheme_minimal(
                core = list(
                  fg_params = list(fontfamily = "serif", cex = font_size),
                  bg_params = list(fill = c("white", "grey95"), col = "grey90")
                ),
                colhead = list(
                  fg_params = list(fontfamily = "serif", fontface = "bold", cex = font_size + 0.1),
                  bg_params = list(fill = "grey90", col = "black")
                )
              )
            )
            
            # Масштабируем таблицу, если она слишком широкая
            if (ncol(table_data) > 6) {
              scale_factor <- 6 / ncol(table_data)
              grid_table <- grid::editGrob(
                grid_table,
                vp = grid::viewport(
                  width = unit(0.9, "npc"),
                  height = unit(viz_height_ratio, "npc"),
                  just = c("center", "top")
                )
              )
            }
            
            grid::grid.draw(grid_table)
            grid::popViewport()
          } else {
            # Отображаем таблицу как текст
            grid::grid.text("Таблица данных", x = 0.5, y = current_y - 0.05, just = "center", 
                           gp = grid::gpar(fontsize = 14, fontface = "bold", fontfamily = "serif"))
            
            # Создаем красивую таблицу с помощью grid
            create_beautiful_table(table_data, x = 0.1, y = current_y - 0.1, width = 0.8, height = viz_height_ratio - 0.1)
          }
        } else {
          grid::grid.text("GT таблица", x = 0.5, y = current_y/2, just = "center", 
                         gp = grid::gpar(fontsize = 14, fontfamily = "serif"))
        }
      }, error = function(e) {
        grid::grid.text("Не удалось отобразить GT таблицу", x = 0.5, y = current_y/2, just = "center", 
                       gp = grid::gpar(fontsize = 14, fontfamily = "serif"))
        log_message(paste("Ошибка при отображении GT таблицы:", e$message))
      })
    } else if (is_grob) {
      # Для grid объектов
      vp <- grid::viewport(x = 0.5, y = current_y/2, width = 0.9, height = viz_height_ratio, 
                          just = c("center", "top"))
      grid::pushViewport(vp)
      grid::grid.draw(obj)
      grid::popViewport()
    } else if (is_dataframe) {
      # Для data.frame
      if (requireNamespace("gridExtra", quietly = TRUE)) {
        vp <- grid::viewport(x = 0.5, y = current_y/2, width = 0.9, height = viz_height_ratio, 
                           just = c("center", "top"))
        grid::pushViewport(vp)
        
        # Настраиваем размер шрифта в зависимости от количества колонок
        font_size <- 0.8
        if (ncol(obj) > 6) font_size <- 0.7
        if (ncol(obj) > 8) font_size <- 0.6
        if (ncol(obj) > 10) font_size <- 0.5
        
        # Создаем таблицу с адаптивным размером шрифта
        grid_table <- gridExtra::tableGrob(
          obj, 
          rows = NULL, 
          theme = gridExtra::ttheme_minimal(
            core = list(
              fg_params = list(fontfamily = "serif", cex = font_size),
              bg_params = list(fill = c("white", "grey95"), col = "grey90")
            ),
            colhead = list(
              fg_params = list(fontfamily = "serif", fontface = "bold", cex = font_size + 0.1),
              bg_params = list(fill = "grey90", col = "black")
            )
          )
        )
        
        # Масштабируем таблицу, если она слишком широкая
        if (ncol(obj) > 6) {
          scale_factor <- 6 / ncol(obj)
          grid_table <- grid::editGrob(
            grid_table,
            vp = grid::viewport(
              width = unit(0.9, "npc"),
              height = unit(viz_height_ratio, "npc"),
              just = c("center", "top")
            )
          )
        }
        
        grid::grid.draw(grid_table)
        grid::popViewport()
      } else {
        # Отображаем таблицу как текст
        grid::grid.text("Таблица данных", x = 0.5, y = current_y - 0.05, just = "center", 
                       gp = grid::gpar(fontsize = 14, fontface = "bold", fontfamily = "serif"))
        
        # Создаем красивую таблицу с помощью grid
        create_beautiful_table(obj, x = 0.1, y = current_y - 0.1, width = 0.8, height = viz_height_ratio - 0.1)
      }
    } else {
      grid::grid.text("Неизвестный тип объекта", x = 0.5, y = current_y/2, just = "center", 
                     gp = grid::gpar(fontsize = 14, fontfamily = "serif"))
    }
    
    # Закрываем PDF устройство
    dev.off()
  }
  
  # Проверяем, что файл создан
  if (file.exists(pdf_file)) {
    log_message(paste("PDF файл успешно создан:", pdf_file))
    # Проверяем размер файла
    file_info <- file.info(pdf_file)
    log_message(paste("Размер PDF файла:", file_info$size, "байт"))
    
    return(invisible(TRUE))
  } else {
    log_message(paste("ОШИБКА: PDF файл не был создан:", pdf_file))
    return(invisible(FALSE))
  }
}

# Функция для создания красивой таблицы с автоматическим масштабированием
create_beautiful_table <- function(data, x = 0.1, y = 0.8, width = 0.8, height = 0.6) {
  # Получаем размеры данных
  n_rows <- nrow(data)
  n_cols <- ncol(data)
  
  # Ограничиваем количество отображаемых строк и столбцов
  max_rows <- min(n_rows, 20)
  max_cols <- min(n_cols, 10)
  
  # Вычисляем шаг для строк и столбцов
  row_step <- height / (max_rows + 1)
  
  # Адаптируем ширину колонок в зависимости от количества
  col_width_factor <- 1
  if (max_cols > 6) {
    col_width_factor <- 6 / max_cols
  }
  col_step <- width * col_width_factor / max_cols
  
  # Рисуем заголовки с улучшенным стилем
  col_names <- names(data)[1:max_cols]
  for (i in 1:length(col_names)) {
    # Обрезаем длинные заголовки
    header_text <- col_names[i]
    if (nchar(header_text) > 10) {
      header_text <- paste0(substr(header_text, 1, 8), "...")
    }
    
    grid::grid.text(header_text, 
                   x = x + (i-1)*col_step + col_step/2, 
                   y = y, 
                   just = "center", 
                   gp = grid::gpar(fontsize = 8, fontface = "bold", fontfamily = "serif"))
  }
  
  # Рисуем линию под заголовками
  grid::grid.lines(
    x = c(x, x + width * col_width_factor),
    y = c(y - row_step/2, y - row_step/2),
    gp = grid::gpar(col = "black", lwd = 1)
  )
  
  # Рисуем данные с чередующимися цветами строк
  for (row in 1:max_rows) {
    # Определяем цвет фона для строки
    bg_color <- if(row %% 2 == 0) "grey95" else "white"
    
    # Рисуем фон строки
    grid::grid.rect(
      x = x, y = y - row*row_step + row_step/2,
      width = width * col_width_factor, height = row_step,
      just = c("left", "center"),
      gp = grid::gpar(fill = bg_color, col = "grey90", lwd = 0.5)
    )
    
    for (col in 1:max_cols) {
      if (col <= ncol(data) && row <= nrow(data)) {
        value <- data[row, col]
        if (is.numeric(value)) {
          value <- format(value, scientific = FALSE, big.mark = " ")
        } else {
          value <- as.character(value)
        }
        
        # Обрезаем слишком длинные значения
        if (nchar(value) > 10) {
          value <- paste0(substr(value, 1, 8), "...")
        }
        
        grid::grid.text(value, 
                       x = x + (col-1)*col_step + col_step/2, 
                       y = y - row*row_step, 
                       just = "center", 
                       gp = grid::gpar(fontsize = 7, fontfamily = "serif"))
      }
    }
    
    # Рисуем горизонтальные линии между строками (кроме последней)
    if (row < max_rows) {
      grid::grid.lines(
        x = c(x, x + width * col_width_factor),
        y = c(y - row*row_step - row_step/2, y - row*row_step - row_step/2),
        gp = grid::gpar(col = "grey90", lwd = 0.5)
      )
    }
  }
  
  # Рисуем вертикальные линии между столбцами
  for (col in 0:max_cols) {
    grid::grid.lines(
      x = c(x + col*col_step, x + col*col_step),
      y = c(y + row_step/2, y - max_rows*row_step - row_step/2),
      gp = grid::gpar(col = if(col == 0 || col == max_cols) "black" else "grey90", 
                     lwd = if(col == 0 || col == max_cols) 1 else 0.5)
    )
  }
  
  # Если есть дополнительные строки, добавляем многоточие
  if (n_rows > max_rows) {
    grid::grid.text("...", 
                   x = x + width * col_width_factor/2, 
                   y = y - (max_rows+1)*row_step, 
                   just = "center", 
                   gp = grid::gpar(fontsize = 8, fontfamily = "serif"))
  }
}

# Вспомогательная функция для создания текстовой таблицы с помощью grid
create_text_table <- function(data, x = 0.1, y = 0.8, width = 0.8, height = 0.6) {
  # Получаем размеры данных
  n_rows <- nrow(data)
  n_cols <- ncol(data)
  
  # Ограничиваем количество отображаемых строк и столбцов
  max_rows <- min(n_rows, 20)
  max_cols <- min(n_cols, 10)
  
  # Вычисляем шаг для строк и столбцов
  row_step <- height / (max_rows + 1)
  
  # Адаптируем ширину колонок в зависимости от количества
  col_width_factor <- 1
  if (max_cols > 6) {
    col_width_factor <- 6 / max_cols
  }
  col_step <- width * col_width_factor / max_cols
  
  # Рисуем заголовки
  col_names <- names(data)[1:max_cols]
  for (i in 1:length(col_names)) {
    # Обрезаем длинные заголовки
    header_text <- col_names[i]
    if (nchar(header_text) > 10) {
      header_text <- paste0(substr(header_text, 1, 8), "...")
    }
    
    grid::grid.text(header_text, 
                   x = x + (i-1)*col_step + col_step/2, 
                   y = y, 
                   just = "center", 
                   gp = grid::gpar(fontsize = 8, fontface = "bold", fontfamily = "serif"))
  }
  
  # Рисуем линию под заголовками
  grid::grid.lines(
    x = c(x, x + width * col_width_factor),
    y = c(y - row_step/2, y - row_step/2),
    gp = grid::gpar(col = "black", lwd = 1)
  )
  
  # Рисуем данные
  for (row in 1:max_rows) {
    for (col in 1:max_cols) {
      if (col <= ncol(data) && row <= nrow(data)) {
        value <- data[row, col]
        if (is.numeric(value)) {
          value <- format(value, scientific = FALSE, big.mark = " ")
        } else {
          value <- as.character(value)
        }
        
        # Обрезаем слишком длинные значения
        if (nchar(value) > 10) {
          value <- paste0(substr(value, 1, 8), "...")
        }
        
        grid::grid.text(value, 
                       x = x + (col-1)*col_step + col_step/2, 
                       y = y - row*row_step, 
                       just = "center", 
                       gp = grid::gpar(fontsize = 7, fontfamily = "serif"))
      }
    }
    
    # Рисуем горизонтальные линии между строками (кроме последней)
    if (row < max_rows) {
      grid::grid.lines(
        x = c(x, x + width * col_width_factor),
        y = c(y - row*row_step - row_step/2, y - row*row_step - row_step/2),
        gp = grid::gpar(col = "grey90", lwd = 0.5)
      )
    }
  }
  
  # Рисуем вертикальные линии между столбцами
  for (col in 0:max_cols) {
    grid::grid.lines(
      x = c(x + col*col_step, x + col*col_step),
      y = c(y + row_step/2, y - max_rows*row_step - row_step/2),
      gp = grid::gpar(col = if(col == 0 || col == max_cols) "black" else "grey90", 
                     lwd = if(col == 0 || col == max_cols) 1 else 0.5)
    )
  }
  
  # Если есть дополнительные строки, добавляем многоточие
  if (n_rows > max_rows) {
    grid::grid.text("...", 
                   x = x + width * col_width_factor/2, 
                   y = y - (max_rows+1)*row_step, 
                   just = "center", 
                   gp = grid::gpar(fontsize = 8, fontfamily = "serif"))
  }
}

# Функция для безопасного создания PDF с текстом и визуализацией
safe_create_pdf <- function(obj, pdf_file, text = NULL, title = NULL, width = 8, height = NULL) {
  log_message("Запуск безопасного создания PDF")
  
  # Проверяем и обновляем пакеты
  tryCatch({
    check_and_update_packages()
  }, error = function(e) {
    log_message(paste("Ошибка при проверке пакетов:", e$message))
  })
  
  # Пробуем разные методы создания PDF
  methods <- list(
    "direct" = function() {
      log_message("Попытка создания PDF напрямую")
      create_pdf_with_text_direct(obj, pdf_file, text, width, height, title)
    },
    "rmarkdown" = function() {
      log_message("Попытка создания PDF через R Markdown")
      create_pdf_with_text(obj, pdf_file, text, width, height, title)
    },
    "standard" = function() {
      log_message("Попытка создания PDF стандартным методом")
      if ("gg" %in% class(obj)) {
        ggplot2::ggsave(filename = pdf_file, plot = obj, width = width, height = if(is.null(height)) 6 else height, 
                        device = cairo_pdf)
      } else if ("gt_tbl" %in% class(obj)) {
        gt::gtsave(obj, filename = pdf_file)
      } else if (inherits(obj, "data.frame")) {
        pdf(pdf_file, width = width, height = if(is.null(height)) 6 else height, 
            encoding = "CP1251", family = "serif")
        grid_table <- gridExtra::tableGrob(obj, rows = NULL)
        grid::grid.draw(grid_table)
        dev.off()
      } else if ("grob" %in% class(obj) || "gtable" %in% class(obj)) {
        pdf(pdf_file, width = width, height = if(is.null(height)) 6 else height, 
            encoding = "CP1251", family = "serif")
        grid::grid.newpage()
        grid::grid.draw(obj)
        dev.off()
      } else {
        stop("Неизвестный тип объекта")
      }
    },
    "text_only" = function() {
      log_message("Попытка создания PDF только с текстом")
      pdf(pdf_file, width = width, height = if(is.null(height)) 6 else height, 
          encoding = "CP1251", family = "serif")
      grid::grid.newpage()
      
      # Разбиваем текст на абзацы
      paragraphs <- strsplit(text, "\n\n")[[1]]
      
      # Начальная позиция Y
      y_pos <- 0.95
      
      # Добавляем заголовок, если есть
      if (!is.null(title)) {
        grid::grid.text(title, x = 0.5, y = y_pos, just = "center", 
                       gp = grid::gpar(fontsize = 16, fontface = "bold", fontfamily = "serif"))
        y_pos <- y_pos - 0.05
      }
      
      # Добавляем каждый абзац отдельно
      for (para in paragraphs) {
        if (trimws(para) != "") {
          # Разбиваем абзац на строки с учетом кириллицы
          para_lines <- strwrap(para, width = 80)
          
          for (line in para_lines) {
            grid::grid.text(line, x = 0.1, y = y_pos, just = "left", 
                           gp = grid::gpar(fontsize = 10, fontfamily = "serif"))
            y_pos <- y_pos - 0.03
          }
          
          # Дополнительный отступ между абзацами
          y_pos <- y_pos - 0.02
        }
      }
      
      dev.off()
    }
  )
  
  # Пробуем каждый метод по очереди
  for (method_name in names(methods)) {
    method_func <- methods[[method_name]]
    
    tryCatch({
      log_message(paste("Пробуем метод:", method_name))
      method_func()
      
      # Проверяем, что файл создан
      if (file.exists(pdf_file)) {
        file_info <- file.info(pdf_file)
        log_message(paste("PDF файл успешно создан методом", method_name, "размер:", file_info$size, "байт"))
        
        # Если размер файла слишком маленький, это может быть пустой PDF
        if (file_info$size < 1000) {
          log_message("Предупреждение: PDF файл имеет очень маленький размер, возможно он пустой")
          next
        }
        
        return(invisible(TRUE))
      } else {
        log_message(paste("Метод", method_name, "не создал файл PDF"))
      }
    }, error = function(e) {
      log_message(paste("Ошибка при использовании метода", method_name, ":", e$message))
    })
  }
  
  # Если ни один метод не сработал, возвращаем ошибку
  log_message("Не удалось создать PDF ни одним из методов")
  stop("Не удалось создать PDF ни одним из методов")
} 

# Функция для проверки и обновления пакетов
check_and_update_packages <- function() {
  log_message("Проверка и обновление необходимых пакетов")
  
  # Список необходимых пакетов
  required_packages <- c("ggplot2", "gt", "gridExtra", "grid", "knitr", "rmarkdown", "jsonlite", "pdftools", "kableExtra")
  
  # Проверяем наличие пакетов и устанавливаем отсутствующие
  for (pkg in required_packages) {
    if (!requireNamespace(pkg, quietly = TRUE)) {
      log_message(paste("Установка пакета", pkg))
      install.packages(pkg, repos = "https://cloud.r-project.org")
    }
  }
  
  # Проверяем версию xfun
  if (requireNamespace("xfun", quietly = TRUE)) {
    xfun_version <- packageVersion("xfun")
    if (xfun_version < "0.52") {
      log_message(paste("Обновление пакета xfun с версии", xfun_version, "до минимум 0.52"))
      install.packages("xfun", repos = "https://cloud.r-project.org")
    }
  } else {
    log_message("Установка пакета xfun")
    install.packages("xfun", repos = "https://cloud.r-project.org")
  }
  
  log_message("Проверка пакетов завершена")
} 