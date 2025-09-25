
# Настройка локальной пользовательской библиотеки
rlib <- normalizePath("E:/work/wokraem/sqlchat/r-server/r-lib", winslash = "/", mustWork = FALSE)
if (!dir.exists(rlib)) dir.create(rlib, recursive = TRUE)
.libPaths(c(rlib, .libPaths()))
options(repos = c(CRAN = "https://cloud.r-project.org"))

# Проверяем и устанавливаем только отсутствующие пакеты
required_packages <- c("ggplot2", "dplyr", "jsonlite", "knitr", "rmarkdown", "xfun")

for (pkg in required_packages) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    tryCatch({
      install.packages(pkg, lib = rlib, quiet = TRUE)
      cat("Установлен пакет:", pkg, "\n")
    }, error = function(e) {
      cat("Ошибка установки пакета", pkg, ":", e$message, "\n")
    })
  } else {
    cat("Пакет", pkg, "уже установлен\n")
  }
}

cat("Инициализация пакетов завершена\n")
