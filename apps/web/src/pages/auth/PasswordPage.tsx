import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { request } from '../../lib/api'
import { Btn, Card } from '../../components/ui'
import { useAuthConfig } from '../../hooks/useAuthConfig'
export function PasswordPage() {
  const isReset = useLocation().pathname === '/reset-password'
  const [params] = useSearchParams()
  const token = params.get('token')
  return <PasswordForm key={`${isReset}:${token ?? ''}`} token={token} isReset={isReset} />
}

function PasswordForm({ token, isReset }: { token: string | null; isReset: boolean }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false)
  const hasValidToken = !!token && /^[A-Za-z0-9_-]{30,100}$/.test(token)
  const authConfig = useAuthConfig(!isReset)
  return (
    <div style={{ maxWidth: 460, width: '100%', margin: '60px auto', padding: 16 }}>
      <Card>
        <h1>{isReset ? 'Nouveau mot de passe' : 'Mot de passe oublié'}</h1>
        {isReset && !hasValidToken ? (
          <>
            <p role="alert">Ce lien de réinitialisation est incomplet ou invalide.</p>
            <Link to="/forgot-password">Demander un nouveau lien</Link>
            <p>
              <Link to="/login">Revenir à la connexion</Link>
            </p>
          </>
        ) : done ? (
          <>
            <p role="status">{message}</p>
            <Link to="/login">Se connecter</Link>
          </>
        ) : !isReset && authConfig.isPending ? (
          <p role="status">Chargement des options de récupération…</p>
        ) : !isReset && authConfig.isError ? (
          <>
            <p role="alert">
              Le service de récupération est temporairement inaccessible. Réessaie dans quelques
              instants.
            </p>
            <Btn onClick={() => void authConfig.refetch()}>Réessayer</Btn>
            <p>
              <Link to="/login">Revenir à la connexion</Link>
            </p>
          </>
        ) : !isReset && !authConfig.data?.passwordResetEnabled ? (
          <>
            <p role="status">
              La récupération par email n’est pas disponible. Contacte l’assistance du site.
            </p>
            <Link to="/login">Revenir à la connexion</Link>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setMessage('')
              const result = await request(
                isReset ? '/auth/reset-password' : '/auth/forgot-password',
                isReset ? { token, password } : { email: email.trim() },
              )
              setBusy(false)
              if (result.error) {
                setMessage(result.error.message)
                return
              }
              setMessage(
                isReset
                  ? 'Mot de passe modifié. Connecte-toi à nouveau.'
                  : 'Si ce compte existe, un lien a été envoyé.',
              )
              setDone(true)
            }}
          >
            {isReset ? (
              <label>
                Nouveau mot de passe
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
            ) : (
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
            )}
            {message && <p role="alert">{message}</p>}
            <Btn type="submit" loading={busy}>
              {isReset ? 'Enregistrer' : 'Envoyer le lien'}
            </Btn>
            {isReset && message && (
              <p>
                <Link to="/forgot-password">Demander un nouveau lien</Link>
              </p>
            )}
            <p>
              <Link to="/login">Revenir à la connexion</Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  )
}
