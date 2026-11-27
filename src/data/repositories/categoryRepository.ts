import type { Category } from '../../core/types/entity'
import { createId, nowIso } from '../../core/utils/id'
import { categoryExpenses, type BudgetExpense } from '../../features/budget/budget'
import { db } from '../db/database'
import { assertProjectId, enqueueSync } from './baseRepository'

export const categoryRepository = {
  async listByProject(projectId: string): Promise<Category[]> {
    assertProjectId(projectId)
    const rows = await db.categories.where('projectId').equals(projectId).toArray()
    return rows.filter((row) => !row.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder)
  },

  async getById(projectId: string, categoryId: string): Promise<Category | undefined> {
    assertProjectId(projectId)
    const category = await db.categories.get(categoryId)
    if (!category || category.projectId !== projectId || category.deletedAt) {
      return undefined
    }
    return category
  },

  async create(
    projectId: string,
    input: Pick<Category, 'name' | 'icon'>,
    metadata: Record<string, unknown> = {},
  ): Promise<Category> {
    assertProjectId(projectId)

    const existing = await db.categories.where('projectId').equals(projectId).toArray()
    const active = existing.filter((item) => !item.deletedAt)
    const now = nowIso()

    const category: Category = {
      id: createId(),
      projectId,
      name: input.name.trim(),
      icon: input.icon.trim() || '📋',
      sortOrder: active.length,
      metadata: { ...metadata },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.categories.put(category)
    await enqueueSync(projectId, 'categories', category.id, 'upsert')
    return category
  },

  async setBudgetCost(projectId: string, categoryId: string, enabled: boolean): Promise<void> {
    const category = await this.getById(projectId, categoryId)
    if (!category) return

    const updated: Category = {
      ...category,
      metadata: {
        ...(category.metadata ?? {}),
        budgetCost: enabled,
      },
      updatedAt: nowIso(),
    }

    await db.categories.put(updated)
    await enqueueSync(projectId, 'categories', categoryId, 'upsert')
  },

  async setBudgetPlan(projectId: string, categoryId: string, plan: string): Promise<void> {
    const category = await this.getById(projectId, categoryId)
    if (!category) return

    const updated: Category = {
      ...category,
      metadata: {
        ...(category.metadata ?? {}),
        budgetPlan: plan.trim(),
      },
      updatedAt: nowIso(),
    }

    await db.categories.put(updated)
    await enqueueSync(projectId, 'categories', categoryId, 'upsert')
  },

  async saveExpenses(projectId: string, categoryId: string, expenses: BudgetExpense[]): Promise<void> {
    const category = await this.getById(projectId, categoryId)
    if (!category) return

    const updated: Category = {
      ...category,
      metadata: {
        ...(category.metadata ?? {}),
        expenses,
      },
      updatedAt: nowIso(),
    }

    await db.categories.put(updated)
    await enqueueSync(projectId, 'categories', categoryId, 'upsert')
  },

  async addExpense(
    projectId: string,
    categoryId: string,
    input: { name: string; amount: string },
  ): Promise<void> {
    const category = await this.getById(projectId, categoryId)
    if (!category) return
    const expenses = categoryExpenses(category)
    expenses.push({
      id: createId(),
      name: input.name.trim(),
      amount: input.amount.trim(),
    })
    await this.saveExpenses(projectId, categoryId, expenses)
  },

  async updateExpense(
    projectId: string,
    categoryId: string,
    expenseId: string,
    input: { name: string; amount: string },
  ): Promise<void> {
    const category = await this.getById(projectId, categoryId)
    if (!category) return
    const expenses = categoryExpenses(category).map((expense) =>
      expense.id === expenseId
        ? { ...expense, name: input.name.trim(), amount: input.amount.trim() }
        : expense,
    )
    await this.saveExpenses(projectId, categoryId, expenses)
  },

  async removeExpense(projectId: string, categoryId: string, expenseId: string): Promise<void> {
    const category = await this.getById(projectId, categoryId)
    if (!category) return
    await this.saveExpenses(
      projectId,
      categoryId,
      categoryExpenses(category).filter((expense) => expense.id !== expenseId),
    )
  },

  async reorder(projectId: string, orderedIds: string[]): Promise<void> {
    assertProjectId(projectId)
    const items = await this.listByProject(projectId)
    if (orderedIds.length !== items.length) return
    const byId = new Map(items.map((item) => [item.id, item]))
    const now = nowIso()
    const changedIds: string[] = []

    await db.transaction('rw', db.categories, async () => {
      for (let sortOrder = 0; sortOrder < orderedIds.length; sortOrder++) {
        const item = byId.get(orderedIds[sortOrder])
        if (!item || item.sortOrder === sortOrder) continue
        await db.categories.put({
          ...item,
          sortOrder,
          updatedAt: now,
        })
        changedIds.push(item.id)
      }
    })

    for (const id of changedIds) {
      await enqueueSync(projectId, 'categories', id, 'upsert')
    }
  },

  async update(
    projectId: string,
    categoryId: string,
    input: { name: string; icon: string },
  ): Promise<Category> {
    const category = await this.getById(projectId, categoryId)
    if (!category) throw new Error('Category not found')

    const updated: Category = {
      ...category,
      name: input.name.trim(),
      icon: input.icon.trim() || category.icon,
      updatedAt: nowIso(),
    }

    await db.categories.put(updated)
    await enqueueSync(projectId, 'categories', categoryId, 'upsert')
    return updated
  },

  async rename(projectId: string, categoryId: string, name: string): Promise<Category> {
    const category = await this.getById(projectId, categoryId)
    if (!category) throw new Error('Category not found')

    const updated: Category = {
      ...category,
      name: name.trim(),
      updatedAt: nowIso(),
    }

    await db.categories.put(updated)
    await enqueueSync(projectId, 'categories', categoryId, 'upsert')
    return updated
  },

  async remove(projectId: string, categoryId: string): Promise<void> {
    const category = await this.getById(projectId, categoryId)
    if (!category) return

    const now = nowIso()
    const deleted: Category = {
      ...category,
      updatedAt: now,
      deletedAt: now,
    }

    await db.transaction('rw', db.categories, db.tasks, db.syncQueue, async () => {
      await db.categories.put(deleted)
      await enqueueSync(projectId, 'categories', categoryId, 'upsert')

      const tasks = await db.tasks
        .where('[projectId+categoryId]')
        .equals([projectId, categoryId])
        .toArray()

      for (const task of tasks) {
        if (task.deletedAt) continue
        const deletedTask = { ...task, updatedAt: now, deletedAt: now }
        await db.tasks.put(deletedTask)
        await enqueueSync(projectId, 'tasks', task.id, 'upsert')
      }
    })
  },
}
