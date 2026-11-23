import { OverflowMenu, OverflowMenuItem } from '../../../core/ui/OverflowMenu'

interface GuestsOverflowMenuProps {
  disabled?: boolean
  onEditCategories: () => void
  onEditStatuses: () => void
}

export function GuestsOverflowMenu({
  disabled,
  onEditCategories,
  onEditStatuses,
}: GuestsOverflowMenuProps) {
  return (
    <OverflowMenu ariaLabel="Меню гостей" disabled={disabled}>
      {(close) => (
        <>
          <OverflowMenuItem
            onClick={() => {
              close()
              onEditCategories()
            }}
          >
            Редактировать категории
          </OverflowMenuItem>
          <OverflowMenuItem
            onClick={() => {
              close()
              onEditStatuses()
            }}
          >
            Редактировать статусы
          </OverflowMenuItem>
        </>
      )}
    </OverflowMenu>
  )
}