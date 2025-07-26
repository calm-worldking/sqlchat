library(ggplot2)

# Создаем тестовые данные
age_group_start <- c(20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95)
age_group_end <- c(24, 29, 34, 39, 44, 49, 54, 59, 64, 69, 74, 79, 84, 89, 94, 99)
people_count <- c(312, 345, 298, 285, 332, 281, 339, 325, 310, 336, 309, 308, 309, 290, 318, 303)
age_groups <- paste(age_group_start, age_group_end, sep = "-")
data <- data.frame(AgeGroup = factor(age_groups, levels = age_groups), PeopleCount = people_count)

# Создаем график
p <- ggplot(data, aes(x = AgeGroup, y = PeopleCount)) +
  geom_col(fill = "steelblue") +
  labs(title = "Количество людей, посещающих спортивные залы по возрастным группам",
       x = "Возрастная группа (лет)", y = "Количество людей") +
  theme_minimal() +
  theme(axis.text.x = element_text(angle = 45, hjust = 1))

# В серверном коде будет использована функция save_visual_output для сохранения графика
print(p) 