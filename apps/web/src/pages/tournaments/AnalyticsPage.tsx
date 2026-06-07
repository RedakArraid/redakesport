import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Card, SectionTitle, Spinner, StatTile } from '../../components/ui'
import type { Match, Tournament } from '../../types/database'

interface MatchStats {
  total: number
  completed: number
  live: number
  disputed: number
  pending: number
  avgScore1: number
  avgScore2: number
}

function computeStats(matches: Match[]): MatchStats {
  const completed = matches.filter((m) => m.status === 'completed')
  return {
    total: matches.length,
    completed: completed.length,
    live: matches.filter((m) => m.status === 'live').length,
    disputed: matches.filter((m) => m.status === 'disputed').length,
    pending: matches.filter((m) => m.status === 'pending').length,
    avgScore1: completed.length ? +(completed.reduce((s, m) => s + m.score_team1, 0) / completed.length).toFixed(1) : 0,
    avgScore2: completed.length ? +(completed.reduce((s, m) => s + m.score_team2, 0) / completed.length).toFixed(1) : 0,
  }
}

export function AnalyticsPage() {
  const { id: tournamentId } = useParams<{ id: string }>()

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tournaments').select('*').eq('id', tournamentId!).single()
      if (error) throw error
      return data as Tournament
    },
    enabled: !!tournamentId,
  })

  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('matches').select('*').eq('tournament_id', tournamentId!)
      if (error) throw error
      return data as Match[]
    },
    enabled: !!tournamentId,
  })

  const { data: registrations } = useQuery({
    queryKey: ['registrations', tournamentId],
    queryFn: async () => {
      const { data } = await supabase.from('tournament_registrations').select('*').eq('tournament_id', tournamentId!)
      return data ?? []
    },
    enabled: !!tournamentId,
  })

  const { data: eloHistory } = useQuery({
    queryKey: ['elo-changes', tournamentId],
    queryFn: async () => {
      if (!matches || matches.length === 0) return []
      const matchIds = matches.map((m) => m.id)
      const { data } = await supabase.from('elo_history').select('*').in('match_id', matchIds).order('recorded_at')
      return data ?? []
    },
    enabled: !!matches,
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>

  const stats = matches ? computeStats(matches) : null
  const completionRate = stats ? Math.round((stats.completed / Math.max(stats.total, 1)) * 100) : 0
  const approvedTeams = registrations?.filter((r) => r.status === 'approved').length ?? 0

  return (
    <div className="screen-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>
            Analytics — {tournament?.name}
          </div>
          <Link to={`/app/tournaments/${tournamentId}`} style={{ fontSize: 13, color: 'var(--muted)' }}>← Retour au tournoi</Link>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Équipes', value: approvedTeams, icon: '👥' },
          { label: 'Matchs total', value: stats?.total ?? 0, icon: '🎮' },
          { label: 'Terminés', value: stats?.completed ?? 0, icon: '✅' },
          { label: 'En direct', value: stats?.live ?? 0, icon: '📡' },
          { label: 'Litiges', value: stats?.disputed ?? 0, icon: '⚠️' },
          { label: 'Avancement', value: `${completionRate}%`, icon: '📊' },
        ].map((s) => (
          <Card key={s.label} style={{ padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <Card style={{ marginBottom: 20, padding: '16px 20px' }}>
        <SectionTitle>Avancement du tournoi</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 10, background: 'var(--mute-bg)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${completionRate}%`, background: 'var(--ink)', borderRadius: 999, transition: 'width 0.5s ease' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, minWidth: 36 }}>{completionRate}%</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          <span>✅ {stats?.completed} terminés</span>
          <span>⏳ {stats?.pending} en attente</span>
          {(stats?.disputed ?? 0) > 0 && <span style={{ color: 'var(--accent)' }}>⚠️ {stats?.disputed} litige(s)</span>}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Score moyen */}
        <Card style={{ padding: '20px' }}>
          <SectionTitle>Scores moyens</SectionTitle>
          {stats?.completed === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Aucun match terminé</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '12px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, letterSpacing: -1 }}>{stats?.avgScore1}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Équipe 1</div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 20, fontWeight: 300 }}>—</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, letterSpacing: -1 }}>{stats?.avgScore2}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Équipe 2</div>
              </div>
            </div>
          )}
        </Card>

        {/* ELO changes */}
        <Card style={{ padding: '20px' }}>
          <SectionTitle>Mouvements ELO</SectionTitle>
          {!eloHistory || eloHistory.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Aucun mouvement ELO</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
              {eloHistory.slice(0, 10).map((h) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{h.old_rating} → {h.new_rating}</span>
                  <span style={{ fontWeight: 800, color: h.delta > 0 ? '#1a7a4a' : 'var(--accent)' }}>{h.delta > 0 ? '+' : ''}{h.delta}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Rounds breakdown */}
      {matches && matches.length > 0 && (
        <Card style={{ marginTop: 16, padding: '20px' }}>
          <SectionTitle>Répartition par round</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(
              matches.reduce((acc, m) => {
                const r = `Round ${m.round ?? 1}`
                if (!acc[r]) acc[r] = { total: 0, completed: 0 }
                acc[r].total++
                if (m.status === 'completed') acc[r].completed++
                return acc
              }, {} as Record<string, { total: number; completed: number }>)
            ).map(([round, data]) => (
              <div key={round} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 80, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{round}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--mute-bg)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((data.completed / data.total) * 100)}%`, background: 'var(--ink)', borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', minWidth: 50 }}>
                  {data.completed}/{data.total}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
