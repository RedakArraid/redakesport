import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthInit } from './hooks/useAuth'
export function Root() { useAuthInit(); return <RouterProvider router={router} /> }
