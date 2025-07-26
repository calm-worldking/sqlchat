# Создаем тестовую таблицу data.frame

# Создаем тестовые данные для отчета о продажах
set.seed(123) # для воспроизводимости

# Создаем данные
months <- c("Январь", "Февраль", "Март", "Апрель", "Май", "Июнь")
products <- c("Ноутбуки", "Смартфоны", "Планшеты", "Мониторы")

# Создаем пустую таблицу
df <- data.frame(
  Месяц = character(),
  Продукт = character(),
  Количество = numeric(),
  Выручка = numeric(),
  Прибыль = numeric(),
  stringsAsFactors = FALSE
)

# Заполняем таблицу данными
for (month in months) {
  for (product in products) {
    quantity <- round(runif(1, 50, 500))
    revenue <- quantity * round(runif(1, 100, 1000))
    profit <- revenue * runif(1, 0.1, 0.3)
    
    df <- rbind(df, data.frame(
      Месяц = month,
      Продукт = product,
      Количество = quantity,
      Выручка = revenue,
      Прибыль = round(profit, 2)
    ))
  }
}

# Выводим таблицу
print(df)

# Таблица будет автоматически экспортирована в HTML и JSON 