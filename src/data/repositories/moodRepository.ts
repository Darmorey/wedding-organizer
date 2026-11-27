import {
  defaultTextStyle,
  hydrateMoodItem,
  nextCanvasLayout,
  nextCanvasLayouts,
  withCanvasMetadata,
} from '../../core/config/moodCanvas'
import type { MoodCanvasLayout, MoodItem, MoodTextStyle } from '../../core/types/entity'
import { createId, nowIso } from '../../core/utils/id'
import { compressImage } from '../media/compressImage'
import { db } from '../db/database'
import { assertProjectId, enqueueSync } from './baseRepository'
import { moodStoragePath, removeMoodImage, uploadMoodImage } from '../supabase/storage'

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Вставьте ссылку')
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid')
    }
    return parsed.toString()
  } catch {
    throw new Error('Некорректная ссылка')
  }
}

export const moodRepository = {
  async listByCategory(projectId: string, categoryId: string): Promise<MoodItem[]> {
    assertProjectId(projectId)
    const rows = await db.moodItems
      .where('[projectId+categoryId]')
      .equals([projectId, categoryId])
      .toArray()

    return rows
      .filter((row) => !row.deletedAt)
      .map((row, index) => hydrateMoodItem(row as MoodItem, index))
      .sort((a, b) => {
        const orderA = a.sortOrder ?? -Date.parse(a.createdAt)
        const orderB = b.sortOrder ?? -Date.parse(b.createdAt)
        if (orderA !== orderB) return orderA - orderB
        return Date.parse(b.createdAt) - Date.parse(a.createdAt)
      })
  },

  async nextSortOrder(projectId: string, categoryId: string): Promise<number> {
    const existing = await this.listByCategory(projectId, categoryId)
    if (existing.length === 0) return 0
    return Math.min(...existing.map((item) => item.sortOrder ?? 0)) - 1
  },

  async addLink(projectId: string, categoryId: string, url: string, caption: string): Promise<MoodItem> {
    assertProjectId(projectId)
    const now = nowIso()
    const existing = await this.listByCategory(projectId, categoryId)
    const sortOrder = existing.length === 0 ? 0 : Math.min(...existing.map((item) => item.sortOrder ?? 0)) - 1
    const canvas = nextCanvasLayout(existing, 'link')
    const item: MoodItem = {
      id: createId(),
      projectId,
      categoryId,
      kind: 'link',
      caption: caption.trim(),
      url: normalizeUrl(url),
      storagePath: '',
      fileName: '',
      mimeType: '',
      sizeBytes: 0,
      uploadStatus: 'uploaded',
      sortOrder,
      canvas,
      textStyle: defaultTextStyle(),
      metadata: { sortOrder, moodKind: 'link', canvas },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.moodItems.put(item)
    await enqueueSync(projectId, 'mood_items', item.id, 'upsert')
    return item
  },

  async addImages(projectId: string, categoryId: string, files: File[]): Promise<MoodItem[]> {
    const images = files.filter((file) => file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name))
    if (images.length === 0) throw new Error('Выберите фото')

    const existing = await this.listByCategory(projectId, categoryId)
    const layouts = nextCanvasLayouts(existing, images.length, 'image')
    const created: MoodItem[] = []
    for (let index = 0; index < images.length; index++) {
      created.push(await this.addImage(projectId, categoryId, images[index], '', layouts[index]))
    }
    return created
  },

  async addImage(
    projectId: string,
    categoryId: string,
    file: File,
    caption: string,
    canvasOverride?: MoodCanvasLayout,
  ): Promise<MoodItem> {
    assertProjectId(projectId)
    const now = nowIso()
    const id = createId()
    const compressed = await compressImage(file)
    const storagePath = moodStoragePath(projectId, id)

    await uploadMoodImage(storagePath, compressed.blob, compressed.mimeType)

    const existing = await this.listByCategory(projectId, categoryId)
    const sortOrder = existing.length === 0 ? 0 : Math.min(...existing.map((item) => item.sortOrder ?? 0)) - 1
    const canvas = canvasOverride ?? nextCanvasLayout(existing, 'image')
    const item: MoodItem = {
      id,
      projectId,
      categoryId,
      kind: 'image',
      caption: caption.trim(),
      url: '',
      storagePath,
      fileName: compressed.fileName,
      mimeType: compressed.mimeType,
      sizeBytes: compressed.blob.size,
      uploadStatus: 'uploaded',
      sortOrder,
      canvas,
      textStyle: defaultTextStyle(),
      metadata: { sortOrder, moodKind: 'image', canvas },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.moodItems.put(item)
    await enqueueSync(projectId, 'mood_items', item.id, 'upsert')
    return item
  },

  async addVenue(
    projectId: string,
    categoryId: string,
    file: File | null,
    fields: { place: string; budget: string; details: string; comment: string; url: string },
  ): Promise<MoodItem> {
    assertProjectId(projectId)
    const now = nowIso()
    const id = createId()
    let storagePath = ''
    let fileName = ''
    let mimeType = ''
    let sizeBytes = 0

    if (file) {
      const compressed = await compressImage(file)
      storagePath = moodStoragePath(projectId, id)
      await uploadMoodImage(storagePath, compressed.blob, compressed.mimeType)
      fileName = compressed.fileName
      mimeType = compressed.mimeType
      sizeBytes = compressed.blob.size
    }

    const existing = await this.listByCategory(projectId, categoryId)
    const sortOrder = existing.length === 0 ? 0 : Math.min(...existing.map((item) => item.sortOrder ?? 0)) - 1
    const canvas = nextCanvasLayout(existing, 'image')
    const url = fields.url.trim() ? normalizeUrl(fields.url) : ''
    const item: MoodItem = {
      id,
      projectId,
      categoryId,
      kind: storagePath ? 'image' : 'link',
      caption: fields.place.trim(),
      url,
      storagePath,
      fileName,
      mimeType,
      sizeBytes,
      uploadStatus: 'uploaded',
      sortOrder,
      canvas,
      textStyle: defaultTextStyle(),
      metadata: {
        sortOrder,
        moodKind: storagePath ? 'image' : 'link',
        canvas,
        placeCard: true,
        budget: fields.budget.trim(),
        details: fields.details.trim(),
        comment: fields.comment.trim(),
      },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.moodItems.put(item)
    await enqueueSync(projectId, 'mood_items', item.id, 'upsert')
    return item
  },

  async updateVenue(
    projectId: string,
    itemId: string,
    file: File | null,
    fields: { place: string; budget: string; details: string; comment: string; url: string },
  ): Promise<void> {
    assertProjectId(projectId)
    const item = await db.moodItems.get(itemId)
    if (!item || item.projectId !== projectId || item.deletedAt) return

    const hydrated = hydrateMoodItem(item as MoodItem)
    let storagePath = hydrated.storagePath
    let fileName = hydrated.fileName
    let mimeType = hydrated.mimeType
    let sizeBytes = hydrated.sizeBytes
    let kind = hydrated.kind

    if (file) {
      const compressed = await compressImage(file)
      storagePath = hydrated.storagePath || moodStoragePath(projectId, itemId)
      await uploadMoodImage(storagePath, compressed.blob, compressed.mimeType)
      fileName = compressed.fileName
      mimeType = compressed.mimeType
      sizeBytes = compressed.blob.size
      kind = 'image'
    }

    const url = fields.url.trim() ? normalizeUrl(fields.url) : ''
    const latest = await db.moodItems.get(itemId)
    if (!latest || latest.deletedAt) return

    const updated: MoodItem = {
      ...hydrated,
      kind,
      caption: fields.place.trim(),
      url,
      storagePath,
      fileName,
      mimeType,
      sizeBytes,
      metadata: {
        ...(hydrated.metadata ?? {}),
        moodKind: kind,
        placeCard: true,
        budget: fields.budget.trim(),
        details: fields.details.trim(),
        comment: fields.comment.trim(),
      },
      updatedAt: nowIso(),
    }
    updated.metadata = withCanvasMetadata(updated)

    await db.moodItems.put(updated)
    await enqueueSync(projectId, 'mood_items', itemId, 'upsert')
  },

  async chooseVenue(projectId: string, categoryId: string, itemId: string): Promise<void> {
    assertProjectId(projectId)
    const items = await this.listByCategory(projectId, categoryId)
    const target = items.find((item) => item.id === itemId)
    if (!target || !target.metadata?.placeCard) return

    const currentlyChosen = target.metadata.chosen === true
    const now = nowIso()

    for (const item of items) {
      if (!item.metadata?.placeCard) continue
      const shouldChoose = !currentlyChosen && item.id === itemId
      if ((item.metadata.chosen === true) === shouldChoose) continue

      const updated: MoodItem = hydrateMoodItem({
        ...item,
        metadata: {
          ...(item.metadata ?? {}),
          chosen: shouldChoose,
        },
        updatedAt: now,
      })
      updated.metadata = withCanvasMetadata(updated)
      await db.moodItems.put(updated)
      await enqueueSync(projectId, 'mood_items', item.id, 'upsert')
    }
  },

  async reorder(projectId: string, categoryId: string, orderedIds: string[]): Promise<void> {
    assertProjectId(projectId)
    const items = await this.listByCategory(projectId, categoryId)
    const byId = new Map(items.map((item) => [item.id, item]))
    const reordered = orderedIds.map((id) => byId.get(id)).filter((item): item is MoodItem => Boolean(item))
    if (reordered.length !== items.length) return

    const now = nowIso()
    const changedIds: string[] = []

    await db.transaction('rw', db.moodItems, async () => {
      for (let sortOrder = 0; sortOrder < reordered.length; sortOrder++) {
        const item = reordered[sortOrder]
        if (item.sortOrder === sortOrder) continue
        await db.moodItems.put({
          ...item,
          sortOrder,
          metadata: { ...(item.metadata ?? {}), sortOrder },
          updatedAt: now,
        })
        changedIds.push(item.id)
      }
    })

    for (const id of changedIds) {
      await enqueueSync(projectId, 'mood_items', id, 'upsert')
    }
  },

  async addNote(projectId: string, categoryId: string, text = ''): Promise<MoodItem> {
    assertProjectId(projectId)
    const now = nowIso()
    const existing = await this.listByCategory(projectId, categoryId)
    const sortOrder = existing.length === 0 ? 0 : Math.min(...existing.map((item) => item.sortOrder ?? 0)) - 1
    const canvas = nextCanvasLayout(existing, 'note')
    const item: MoodItem = {
      id: createId(),
      projectId,
      categoryId,
      kind: 'note',
      caption: text.trim(),
      url: '',
      storagePath: '',
      fileName: '',
      mimeType: 'text/plain',
      sizeBytes: 0,
      uploadStatus: 'uploaded',
      sortOrder,
      canvas,
      textStyle: defaultTextStyle(),
      metadata: { sortOrder, moodKind: 'note', canvas, textStyle: defaultTextStyle() },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.moodItems.put(item)
    await enqueueSync(projectId, 'mood_items', item.id, 'upsert')
    return item
  },

  async updateCaption(projectId: string, itemId: string, caption: string): Promise<void> {
    assertProjectId(projectId)
    const item = await db.moodItems.get(itemId)
    if (!item || item.projectId !== projectId || item.deletedAt) return

    const updated: MoodItem = hydrateMoodItem({
      ...item,
      caption,
      updatedAt: nowIso(),
    } as MoodItem)
    updated.metadata = withCanvasMetadata(updated)

    const latest = await db.moodItems.get(itemId)
    if (!latest || latest.deletedAt) return
    await db.moodItems.put(updated)
    await enqueueSync(projectId, 'mood_items', itemId, 'upsert')
  },

  async updateTextStyle(projectId: string, itemId: string, textStyle: MoodTextStyle): Promise<void> {
    assertProjectId(projectId)
    const item = await db.moodItems.get(itemId)
    if (!item || item.projectId !== projectId || item.deletedAt) return

    const updated: MoodItem = hydrateMoodItem({
      ...item,
      textStyle,
      updatedAt: nowIso(),
    } as MoodItem)
    updated.textStyle = textStyle
    updated.metadata = withCanvasMetadata(updated)

    const latest = await db.moodItems.get(itemId)
    if (!latest || latest.deletedAt) return
    await db.moodItems.put(updated)
    await enqueueSync(projectId, 'mood_items', itemId, 'upsert')
  },

  async updateCanvas(projectId: string, itemId: string, canvas: MoodCanvasLayout): Promise<void> {
    assertProjectId(projectId)
    const item = await db.moodItems.get(itemId)
    if (!item || item.projectId !== projectId || item.deletedAt) return

    const updated: MoodItem = hydrateMoodItem({
      ...item,
      canvas,
      updatedAt: nowIso(),
    } as MoodItem)
    updated.canvas = canvas
    updated.metadata = withCanvasMetadata(updated)

    const latest = await db.moodItems.get(itemId)
    if (!latest || latest.deletedAt) return
    await db.moodItems.put(updated)
    await enqueueSync(projectId, 'mood_items', itemId, 'upsert')
  },

  async duplicate(projectId: string, itemId: string): Promise<MoodItem | null> {
    assertProjectId(projectId)
    const item = await db.moodItems.get(itemId)
    if (!item || item.projectId !== projectId || item.deletedAt) return null

    const hydrated = hydrateMoodItem(item as MoodItem)
    const existing = await this.listByCategory(projectId, item.categoryId)
    const z = existing.reduce((max, entry) => Math.max(max, entry.canvas?.z ?? 0), 0) + 1
    const now = nowIso()
    const canvas = {
      ...hydrated.canvas,
      x: hydrated.canvas.x + 28,
      y: hydrated.canvas.y + 28,
      z,
    }
    const copy: MoodItem = {
      ...hydrated,
      id: createId(),
      canvas,
      textStyle: hydrated.textStyle ?? defaultTextStyle(),
      metadata: withCanvasMetadata({ ...hydrated, canvas }),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.moodItems.put(copy)
    await enqueueSync(projectId, 'mood_items', copy.id, 'upsert')
    return copy
  },

  async replaceImage(projectId: string, itemId: string, file: File): Promise<void> {
    assertProjectId(projectId)
    const item = await db.moodItems.get(itemId)
    if (!item || item.projectId !== projectId || item.deletedAt || item.kind !== 'image') return

    const hydrated = hydrateMoodItem(item as MoodItem)
    const compressed = await compressImage(file)
    const storagePath = hydrated.storagePath || moodStoragePath(projectId, itemId)
    await uploadMoodImage(storagePath, compressed.blob, compressed.mimeType)

    const canvas = {
      ...hydrated.canvas,
      mediaWidth: 0,
      mediaHeight: 0,
      imageOffsetX: 0.5,
      imageOffsetY: 0.5,
      imageZoom: 1,
    }
    const updated: MoodItem = {
      ...hydrated,
      storagePath,
      fileName: compressed.fileName,
      mimeType: compressed.mimeType,
      sizeBytes: compressed.blob.size,
      canvas,
      metadata: { sortOrder: hydrated.sortOrder, moodKind: 'image', canvas },
      updatedAt: nowIso(),
    }

    await db.moodItems.put(updated)
    await enqueueSync(projectId, 'mood_items', itemId, 'upsert')
  },

  async remove(projectId: string, itemId: string): Promise<void> {
    assertProjectId(projectId)
    const item = await db.moodItems.get(itemId)
    if (!item || item.projectId !== projectId || item.deletedAt) return

    const updated: MoodItem = {
      ...item,
      updatedAt: nowIso(),
      deletedAt: nowIso(),
    }

    await db.moodItems.put(updated)
    await enqueueSync(projectId, 'mood_items', itemId, 'upsert')

    if (item.storagePath) {
      const others = await db.moodItems
        .where('projectId')
        .equals(projectId)
        .filter((row) => row.id !== itemId && !row.deletedAt && row.storagePath === item.storagePath)
        .count()
      if (others === 0) {
        removeMoodImage(item.storagePath).catch(console.error)
      }
    }
  },
}