import type { Task } from '../../../core/types/entity'
import { Button } from '../../../core/ui/Button'

interface TaskChecklistProps {
  tasks: Task[]
  onToggle: (taskId: string) => void
  onRemove: (taskId: string) => void
}

export function TaskChecklist({ tasks, onToggle, onRemove }: TaskChecklistProps) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted">Пока нет задач — добавьте первую ниже.</p>
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-center gap-3 rounded-xl border border-cream-dark bg-white px-3 py-3"
        >
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => onToggle(task.id)}
            className="size-5 rounded border-cream-dark text-accent focus:ring-accent/30"
          />
          <span
            className={[
              'flex-1 text-sm',
              task.done ? 'text-muted line-through' : 'text-ink',
            ].join(' ')}
          >
            {task.title}
          </span>
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onRemove(task.id)}>
            Удалить
          </Button>
        </li>
      ))}
    </ul>
  )
}
