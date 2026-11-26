import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_DIMENSION, MAX_UPLOAD_BYTES } from '../../core/config/media'

export function isAllowedImageType(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)
}

export async function compressImage(file: File): Promise<{ blob: Blob; mimeType: string; fileName: string }> {
  if (!isAllowedImageType(file.type)) {
    throw new Error('Можно загрузить JPEG, PNG, WebP или GIF')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Файл больше 10 МБ')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось обработать изображение')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/webp', 0.82)
  })

  if (!blob) throw new Error('Не удалось сжать изображение')
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error('После сжатия файл всё ещё больше 10 МБ')
  }

  return {
    blob,
    mimeType: 'image/webp',
    fileName: file.name.replace(/\.[^.]+$/, '') + '.webp',
  }
}