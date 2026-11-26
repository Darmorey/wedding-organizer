export const DECOR_CATEGORY_NAME = 'Декор и цветы'
export const CATERING_CATEGORY_NAME = 'Кейтеринг'

export type MoodBoardMode = 'none' | 'grid' | 'canvas'

export function moodBoardMode(name: string): MoodBoardMode {
  const normalized = name.trim().toLowerCase()
  if (normalized.includes('кейтеринг')) return 'canvas'
  if (normalized.includes('декор')) return 'grid'
  return 'none'
}

export function categoryHasMoodBoard(name: string): boolean {
  return moodBoardMode(name) !== 'none'
}