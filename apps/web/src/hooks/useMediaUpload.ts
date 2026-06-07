import { useState } from 'react'
import { supabase } from '../lib/supabase'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export interface UseMediaUploadReturn {
  upload: (file: File, bucket: string, path: string) => Promise<{ url: string; path: string }>
  isUploading: boolean
  progress: number
  error: string | null
  reset: () => void
}

export function useMediaUpload(): UseMediaUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File, bucket: string, path: string) => {
    setError(null)
    setProgress(0)

    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
    if (!allowed.includes(file.type)) {
      const err = `Type de fichier non supporté. Acceptés: JPG, PNG, GIF, WEBP, MP4, WEBM`
      setError(err)
      throw new Error(err)
    }

    if (file.size > MAX_SIZE_BYTES) {
      const err = `Fichier trop lourd (max 50MB). Taille: ${(file.size / 1024 / 1024).toFixed(1)}MB`
      setError(err)
      throw new Error(err)
    }

    setIsUploading(true)

    // Simulate progress (Supabase JS SDK doesn't support upload progress natively)
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 85))
    }, 200)

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type })

      clearInterval(progressInterval)

      if (uploadError) {
        setError(uploadError.message)
        throw new Error(uploadError.message)
      }

      setProgress(100)

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      return { url: urlData.publicUrl, path }
    } finally {
      clearInterval(progressInterval)
      setIsUploading(false)
    }
  }

  const reset = () => {
    setIsUploading(false)
    setProgress(0)
    setError(null)
  }

  return { upload, isUploading, progress, error, reset }
}
