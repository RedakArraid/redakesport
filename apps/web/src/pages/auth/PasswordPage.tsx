import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { request } from '../../lib/api'
import { Btn, Card } from '../../components/ui'
import { useAuthConfig } from '../../hooks/useAuthConfig'
export function PasswordPage() {
  const [params] = useSearchParams(),
    token = params.get('token'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false)
  const authConfig = useAuthConfig(!token)
  return (
    <div style={{ maxWidth: 460, width: '100%', margin: '60px auto', padding: 16 }}>
      <Card>
        <h1>{token ? 'Nouveau mot de passe' : 'Mot de passe oublié'}</h1>
        {done ? (
          <>
            <p role="status">{message}</p>
            <Link to="/login">Se connecter</Link>
          </>
        ) : !token && authConfig.isPending ? (
          <p role="status">Chargement des options de récupération…</p>
        ) : !token && authConfig.isError ? (
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
        ) : !token && !authConfig.data?.passwordResetEnabled ? (
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
                token ? '/auth/reset-password' : '/auth/forgot-password',
                token ? { token, password } : { email },
              )
              setBusy(false)
              if (result.error) {
                setMessage(result.error.message)
                return
              }
              setMessage(
                token
                  ? 'Mot de passe modifié. Connecte-toi à nouveau.'
                  : 'Si ce compte existe, un lien a été envoyé.',
              )
              setDone(true)
            }}
          >
            {token ? (
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
            )}
            {message && <p role="alert">{message}</p>}
            <Btn type="submit" loading={busy}>
              {token ? 'Enregistrer' : 'Envoyer le lien'}
            </Btn>
          </form>
        )}
      </Card>
    </div>
  )
}
