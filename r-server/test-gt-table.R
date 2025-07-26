# Создаем тестовую таблицу с использованием gt
library(gt)

# Создаем тестовые данные
age_group_start <- c(20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95)
age_group_end <- c(24, 29, 34, 39, 44, 49, 54, 59, 64, 69, 74, 79, 84, 89, 94, 99)
people_count <- c(312, 345, 298, 285, 332, 281, 339, 325, 310, 336, 309, 308, 309, 290, 318, 303)
age_groups <- paste(age_group_start, age_group_end, sep = "-")

# Создаем data.frame
data <- data.frame(
  AgeGroup = age_groups,
  PeopleCount = people_count,
  PercentOfTotal = round(people_count / sum(people_count) * 100, 1)
)

# Создаем gt таблицу
gt_table <- gt(data) %>%
  tab_header(
    title = "Количество людей, посещающих спортивные залы",
    subtitle = "По возрастным группам"
  ) %>%
  fmt_number(
    columns = vars(PeopleCount),
    decimals = 0,
    use_seps = TRUE
  ) %>%
  fmt_percent(
    columns = vars(PercentOfTotal),
    decimals = 1,
    scale_values = FALSE
  ) %>%
  cols_label(
    AgeGroup = "Возрастная группа (лет)",
    PeopleCount = "Количество людей",
    PercentOfTotal = "% от общего числа"
  ) %>%
  tab_style(
    style = list(
      cell_fill(color = "#f0f8ff"),
      cell_text(weight = "bold")
    ),
    locations = cells_column_labels()
  ) %>%
  tab_style(
    style = list(
      cell_fill(color = "#e6f0ff")
    ),
    locations = cells_body(
      rows = seq(1, nrow(data), 2)
    )
  ) %>%
  tab_source_note(
    source_note = "Данные: Исследование посещаемости спортивных залов, 2023"
  )

# В серверном коде будет использована функция save_visual_output для сохранения таблицы
print(gt_table) 