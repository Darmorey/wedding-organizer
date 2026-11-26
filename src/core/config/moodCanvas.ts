import type { MoodCanvasLayout, MoodItem, MoodKind, MoodTextStyle } from '../types/entity'

export function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function readCanvasLayout(metadata: Record<string, unknown> | undefined, index = 0): MoodCanvasLayout {
  const raw = metadata?.canvas
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const canvas = raw as Record<string, unknown>
    return {
      x: readNumber(canvas.x, 48 + index * 16),
      y: readNumber(canvas.y, 48 + index * 16),
      width: readNumber(canvas.width, 168),
      height: readNumber(canvas.height, 200),
      z: readNumber(canvas.z, index),
      rotation: readNumber(canvas.rotation, 0),
      imageOffsetX: readNumber(canvas.imageOffsetX, 0.5),
      imageOffsetY: readNumber(canvas.imageOffsetY, 0.5),
      imageZoom: readNumber(canvas.imageZoom, 1),
      mediaWidth: readNumber(canvas.mediaWidth, 0),
      mediaHeight: readNumber(canvas.mediaHeight, 0),
    }
  }

  return {
    x: 48 + (index % 5) * 18,
    y: 48 + (index % 5) * 18,
    width: 168,
    height: 200,
    z: index,
    rotation: 0,
    imageOffsetX: 0.5,
    imageOffsetY: 0.5,
    imageZoom: 1,
    mediaWidth: 0,
    mediaHeight: 0,
  }
}

export function nextCanvasLayout(existing: MoodItem[], kind: MoodKind): MoodCanvasLayout {
  const z = existing.reduce((max, item) => Math.max(max, item.canvas?.z ?? 0), 0) + 1
  const n = existing.length
  const jitter = (n % 5) * 14
  if (kind === 'note') {
    return {
      x: 72 + jitter,
      y: 88 + jitter * 0.6,
      width: 128,
      height: 32,
      z,
      rotation: 0,
      imageOffsetX: 0.5,
      imageOffsetY: 0.5,
      imageZoom: 1,
      mediaWidth: 0,
      mediaHeight: 0,
    }
  }
  return {
    x: 40 + jitter,
    y: 40 + jitter * 0.8,
    width: kind === 'link' ? 240 : 168,
    height: kind === 'link' ? 36 : 210,
    z,
    rotation: 0,
    imageOffsetX: 0.5,
    imageOffsetY: 0.5,
    imageZoom: 1,
    mediaWidth: 0,
    mediaHeight: 0,
  }
}

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'
export type ResizeHandle = ResizeCorner | 'n' | 'e' | 's' | 'w'

const MIN_FRAME = 72
const MIN_NOTE_FRAME = 16

export function minFrameSize(kind: MoodKind): number {
  return kind === 'note' ? MIN_NOTE_FRAME : MIN_FRAME
}

