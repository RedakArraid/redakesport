import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Btn, Card } from '../../components/ui'
import type { Role } from '../../types/database'

const ROLES: { value: Role; label: string; desc: string; icon: string }[] = [
  { value: 'player', label: 'Joueur', desc: 'Participe aux tournois et à la scène compétitive', icon: '🎮' },
  { value: 'captain', label: 'Capitaine', desc: 'Gère ton club, recrute des joueurs, engage tes équipes', icon: '🛡' },
  { value: 'organizer', label: 'Organisateur', desc: 'Crée et administre des tournois officiels', icon: '🏆' },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, setProfile } = useAuthStore()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!selectedRole || !user) return
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('profiles')
      .update({ role: selectedRole, country: country || null })
      .eq('id', user.id)
      .select()
      .single()

    if (err) { setError(err.message); setLoading(false); return }
    setProfile(data)
    navigate('/app/dashboard')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '60px 16px', flex: 1 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, letterSpacing: -1, marginBottom: 8 }}>
            Bienvenue sur <span style={{ color: 'var(--accent)' }}>Redak</span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 15 }}>Quel est ton rôle dans l'esport ?</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {ROLES.map((r) => (
            <Card key={r.value}
              style={{
                cursor: 'pointer', padding: '16px 20px',
                border: selectedRole === r.value ? '2px solid var(--ink)' : '1.5px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'border 0.15s',
              }}
              className=""
              onClick={() => setSelectedRole(r.value)}>
              <span style={{ fontSize: 28 }}>{r.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{r.desc}</div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: '2px solid var(--border)',
                background: selectedRole === r.value ? 'var(--ink)' : 'transparent',
                transition: 'background 0.15s',
              }} />
            </Card>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
            Pays (optionnel)
          </label>
          <input
            value={country} onChange={(e) => setCountry(e.target.value)}
            placeholder="France, Belgique, Maroc..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error && <div style={{ background: '#fee', color: 'var(--accent)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <Btn onClick={handleSubmit} loading={loading} disabled={!selectedRole} size="lg" style={{ width: '100%' }}>
          Commencer →
        </Btn>
      </div>
    </div>
  )
}
