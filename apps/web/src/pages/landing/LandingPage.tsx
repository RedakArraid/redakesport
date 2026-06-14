import React from 'react'
import { Link } from 'react-router-dom'
import { Btn } from '../../components/ui'

export function LandingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--bg)', flex: 1 }}>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 24px 60px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px',
          background: 'var(--ink)', color: '#fff', borderRadius: 999,
          fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
          letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          Beta gratuite · 247 tournois live
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(36px, 7vw, 72px)',
          letterSpacing: -3, lineHeight: 1, margin: '0 0 20px', color: 'var(--ink)',
        }}>
          Le système d'exploitation<br />
          <span style={{ color: 'var(--accent)' }}>de l'esport</span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--muted)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Un seul terrain pour tous — joueurs, capitaines, organisateurs. Tournois, clubs, scores, matchmaking, broadcast.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register"><Btn size="lg">Commencer gratuitement →</Btn></Link>
          <Link to="/login"><Btn size="lg" variant="secondary">Voir une démo</Btn></Link>
        </div>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 52, flexWrap: 'wrap' }}>
          {[
            { value: '2 400+', label: 'Clubs' },
            { value: '247', label: 'Tournois live' },
            { value: '18k+', label: 'Joueurs' },
            { value: '50k€', label: 'Prize pools' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>Fonctionnalités</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, letterSpacing: -1, margin: 0 }}>Tout ce dont tu as besoin</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px',
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 roles */}
      <section style={{ padding: '60px 24px', background: 'var(--ink)', color: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, letterSpacing: -1, marginBottom: 8 }}>Pour chaque acteur de la scène</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 40 }}>Une seule plateforme, trois expériences</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { icon: '🎮', role: 'Joueur', perks: ['Participer aux tournois', 'Matchmaking ELO ranked', 'Stats et historique', 'Rejoindre un club'] },
              { icon: '🛡', role: 'Capitaine', perks: ['Gérer ton club', 'Recruter des joueurs', 'Hub streaming d\'équipe', 'Inscrire ton club en tournoi'] },
              { icon: '🏆', role: 'Organisateur', perks: ['Créer des tournois', 'Générer des brackets', 'Valider les scores', 'Broadcast & overlays'] },
            ].map((r) => (
              <div key={r.role} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{r.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, marginBottom: 12 }}>{r.role}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {r.perks.map((p) => (
                    <li key={p} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, letterSpacing: -1.5, marginBottom: 16 }}>
          Prêt à dominer la scène ?
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 28 }}>Gratuit pendant la bêta. Aucune carte requise.</p>
        <Link to="/register"><Btn size="lg">Créer mon compte →</Btn></Link>
      </section>

    </div>
  )
}

const FEATURES = [
  { icon: '⚡', title: 'Brackets automatiques', desc: 'Génère single elim, double elim ou round robin en un clic. Bracket mis à jour en temps réel.' },
  { icon: '✔', title: 'Validation de scores', desc: 'Les deux équipes soumettent leur score. En cas de désaccord, litige automatique avec l\'organisateur.' },
  { icon: '⚔', title: 'Matchmaking ELO', desc: 'File d\'attente classée avec appairage ±200 ELO par région et par jeu.' },
  { icon: '🛡', title: 'Gestion de club', desc: 'Roster, candidatures, hub streaming, Pro Clubs League. Tout pour gérer ton équipe.' },
  { icon: '📡', title: 'Broadcast Studio', desc: 'Overlays OBS, VOD library, outils casters, prédictions. Stream comme un pro.' },
  { icon: '🔗', title: 'Intégrations', desc: 'Discord bot, webhooks, sync Google Calendar, API REST. Connecte ton écosystème.' },
]
