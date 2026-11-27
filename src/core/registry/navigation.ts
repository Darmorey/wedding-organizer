export interface NavItem {
  path: string
  label: string
  icon: string
}

export const MAIN_NAV: NavItem[] = [
  { path: '/', label: 'Главная', icon: '🏠' },
  { path: '/categories', label: 'Задачи', icon: '📋' },
  { path: '/deadlines', label: 'Дедлайны', icon: '⏰' },
  { path: '/timing', label: 'Тайминг', icon: '🕒' },
]
