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
    <Link to={`/categories/${category.id}`}>
      <Card>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-accent-dark">{category.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {done} из {total} · {percent}%
            </p>
            <ProgressBar value={percent} className="mt-3" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
