import { request } from './api'
export async function invokeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await request<T>(`/functions/${name}`, body)
  if (error) throw error
  return data as T
}
