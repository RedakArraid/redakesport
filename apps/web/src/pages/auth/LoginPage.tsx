import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signInWithEmail, signInWithDiscord } from '../../hooks/useAuth'
import { Btn } from '../../components/ui'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const { error: err } = await signInWithEmail(data.email, data.password)
    if (err) { setError(err.message); return }
    navigate('/dashboard')
  }

  return (
    <div style={pageStyle}>
      <div style={boxStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, letterSpacing: -0.5, marginBottom: 6 }}>
            <span style={{ color: 'var(--accent)' }}>Redak</span> Esport
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Connecte-toi à ton compte</div>
        </div>

        <Btn onClick={signInWithDiscord} variant="secondary" size="lg" style={{ width: '100%', marginBottom: 20, gap: 10 }}>
          <span>🎮</span> Continuer avec Discord
        </Btn>

        <div style={dividerStyle}><span>ou</span></div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input {...register('email')} type="email" placeholder="ton@email.com" style={inputStyle} />
            {errors.email && <span style={errStyle}>{errors.email.message}</span>}
          </div>
          <div>
            <label style={labelStyle}>Mot de passe</label>
            <input {...register('password')} type="password" placeholder="••••••••" style={inputStyle} />
            {errors.password && <span style={errStyle}>{errors.password.message}</span>}
          </div>

          {error && <div style={{ background: '#fee', color: 'var(--accent)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{error}</div>}

          <Btn type="submit" loading={isSubmitting} size="lg" style={{ width: '100%', marginTop: 4 }}>
            Se connecter
          </Btn>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color: 'var(--ink)', fontWeight: 700 }}>S'inscrire</Link>
        </p>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--bg)', padding: 16,
}
const boxStyle: React.CSSProperties = {
  background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)',
  padding: '36px 32px', width: '100%', maxWidth: 420,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)',
  marginBottom: 6, letterSpacing: 0.3,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--border)', background: 'var(--bg)',
  fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
  boxSizing: 'border-box',
}
const errStyle: React.CSSProperties = { fontSize: 12, color: 'var(--accent)', marginTop: 4, display: 'block' }
const dividerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  color: 'var(--muted)', fontSize: 12, marginBottom: 20,
  textAlign: 'center',
}
