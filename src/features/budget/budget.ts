import { parseMoneyAmount, venueCardFields } from '../../core/config/moodboard'
import type { Category, MoodItem } from '../../core/types/entity'

export interface BudgetExpense {
  id: string
  name: string
  amount: string
}

export interface BudgetLine {
  id: string
  categoryId: string
  group: string
  name: string
  amount: number
  source: 'venue' | 'manual'
}

export function categoryHasBudgetByName(name: string) {
  const normalized = name.trim().toLowerCase()
  if (normalized.includes('дат') && normalized.includes('бюджет')) return false
  if (normalized.includes('гост')) return false
  if (normalized.includes('день свадьб')) return false
  return true
}

export function categoryHasBudget(category: Category) {
  const flag = category.metadata?.budgetCost
  if (flag === false) return false
  if (flag === true) return true
  return categoryHasBudgetByName(category.name)
}

export function budgetCategories(categories: Category[]) {
  return categories.filter(categoryHasBudget)
}

export function categoryPlanAmount(category: Category) {
  const raw = category.metadata?.budgetPlan
  if (typeof raw === 'string') return parseMoneyAmount(raw)
  if (typeof raw === 'number') return raw
  return 0
}

export function totalPlanFromCategories(categories: Category[]) {
  return budgetCategories(categories).reduce((sum, category) => sum + categoryPlanAmount(category), 0)
}

export function categoryExpenses(category: Category): BudgetExpense[] {
  const raw = category.metadata?.expenses
  if (!Array.isArray(raw)) return []

  const expenses: BudgetExpense[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    if (typeof record.id !== 'string' || typeof record.name !== 'string') continue
    const amount =
      typeof record.amount === 'string'
        ? record.amount
        : typeof record.amount === 'number'
          ? String(record.amount)
          : ''
    expenses.push({ id: record.id, name: record.name, amount })
  }
  return expenses
}

export function chosenVenueLines(items: MoodItem[], categories: Category[]): BudgetLine[] {
  const names = new Map(categories.map((category) => [category.id, category.name]))
  return items
    .filter((item) => !item.deletedAt && item.metadata?.placeCard && item.metadata.chosen === true)
    .map((item) => {
      const fields = venueCardFields(item)
      return {
        id: item.id,
        categoryId: item.categoryId,
        group: names.get(item.categoryId) ?? 'Площадка',
        name: fields.place || 'Место',
        amount: parseMoneyAmount(fields.budget),
        source: 'venue' as const,
      }
    })
    .filter((line) => line.amount > 0)
}

export function manualExpenseLines(categories: Category[]): BudgetLine[] {
  return categories.flatMap((category) =>
    categoryExpenses(category)
      .map((expense) => ({
        id: expense.id,
        categoryId: category.id,
        group: category.name,
        name: expense.name.trim() || 'Трата',
        amount: parseMoneyAmount(expense.amount),
        source: 'manual' as const,
      }))
      .filter((line) => line.amount > 0),
  )
}

export function allBudgetLines(items: MoodItem[], categories: Category[]): BudgetLine[] {
  return [...chosenVenueLines(items, categories), ...manualExpenseLines(categories)]
}

export function spentFromLines(lines: BudgetLine[]) {
  return lines.reduce((sum, line) => sum + line.amount, 0)
}

export function spentForCategory(lines: BudgetLine[], categoryId: string) {
  return spentFromLines(lines.filter((line) => line.categoryId === categoryId))
}
