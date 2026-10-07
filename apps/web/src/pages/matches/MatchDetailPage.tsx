import { matchStatusLabels } from '../../lib/labels'
import React, { useState } from 'react'
import { MatchManagement } from './MatchManagement'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../../lib/api'
import { useRealtimeChannel } from '../../hooks/useRealtime'
import { Card, SectionTitle, Spinner } from '../../components/ui'
import type { Match, MatchEvent } from '../../types/database'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Tab = 'summary' | 'events' | 'stats'

export function MatchDetailPage() {
  const { id: matchId } = useParams<{ id: string }>()
  const base = useLocation().pathname.startsWith('/app') ? '/app' : ''
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('summary')

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const { data, error } = await db
        .from('matches')
        .select('*, tournaments(status)')
        .eq('id', matchId!)
        .single()
      if (error) throw error
      return data as Match & { tournaments: { status: string } | null }
    },
    enabled: !!matchId,
    refetchInterval: 5000,
  })

  const { data: events } = useQuery({
    queryKey: ['match-events', matchId],
    queryFn: async () => {
      const { data, error } = await db
        .from('match_events')
        .select('*')
        .eq('match_id', matchId!)
        .order('occurred_at', { ascending: false })
      if (error) throw error
      return data as MatchEvent[]
    },
    enabled: !!matchId,
  })

  // Realtime: live score + events
  useRealtimeChannel(`match:${matchId}`, {
    table: 'matches',
    filter: `id=eq.${matchId}`,
    onUpdate: () => qc.invalidateQueries({ queryKey: ['match', matchId] }),
  })
  useRealtimeChannel(`match-events:${matchId}`, {
    table: 'match_events',
    filter: `match_id=eq.${matchId}`,
    onInsert: () => qc.invalidateQueries({ queryKey: ['match-events', matchId] }),
  })

  const { data: team1Name } = useTeamName(match?.team1_id)
  const { data: team2Name } = useTeamName(match?.team2_id)

  if (isLoading)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={32} />
      </div>
    )
  if (!match) return <div>Match introuvable</div>

  const cancelled = match.tournaments?.status === 'cancelled'
  const isLive = !cancelled && match.status === 'live'
  const isDone = match.status === 'completed'
  const hasScore = (isDone || isLive) && !!match.team1_id && !!match.team2_id
  const statusLabel =
    cancelled && !isDone
      ? 'Rencontre non jouée (tournoi annulé)'
      : match.result_kind === 'forfeit'
        ? 'Victoire par forfait'
        : isDone && (!match.team1_id || !match.team2_id)
          ? match.winner_id
            ? 'Qualification par exemption'
            : 'Rencontre non jouée'
          : match.bracket_position?.side === 'reset' && !match.team1_id
            ? 'Finale décisive si nécessaire'
            : matchStatusLabels[match.status]

  return (
    <div className="screen-enter">
      {match.tournament_id && (
        <p style={{ marginTop: 0 }}>
          <Link to={`${base}/tournaments/${match.tournament_id}/bracket`}>
            ← Tableau des rencontres
          </Link>
        </p>
      )}
      {/* Score hero */}
      <div
        style={{
          background: 'var(--ink)',
          color: '#fff',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        {isLive && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 12px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.5,
              marginBottom: 20,
              animation: 'pulse 1.5s infinite',
            }}
          >
            ● LIVE
          </div>
        )}
        {!isLive && (
          <div
            style={{
              opacity: 0.5,
              fontSize: 12,
              marginBottom: 16,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {statusLabel}
          </div>
        )}

        <div className="match-scoreboard">
          {/* Team 1 */}
          <div className="match-team match-team-first">
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 20,
                color: match.winner_id && match.winner_id === match.team1_id ? '#4ade80' : '#fff',
              }}
            >
              {team1Name ?? (match.team1_id ? 'Chargement…' : isDone ? 'Exempt' : 'À déterminer')}
            </div>
          </div>

          {/* Score */}
          <div className="match-score">
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 52,
                letterSpacing: -2,
              }}
            >
              {hasScore ? match.score_team1 : '–'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 300,
                fontSize: 32,
                opacity: 0.4,
              }}
            >
              —
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 52,
                letterSpacing: -2,
              }}
            >
              {hasScore ? match.score_team2 : '–'}
            </span>
          </div>

          {/* Team 2 */}
          <div className="match-team match-team-second">
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 20,
                color: match.winner_id && match.winner_id === match.team2_id ? '#4ade80' : '#fff',
              }}
            >
              {team2Name ?? (match.team2_id ? 'Chargement…' : isDone ? 'Exempt' : 'À déterminer')}
            </div>
          </div>
        </div>

        {match.best_of > 1 && (
          <div
            style={{ marginTop: 12, opacity: 0.5, fontSize: 12, fontFamily: 'var(--font-mono)' }}
          >
            BO{match.best_of}
            {match.scheduled_at && !cancelled
              ? ` · ${format(new Date(match.scheduled_at), 'd MMM HH:mm', { locale: fr })}`
              : ''}
          </div>
        )}
      </div>

      {match.result_kind === 'forfeit' && (
        <Card style={{ marginBottom: 20 }}>
          <strong>Victoire par forfait</strong>
          <p>{match.forfeit_reason}</p>
          <small>Score administratif. Aucun changement d’ELO.</small>
        </Card>
      )}
      <MatchManagement match={match} />
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['summary', 'events', 'stats'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`topnav-item${tab === t ? ' active' : ''}`}
          >
            {t === 'summary' ? '📋 Résumé' : t === 'events' ? '⚡ Événements' : '📊 Stats'}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <SectionTitle>Détails du match</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
              <Row label="Format" value={`BO${match.best_of}`} />
              <Row label="Statut" value={statusLabel} />
              {match.scheduled_at && (
                <Row
                  label={cancelled && !isDone ? 'Initialement programmé' : 'Programmé'}
                  value={format(new Date(match.scheduled_at), 'd MMMM yyyy à HH:mm', {
                    locale: fr,
                  })}
                />
              )}
              {match.completed_at && (
                <Row
                  label="Terminé"
                  value={format(new Date(match.completed_at), 'd MMMM yyyy à HH:mm', {
                    locale: fr,
                  })}
                />
              )}
              {match.vod_url && (
                <Row
                  label="VOD"
                  value={
                    <a
                      href={match.vod_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--blue)', fontWeight: 700 }}
                    >
                      Voir le replay →
                    </a>
                  }
                />
              )}
            </div>
          </Card>
          {!!match.notes && (
            <Card>
              <SectionTitle>Notes</SectionTitle>
              <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
                {match.notes}
              </div>
            </Card>
          )}
          {match.tournament_id && (
            <div style={{ textAlign: 'right' }}>
              <Link
                to={`${base}/tournaments/${match.tournament_id}/bracket`}
                style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 700 }}
              >
                Voir le tableau →
              </Link>
            </div>
          )}
        </div>
      )}

      {tab === 'events' && (
        <div>
          {!events || events.length === 0 ? (
            <Card style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
              {isLive ? "En attente d'événements..." : 'Aucun événement enregistré'}
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map((ev) => (
                <Card
                  key={ev.id}
                  style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}
                >
                  <span style={{ fontSize: 18 }}>{EVENT_ICONS[ev.event_type] ?? '•'}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 13 }}
                    >
                      {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                    </div>
                    {!!ev.data?.description && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {String(ev.data.description)}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {format(new Date(ev.occurred_at), 'HH:mm:ss')}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <Card style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <h2>Statistiques du match</h2>
          <p>
            Score : {hasScore ? match.score_team1 : '–'} — {hasScore ? match.score_team2 : '–'}
          </p>
          <p>Événements enregistrés : {events?.length ?? 0}</p>
          <p>
            {match.started_at && match.completed_at
              ? `Durée : ${Math.max(0, Math.round((new Date(match.completed_at).getTime() - new Date(match.started_at).getTime()) / 60000))} min`
              : 'Durée non renseignée'}
          </p>
          {match.map_pool?.map((map, index) => (
            <p key={index}>
              {map.map} : {map.score1} — {map.score2}
            </p>
          ))}
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        gap: 12,
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 13 }}>
        {value}
      </span>
    </div>
  )
}

function useTeamName(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['team-name', teamId],
    queryFn: async () => {
      if (!teamId) return null
      const { data } = await db.from('clubs').select('name').eq('id', teamId).maybeSingle()
      if (data) return data.name
      const { data: p } = await db
        .from('profiles')
        .select('username')
        .eq('id', teamId)
        .maybeSingle()
      return p?.username ?? teamId.slice(0, 8)
    },
    enabled: !!teamId,
    staleTime: Infinity,
  })
}

const EVENT_ICONS: Record<string, string> = {
  forfeit: '🏳',
  comment: '💬',
  goal: '⚽',
  kill: '💀',
  round_start: '▶',
  round_end: '⏸',
  timeout: '⏱',
  substitution: '🔄',
  objective: '🎯',
  penalty: '🟨',
  red_card: '🟥',
}
const EVENT_LABELS: Record<string, string> = {
  forfeit: 'Forfait déclaré',
  red_card: 'Carton rouge',
  goal: 'But',
  kill: 'Élimination',
  round_start: 'Début de round',
  round_end: 'Fin de round',
  timeout: 'Pause tactique',
  substitution: 'Remplacement',
  objective: 'Objectif',
  penalty: 'Pénalité',
  comment: 'Commentaire',
}
