import { useState } from 'react'
import { request } from '../lib/api'
export function useMediaUpload() {
  const [isUploading, setUploading] = useState(false),
    [error, setError] = useState<string | null>(null),
    [progress, setProgress] = useState(0)
  const upload = async (file: File, bucket: string, path: string) => {
    setError(null)
    setUploading(true)
    setProgress(0)
    try {
      const form = new FormData()
      form.append('file', file)
      const result = await request<{ url: string; path: string }>(
        `/files/${bucket}?path=${encodeURIComponent(path)}`,
        form,
      )
      if (result.error || !result.data) throw result.error || new Error('Upload impossible')
      setProgress(100)
      return result.data
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload impossible'
      setError(message)
      throw e
    } finally {
      setUploading(false)
    }
  }
  return {
    upload,
    isUploading,
    progress,
    error,
    reset: () => {
      setError(null)
      setProgress(0)
    },
  }
}
