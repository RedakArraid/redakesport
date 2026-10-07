import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUpWithEmail, signInWithDiscord } from '../../hooks/useAuth'
import { useAuthConfig } from '../../hooks/useAuthConfig'
import { Brand } from '../../components/ui/Brand'
import { Btn } from '../../components/ui'

const schema = z.object({
  username: z
    .string()
    .min(3, 'Min 3 caractères')
    .max(20, 'Maximum 20 caractères')
    .regex(/^[a-zA-Z0-9_]+$/, 'Lettres, chiffres, _ uniquement'),
  email: z.string().trim().email('Email invalide').max(254, 'Maximum 254 caractères'),
  password: z.string().min(8, 'Minimum 8 caractères').max(128, 'Maximum 128 caractères'),
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const authConfig = useAuthConfig()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const { data: result, error: err } = await signUpWithEmail(
      data.email,
      data.password,
      data.username,
    )
    if (err) {
      setError(err.message)
      return
    }
    if (!result?.session) {
      setError('La session n’a pas pu être ouverte. Réessaie de te connecter.')
      return
    }
    navigate('/onboarding')
  }

  return (
    <div style={pageStyle}>
      <div style={boxStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}>
            <Brand size="lg" />
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Rejoins la plateforme</div>
        </div>

        {authConfig.data?.discordEnabled && (
          <>
            <Btn
              onClick={async () => {
                const { error } = await signInWithDiscord()
                if (error) setError(error.message)
              }}
              variant="secondary"
              size="lg"
              style={{ width: '100%', marginBottom: 20 }}
            >
              <span>🎮</span> Continuer avec Discord
            </Btn>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--muted)',
                fontSize: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span>ou</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
          </>
        )}

        {authConfig.isError && (
          <p role="status" style={{ fontSize: 13, color: 'var(--muted)' }}>
            Les autres options d’inscription sont temporairement indisponibles.{' '}
            <Btn variant="ghost" size="sm" onClick={() => void authConfig.refetch()}>
              Réessayer
            </Btn>
          </p>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div>
            <label htmlFor="username" style={labelStyle}>
              Pseudo <span style={{ color: '#b42318' }}>*</span>
            </label>
            <input
              id="username"
              autoComplete="username"
              maxLength={20}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? 'username-error' : undefined}
              {...register('username')}
              placeholder="TonPseudo_99"
              style={inputStyle}
            />
            {errors.username && (
              <span id="username-error" role="alert" style={errStyle}>
                {errors.username.message}
              </span>
            )}
          </div>
          <div>
            <label htmlFor="email" style={labelStyle}>
              Email <span style={{ color: '#b42318' }}>*</span>
            </label>
            <input
              id="email"
              autoComplete="email"
              maxLength={254}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
              type="email"
              placeholder="ton@email.com"
              style={inputStyle}
            />
            {errors.email && (
              <span id="email-error" role="alert" style={errStyle}>
                {errors.email.message}
              </span>
            )}
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>
              Mot de passe <span style={{ color: '#b42318' }}>*</span>
            </label>
            <input
              id="password"
              autoComplete="new-password"
              maxLength={128}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
              type="password"
              placeholder="8 caractères minimum"
              style={inputStyle}
            />
            {errors.password && (
              <span id="password-error" role="alert" style={errStyle}>
                {errors.password.message}
              </span>
            )}
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: '#fee',
                color: '#b42318',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <Btn
            type="submit"
            loading={isSubmitting}
            size="lg"
            style={{ width: '100%', marginTop: 4 }}
          >
            Créer mon compte
          </Btn>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: 'var(--ink)', fontWeight: 700 }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 16px',
  flex: 1,
}
const boxStyle: React.CSSProperties = {
  background: 'var(--card)',
  borderRadius: 20,
  border: '1px solid var(--border)',
  padding: '36px 32px',
  width: '100%',
  maxWidth: 420,
}
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'var(--font-display)',
  marginBottom: 6,
  letterSpacing: 0.3,
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--border)',
  background: 'var(--bg)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box',
}
const errStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#b42318',
  marginTop: 4,
  display: 'block',
}