export function toLocalDelta(layout: MoodCanvasLayout, boardDx: number, boardDy: number) {
  const rad = ((layout.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: boardDx * cos + boardDy * sin,
    y: -boardDx * sin + boardDy * cos,
  }
}

export function resizeFromCorner(
  layout: MoodCanvasLayout,
  handle: ResizeHandle,
  boardDx: number,
  boardDy: number,
  minSize = MIN_FRAME,
): MoodCanvasLayout {
  const delta = toLocalDelta(layout, boardDx, boardDy)
  const right = layout.x + layout.width
  const bottom = layout.y + layout.height
  let { x, y, width, height } = layout
  const east = handle === 'e' || handle === 'ne' || handle === 'se'
  const west = handle === 'w' || handle === 'nw' || handle === 'sw'
  const south = handle === 's' || handle === 'se' || handle === 'sw'
  const north = handle === 'n' || handle === 'ne' || handle === 'nw'

  if (east) width = Math.max(minSize, width + delta.x)
  if (west) {
    width = Math.max(minSize, width - delta.x)
    x = right - width
  }
  if (south) height = Math.max(minSize, height + delta.y)
  if (north) {
    height = Math.max(minSize, height - delta.y)
    y = bottom - height
  }

  return { ...layout, x, y, width, height }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function imageDrawRect(layout: MoodCanvasLayout) {
  const mediaW = layout.mediaWidth > 0 ? layout.mediaWidth : layout.width
  const mediaH = layout.mediaHeight > 0 ? layout.mediaHeight : layout.height
  const zoom = Math.max(1, layout.imageZoom || 1)
  const cover = Math.max(layout.width / mediaW, layout.height / mediaH) * zoom
  const drawW = mediaW * cover
  const drawH = mediaH * cover
  const maxX = Math.max(0, drawW - layout.width)
  const maxY = Math.max(0, drawH - layout.height)
  const offsetX = clamp01(layout.imageOffsetX ?? 0.5)
  const offsetY = clamp01(layout.imageOffsetY ?? 0.5)
  return {
    drawW,
    drawH,
    maxX,
    maxY,
    left: -offsetX * maxX,
    top: -offsetY * maxY,
  }
}

export function panImageInsideFrame(
  layout: MoodCanvasLayout,
  boardDx: number,
  boardDy: number,
): MoodCanvasLayout {
  const rad = ((layout.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const localDx = boardDx * cos + boardDy * sin
  const localDy = -boardDx * sin + boardDy * cos
  const { maxX, maxY } = imageDrawRect(layout)
  return {
    ...layout,
    imageOffsetX: clamp01((layout.imageOffsetX ?? 0.5) - (maxX > 0 ? localDx / maxX : 0)),
    imageOffsetY: clamp01((layout.imageOffsetY ?? 0.5) - (maxY > 0 ? localDy / maxY : 0)),
  }
}

export function resetImageCrop(layout: MoodCanvasLayout): MoodCanvasLayout {
  return {
    ...layout,
    imageOffsetX: 0.5,
    imageOffsetY: 0.5,
    imageZoom: 1,
  }
}

export function hydrateMoodItem(item: MoodItem, index = 0): MoodItem {
  const moodKind = item.metadata?.moodKind
  const kind: MoodKind =
    item.kind === 'image'
      ? 'image'
      : item.kind === 'note' || moodKind === 'note'
        ? 'note'
        : 'link'

  const source =
    item.metadata && 'canvas' in item.metadata ? item.metadata.canvas : item.canvas

  return {
    ...item,
    kind,
    canvas: readCanvasLayout({ canvas: source }, index),
    textStyle: readTextStyle(item.metadata, item.textStyle),
  }
}

export function defaultTextStyle(): MoodTextStyle {
  return {
    size: 'm',
    bold: false,
    italic: false,
    underline: false,
    align: 'center',
    list: false,
    color: '#2a2a2e',
    background: '#ffffff',
  }
}

function readHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, r, g, b] = value
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return fallback
}

export function readTextStyle(
  metadata: Record<string, unknown> | undefined,
  fallback?: MoodTextStyle,
): MoodTextStyle {
  const raw = metadata?.textStyle
  const base = { ...defaultTextStyle(), ...(fallback ?? {}) }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const style = raw as Record<string, unknown>
  return {
    size: style.size === 's' || style.size === 'l' ? style.size : 'm',
    bold: Boolean(style.bold),
    italic: Boolean(style.italic),
    underline: Boolean(style.underline),
    align: style.align === 'left' || style.align === 'right' ? style.align : 'center',
    list: Boolean(style.list),
    color: readHexColor(style.color, base.color),
    background:
      style.background === 'transparent' ? 'transparent' : readHexColor(style.background, base.background),
  }
}

export function withCanvasMetadata(item: MoodItem): Record<string, unknown> {
  return {
    ...(item.metadata ?? {}),
    sortOrder: item.sortOrder,
    moodKind: item.kind,
    canvas: item.canvas,
    textStyle: item.textStyle ?? defaultTextStyle(),
  }
}
