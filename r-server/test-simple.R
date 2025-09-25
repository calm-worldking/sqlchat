# Простой тестовый скрипт для проверки быстрой работы
library(ggplot2)

# Создаем простые данные
data <- data.frame(
  x = 1:10,
  y = (1:10)^2
)

# Создаем простой график
p <- ggplot(data, aes(x = x, y = y)) +
  geom_line(color = "blue", size = 2) +
  geom_point(color = "red", size = 3) +
  labs(title = "Простой тестовый график",
       x = "X",
       y = "Y") +
  theme_minimal()

print("График создан успешно!")
