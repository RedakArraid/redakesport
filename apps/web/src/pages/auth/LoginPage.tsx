import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signInWithEmail, signInWithDiscord } from '../../hooks/useAuth'
import { Btn } from '../../components/ui'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const { error: err } = await signInWithEmail(data.email, data.password)
    if (err) { setError(err.message); return }
    navigate(typeof location.state?.from === 'string' && location.state.from.startsWith('/app/') ? location.state.from : '/app/dashboard')
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

        <Btn onClick={async () => { const { error } = await signInWithDiscord(); if (error) setError(error.message) }} variant="secondary" size="lg" style={{ width: '100%', marginBottom: 20, gap: 10 }}>
          <span>🎮</span> Continuer avec Discord
        </Btn>

        <div style={dividerStyle}><span>ou</span></div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input id="email" autoComplete="email" {...register('email')} type="email" placeholder="ton@email.com" style={inputStyle} />
            {errors.email && <span style={errStyle}>{errors.email.message}</span>}
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>Mot de passe</label>
            <input id="password" autoComplete="current-password" {...register('password')} type="password" placeholder="••••••••" style={inputStyle} />
            {errors.password && <span style={errStyle}>{errors.password.message}</span>}
          </div>

          {error && <div style={{ background: '#fee', color: 'var(--accent)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{error}</div>}

          <Btn type="submit" loading={isSubmitting} size="lg" style={{ width: '100%', marginTop: 4 }}>
            Se connecter
          </Btn>
        </form>
        <p><Link to="/forgot-password">Mot de passe oublié ?</Link></p>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color: 'var(--ink)', fontWeight: 700 }}>S'inscrire</Link>
        </p>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '60px 16px', flex: 1,
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
