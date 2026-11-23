import { Link } from 'react-router-dom'
import type { Category } from '../../../core/types/entity'
import { Card } from '../../../core/ui/Card'
import { ProgressBar } from '../../../core/ui/ProgressBar'

interface CategoryCardProps {
  category: Category
  done: number
  total: number
}

export function CategoryCard({ category, done, total }: CategoryCardProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <Link to={`/categories/${category.id}`} className="block">
      <Card className="p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{category.icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-accent-dark">{category.name}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {done} из {total} · {percent}%
            </p>
            <ProgressBar value={percent} className="mt-2 !h-1.5" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
