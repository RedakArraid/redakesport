import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../lib/api'
import { Spinner } from '../../components/ui'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app/dashboard')
      else navigate('/login')
    })
  }, [navigate])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Spinner size={32} />
    </div>
  )
}
