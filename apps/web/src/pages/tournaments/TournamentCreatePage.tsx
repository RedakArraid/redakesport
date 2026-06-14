import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { Btn, Card } from '../../components/ui'
import type { TournamentFormat } from '../../types/database'

const schema = z.object({
  name: z.string().min(3, 'Nom requis (min 3 caractères)'),
  game_id: z.string().uuid('Sélectionne un jeu').optional(),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'swiss', 'hybrid']),
  max_teams: z.number().min(2).max(256).optional(),
  team_size: z.number().min(1).max(11).default(5),
  region: z.string().optional(),
  start_date: z.string().optional(),
  registration_deadline: z.string().optional(),
  prize_total: z.number().min(0).optional(),
  rules: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const FORMAT_OPTIONS: { value: TournamentFormat; label: string }[] = [
  { value: 'single_elimination', label: 'Élimination simple' },
  { value: 'double_elimination', label: 'Double élimination' },
  { value: 'round_robin', label: 'Round Robin (poules)' },
  { value: 'swiss', label: 'Système Suisse' },
  { value: 'hybrid', label: 'Hybride (poules + bracket)' },
]

export function TournamentCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()

  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data } = await supabase.from('games').select('id, name').eq('is_active', true).order('name')
      return data ?? []
    },
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { format: 'single_elimination', team_size: 5 },
  })

  const onSubmit = async (data: FormData) => {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
    const { data: t, error } = await supabase.from('tournaments').insert({
      name: data.name,
      slug,
      format: data.format,
      game_id: data.game_id || null,
      max_teams: data.max_teams ?? null,
      team_size: data.team_size,
      region: data.region || null,
      start_date: data.start_date || null,
      registration_deadline: data.registration_deadline || null,
      prize_pool: data.prize_total ? { total: data.prize_total, currency: 'EUR', distribution: [] } : null,
      rules: data.rules || null,
      organizer_id: user!.id,
      status: 'draft',
      is_public: true,
    }).select().single()

    if (error) { addToast('error', error.message); return }
    addToast('success', 'Tournoi créé avec succès !')
    navigate(`/app/tournaments/${t.id}`)
  }

  return (
    <div className="screen-enter" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>Créer un tournoi</div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Configure tous les paramètres de ton tournoi</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Informations générales</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nom du tournoi *" error={errors.name?.message}>
              <input {...register('name')} placeholder="Redak Cup 2026" style={inputStyle} />
            </Field>
            <Field label="Jeu" error={errors.game_id?.message}>
              <select {...register('game_id')} style={inputStyle}>
                <option value="">-- Sélectionner un jeu --</option>
                {games?.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Format *" error={errors.format?.message}>
              <select {...register('format')} style={inputStyle}>
                {FORMAT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Nombre d'équipes max" error={errors.max_teams?.message}>
                <input {...register('max_teams', { valueAsNumber: true })} type="number" min={2} max={256} placeholder="16" style={inputStyle} />
              </Field>
              <Field label="Taille des équipes" error={errors.team_size?.message}>
                <input {...register('team_size', { valueAsNumber: true })} type="number" min={1} max={11} placeholder="5" style={inputStyle} />
              </Field>
            </div>
            <Field label="Région" error={errors.region?.message}>
              <input {...register('region')} placeholder="France, Europe, Global..." style={inputStyle} />
            </Field>
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Dates</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Date de début" error={errors.start_date?.message}>
              <input {...register('start_date')} type="datetime-local" style={inputStyle} />
            </Field>
            <Field label="Fin des inscriptions" error={errors.registration_deadline?.message}>
              <input {...register('registration_deadline')} type="datetime-local" style={inputStyle} />
            </Field>
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Prize Pool</div>
          <Field label="Montant total (€)" error={errors.prize_total?.message}>
            <input {...register('prize_total', { valueAsNumber: true })} type="number" min={0} placeholder="50000" style={inputStyle} />
          </Field>
        </Card>

        <Card>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Règlement</div>
          <Field label="Règles du tournoi" error={errors.rules?.message}>
            <textarea {...register('rules')} placeholder="Décris les règles, format des matchs, anti-cheat..." style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
          </Field>
        </Card>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Btn type="button" variant="secondary" onClick={() => navigate(-1)}>Annuler</Btn>
          <Btn type="submit" loading={isSubmitting}>Créer le tournoi</Btn>
        </div>
      </form>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, display: 'block' }}>{error}</span>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--border)', background: 'var(--bg)',
  fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
}
