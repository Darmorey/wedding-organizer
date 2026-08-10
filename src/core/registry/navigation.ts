export interface NavItem {
  path: string
  label: string
  icon: string
}

export const MAIN_NAV: NavItem[] = [
  { path: '/', label: 'Главная', icon: '🏠' },
  { path: '/categories', label: 'Категории', icon: '📋' },
  { path: '/guests', label: 'Гости', icon: '👥' },
]
