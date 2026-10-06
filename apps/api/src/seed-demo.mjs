import { fileURLToPath } from 'node:url'
import { pool } from './db.mjs'
import { passwordHash } from './auth.mjs'
import { buildBracket } from './brackets.ts'
import { migrate } from './migrate.mjs'

const marker = 'fc27-demo-v1'
const demoPassword = 'RedakTest!2026'
const hour = 3_600_000
const day = 24 * hour
const playerNames = [
  'Atlas',
  'Nova',
  'Orion',
  'Pixel',
  'Comet',
  'Vega',
  'Tempo',
  'Lynx',
  'Nero',
  'Sora',
  'Echo',
  'Zenith',
  'Flash',
  'Drift',
  'Blaze',
  'Cosmo',
  'Delta',
  'Falcon',
  'Ghost',
  'Halo',
  'Indigo',
  'Jade',
  'Kairo',
  'Lumen',
  'Mistral',
  'Nexus',
  'Onyx',
  'Phantom',
  'Quartz',
  'Raven',
  'Solar',
  'Titan',
  'Ultra',
  'Vortex',
  'Wave',
  'Xeno',
  'Yuki',
  'Zephyr',
  'Aero',
  'Boreal',
  'Cobalt',
  'Dune',
  'Ember',
  'Frost',
  'Glint',
  'Horizon',
  'Ion',
  'Jolt',
]
const clubNames = [
  'Paris Volt',
  'Lyon Phoenix',
  'Marseille Comètes',
  'Lille Titans',
  'Bordeaux Pulse',
  'Nantes Horizon',
  'Strasbourg Nova',
  'Toulouse Éclipse',
]

// Stable slugs make another run additive: existing tournaments are never replayed or reset.
export const demoCompetitions = [
  {
    slug: 'open',
    name: 'Open de la communauté',
    format: 'single_elimination',
    status: 'registration',
    size: 32,
    entrants: 14,
    pending: 2,
  },
  {
    slug: 'clubs-open',
    name: 'Clubs Open',
    format: 'hybrid',
    status: 'registration',
    size: 8,
    entrants: 5,
    pending: 1,
    clubs: true,
  },
  {
    slug: 'cup',
    name: 'Coupe des 32',
    format: 'single_elimination',
    status: 'ongoing',
    size: 32,
    played: 12,
    live: true,
    confirmation: true,
  },
  {
    slug: 'masters',
    name: 'Masters à repêchages',
    format: 'double_elimination',
    status: 'ongoing',
    size: 16,
    played: 10,
    bestOf: 3,
    forfeit: true,
  },
  {
    slug: 'league',
    name: 'Ligue des clubs',
    format: 'round_robin',
    status: 'ongoing',
    size: 8,
    played: 9,
    clubs: true,
    live: true,
  },
  {
    slug: 'swiss',
    name: 'Circuit suisse',
    format: 'swiss',
    status: 'ongoing',
    size: 24,
    played: 16,
    dispute: true,
  },
  {
    slug: 'regions',
    name: 'Coupe des régions',
    format: 'hybrid',
    status: 'ongoing',
    size: 8,
    played: 13,
    clubs: true,
  },
  {
    slug: 'champions',
    name: 'Trophée des champions',
    format: 'single_elimination',
    status: 'completed',
    size: 16,
  },
  {
    slug: 'invitational',
    name: 'Invitational BO5',
    format: 'double_elimination',
    status: 'completed',
    size: 8,
    bestOf: 5,
    reset: true,
  },
  {
    slug: 'club-finals',
    name: 'Finales des clubs',
    format: 'hybrid',
    status: 'completed',
    size: 8,
    clubs: true,
  },
  {
    slug: 'swiss-finals',
    name: 'Suisse des espoirs',
    format: 'swiss',
    status: 'completed',
    size: 17,
  },
  {
    slug: 'league-finals',
    name: 'Ligue de présaison',
    format: 'round_robin',
    status: 'completed',
    size: 8,
    clubs: true,
  },
  {
    slug: 'winter',
    name: 'Projet Winter Cup',
    format: 'single_elimination',
    status: 'draft',
    size: 32,
  },
  {
    slug: 'cancelled',
    name: 'Coupe reportée',
    format: 'single_elimination',
    status: 'cancelled',
    size: 8,
    played: 2,
  },
]

export async function seedDemo() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Les comptes de démonstration sont réservés au développement local.')
  const db = await pool.connect()
  const created = { accounts: 0, clubs: 0, competitions: 0 }
  try {
    await db.query('BEGIN')
    await db.query('SELECT pg_advisory_xact_lock(742027)')
    const now = new Date((await db.query('SELECT now() AS now')).rows[0].now).getTime()
    const game = (await db.query("SELECT id FROM games WHERE slug='ea-fc-27' AND is_active"))
      .rows[0]
    if (!game) throw new Error('Appliquer les migrations avant de créer la démonstration.')

    async function asUser(id, sql, params = []) {
      await db.query("SELECT set_config('app.user_id',$1,true)", [id])
      await db.query('SET LOCAL ROLE authenticated')
      const result = await db.query(sql, params)
      await db.query('RESET ROLE')
      await db.query("SELECT set_config('app.user_id','',true)")
      return result
    }

    async function account(role, index, prefix, displayName) {
      const suffix = index === 0 ? '' : String(index + 1).padStart(2, '0')
      const email = `${prefix}${suffix}@example.test`
      const username = `Demo_${prefix[0].toUpperCase() + prefix.slice(1)}${suffix}`
      const existing = (
        await db.query(
          'SELECT u.id,p.username,p.role,p.onboarding_completed FROM auth.users u JOIN profiles p ON p.id=u.id WHERE u.email=$1',
          [email],
        )
      ).rows[0]
      if (existing) {
        if (
          existing.username !== username ||
          existing.role !== role ||
          !existing.onboarding_completed
        )
          throw new Error(`Le compte ${email} existe avec un autre profil ; il reste inchangé.`)
        return { id: existing.id, email }
      }
      const user = (
        await db.query(
          'INSERT INTO auth.users(email,password_hash,raw_user_meta_data) VALUES($1,$2,$3) RETURNING id',
          [email, await passwordHash(demoPassword), { username, demo_seed: marker }],
        )
      ).rows[0]
      await asUser(user.id, 'SELECT public.complete_onboarding($1,$2)', [role, 'France'])
      await asUser(user.id, 'UPDATE profiles SET display_name=$2,bio=$3 WHERE id=$1', [
        user.id,
        displayName,
        'Compte fictif pour découvrir les compétitions FC27.',
      ])
      created.accounts++
      return { id: user.id, email }
    }

    const organizers = [],
      captains = [],
      players = []
    for (let i = 0; i < 2; i++)
      organizers.push(await account('organizer', i, 'organisateur', `Organisation FC27 ${i + 1}`))
    for (let i = 0; i < 8; i++)
      captains.push(await account('captain', i, 'capitaine', `Capitaine ${clubNames[i]}`))
    for (let i = 0; i < 48; i++) players.push(await account('player', i, 'joueur', playerNames[i]))

    const clubs = []
    for (let i = 0; i < captains.length; i++) {
      const captain = captains[i]
      let club = (await db.query('SELECT id FROM clubs WHERE captain_id=$1', [captain.id])).rows[0]
      if (!club) {
        club = (
          await asUser(captain.id, 'SELECT * FROM public.create_club($1,$2,$3)', [
            `Démo ${clubNames[i]}`,
            'France',
            `Club fictif FC27 : ${clubNames[i]}. Effectif de cinq joueurs.`,
          ])
        ).rows[0]
        await asUser(captain.id, 'UPDATE clubs SET game_id=$2 WHERE id=$1', [club.id, game.id])
        for (const player of players.slice(i * 4, i * 4 + 4)) {
          const application = (
            await asUser(
              player.id,
              'INSERT INTO club_applications(club_id,player_id,message) VALUES($1,$2,$3) RETURNING id',
              [club.id, player.id, 'Candidature de démonstration : prêt pour la saison FC27.'],
            )
          ).rows[0]
          await asUser(captain.id, 'SELECT public.review_application($1,true)', [application.id])
        }
        // Leave requests for the first captain to review in the interface.
        if (i === 0)
          for (const player of players.slice(40, 43)) {
            await asUser(
              player.id,
              'INSERT INTO club_applications(club_id,player_id,message) VALUES($1,$2,$3)',
              [
                club.id,
                player.id,
                'Je souhaite rejoindre le club pour les prochaines compétitions FC27 (démo).',
              ],
            )
          }
        created.clubs++
      }
      clubs.push({ id: club.id, captain: captain.id })
    }
    const representatives = new Map([
      ...players.map((p) => [p.id, p.id]),
      ...clubs.map((c) => [c.id, c.captain]),
    ])

    const startTime = (spec, index) =>
      now +
      (spec.status === 'completed'
        ? -(14 + index)
        : spec.status === 'cancelled'
          ? -10
          : spec.status === 'ongoing'
            ? index - 7
            : spec.status === 'draft'
              ? 21
              : 7) *
        day
    // Replay archives first so ELO history follows the chronology shown in the UI.
    const chronological = [...demoCompetitions.entries()].sort(
      ([ia, a], [ib, b]) => startTime(a, ia) - startTime(b, ib),
    )
    for (const [index, spec] of chronological) {
      const slug = `demo-fc27-${spec.slug}`
      const existing = (await db.query('SELECT settings FROM tournaments WHERE slug=$1', [slug]))
        .rows[0]
      if (existing) {
        if (existing.settings?.demo_seed !== marker)
          throw new Error(`Le slug ${slug} est déjà utilisé.`)
        continue
      }
      // Main demo organizer owns every active workflow; the second owns two archives.
      const owner = organizers[spec.status === 'completed' && index % 2 === 0 ? 1 : 0].id
      const bestOf = spec.bestOf || 1
      const tournament = (
        await asUser(
          owner,
          `INSERT INTO tournaments(name,slug,organizer_id,game_id,format,max_teams,team_size,best_of,
          is_public,region,rules,settings)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'France',$10,$11) RETURNING id`,
          [
            `FC27 · ${spec.name} (démo)`,
            slug,
            owner,
            game.id,
            spec.format,
            spec.size,
            spec.clubs ? 5 : 1,
            bestOf,
            spec.status !== 'draft',
            `Compétition de démonstration : comptes et résultats fictifs, aucune récompense réelle. EA SPORTS FC 27, ${spec.clubs ? 'clubs 5 contre 5' : 'duels 1 contre 1'}. ` +
              (bestOf === 1
                ? 'BO1 : saisir le score en buts ; prolongation et tirs au but en élimination directe pour désigner un vainqueur.'
                : `BO${bestOf} : saisir le nombre de manches gagnées, ${Math.floor(bestOf / 2) + 1} nécessaires pour gagner.`) +
              ' Les deux adversaires confirment le résultat. Un litige est traité par l’organisateur.',
            { demo_seed: marker },
          ],
        )
      ).rows[0]
      const id = tournament.id
      created.competitions++
      if (spec.status !== 'draft') {
        await asUser(owner, "UPDATE tournaments SET status='registration' WHERE id=$1", [id])
        // Leave the main captain free to register their own club in the open competition.
        const source = spec.slug === 'clubs-open' ? clubs.slice(1) : spec.clubs ? clubs : players
        const entrants = source.slice(0, spec.entrants || spec.size)
        for (const [seed, entrant] of entrants.entries()) {
          const reg = (
            await asUser(
              representatives.get(entrant.id),
              'SELECT public.register_tournament($1,$2) AS id',
              [id, spec.clubs ? entrant.id : null],
            )
          ).rows[0]
          if (seed < entrants.length - (spec.pending || 0))
            await asUser(owner, 'SELECT public.review_registration($1,true)', [reg.id])
          await db.query('UPDATE tournament_registrations SET seed=$2 WHERE id=$1', [
            reg.id,
            seed + 1,
          ])
        }
        if (spec.status !== 'registration') {
          const plan = buildBracket(
            entrants.map((e) => ({ id: e.id, type: spec.clubs ? 'club' : 'player' })),
            id,
            spec.format,
          )
          await db.query('SELECT public.install_bracket($1,$2,$3)', [owner, id, plan])
          const completed = spec.status === 'completed'
          const start = startTime(spec, index)
          let played = 0
          while (played < (completed ? 1024 : spec.played || 0)) {
            const match = (
              await db.query(
                `SELECT * FROM matches WHERE tournament_id=$1 AND status='pending'
               AND team1_id IS NOT NULL AND team2_id IS NOT NULL ORDER BY match_number LIMIT 1`,
                [id],
              )
            ).rows[0]
            if (!match) break
            const at = new Date(start + played * 30 * 60_000)
            if (spec.forfeit && played === 2) {
              await asUser(owner, 'SELECT public.forfeit_match($1,$2,$3)', [
                match.id,
                match.team2_id,
                'Démonstration : adversaire absent après le délai convenu.',
              ])
            } else {
              const needed = bestOf === 1 ? 2 + (played % 4) : Math.floor(bestOf / 2) + 1
              const losing = played % (bestOf === 1 ? needed : Math.floor(bestOf / 2) + 1)
              const reverse =
                (spec.reset && match.bracket_position.side === 'grand_final') || played % 3 === 1
              let scores = reverse ? [losing, needed] : [needed, losing]
              if (
                bestOf === 1 &&
                played % 5 === 3 &&
                (['round_robin', 'swiss'].includes(spec.format) || match.group_id)
              )
                scores = [1, 1]
              for (const team of [match.team1_id, match.team2_id])
                await asUser(representatives.get(team), 'SELECT public.submit_score($1,$2,$3)', [
                  match.id,
                  ...scores,
                ])
            }
            await db.query(
              `UPDATE matches SET scheduled_at=$2,started_at=$2,completed_at=$2::timestamptz+interval '20 minutes' WHERE id=$1`,
              [match.id, at],
            )
            await db.query(
              "UPDATE score_submissions SET submitted_at=$2::timestamptz+interval '20 minutes' WHERE match_id=$1",
              [match.id, at],
            )
            await db.query(
              "UPDATE elo_history SET recorded_at=$2::timestamptz+interval '20 minutes' WHERE match_id=$1",
              [match.id, at],
            )
            await db.query(
              "UPDATE match_events SET occurred_at=$2::timestamptz+interval '20 minutes' WHERE match_id=$1",
              [match.id, at],
            )
            await asUser(
              owner,
              'INSERT INTO match_events(match_id,event_type,data,occurred_at) VALUES($1,$2,$3,$4)',
              [
                match.id,
                'comment',
                {
                  description:
                    'Rencontre de démonstration : résultat validé par le moteur de compétition.',
                },
                new Date(at.getTime() + 20 * 60_000),
              ],
            )
            played++
          }
          const actualStatus = (await db.query('SELECT status FROM tournaments WHERE id=$1', [id]))
            .rows[0].status
          if (actualStatus !== (completed ? 'completed' : 'ongoing'))
            throw new Error(`État inattendu pour ${slug} : ${actualStatus}`)
          // Byes and the unused reset have no played duration. Align their display dates.
          await db.query(
            `UPDATE matches SET completed_at=$2 WHERE tournament_id=$1 AND status='completed' AND started_at IS NULL`,
            [id, new Date(start)],
          )
          await db.query(
            `UPDATE matches SET scheduled_at=$2::timestamptz + match_number * interval '30 minutes'
             WHERE tournament_id=$1 AND status='pending'`,
            [id, new Date(now + hour)],
          )
          const ready = (
            await db.query(
              `SELECT * FROM matches WHERE tournament_id=$1 AND status='pending' AND team1_id IS NOT NULL AND team2_id IS NOT NULL ORDER BY match_number`,
              [id],
            )
          ).rows
          if (spec.dispute && ready[0]) {
            const m = ready[0]
            await asUser(representatives.get(m.team1_id), 'SELECT public.submit_score($1,2,1)', [
              m.id,
            ])
            await asUser(representatives.get(m.team2_id), 'SELECT public.submit_score($1,1,2)', [
              m.id,
            ])
            await db.query('UPDATE matches SET scheduled_at=$2,started_at=$2 WHERE id=$1', [
              m.id,
              new Date(now - hour),
            ])
          }
          if (spec.live && ready[0])
            await db.query(
              "UPDATE matches SET status='live',scheduled_at=$2,started_at=$2 WHERE id=$1",
              [ready[0].id, new Date(now - 5 * 60_000)],
            )
          if (spec.confirmation && ready[1]) {
            await asUser(
              representatives.get(ready[1].team1_id),
              'SELECT public.submit_score($1,3,2)',
              [ready[1].id],
            )
            await db.query('UPDATE matches SET scheduled_at=$2,started_at=$2 WHERE id=$1', [
              ready[1].id,
              new Date(now - 40 * 60_000),
            ])
          }
          if (spec.status === 'cancelled')
            await asUser(owner, "UPDATE tournaments SET status='cancelled' WHERE id=$1", [id])
        }
      }
      const start = startTime(spec, index)
      await asUser(
        owner,
        'UPDATE tournaments SET start_date=$2,end_date=$3,registration_deadline=$4 WHERE id=$1',
        [
          id,
          new Date(start),
          new Date(
            spec.status === 'completed'
              ? start + 3 * day
              : spec.status === 'cancelled'
                ? now
                : Math.max(start + 7 * day, now + 7 * day),
          ),
          new Date(start - day),
        ],
      )
    }
    const summary = {
      created,
      accounts: {
        organizers: organizers.length,
        captains: captains.length,
        players: players.length,
      },
      clubs: clubs.length,
      competitions: (
        await db.query(
          "SELECT status,count(*)::int AS count FROM tournaments WHERE settings->>'demo_seed'=$1 GROUP BY status ORDER BY status",
          [marker],
        )
      ).rows,
      matches: (
        await db.query(
          "SELECT m.status,count(*)::int AS count FROM matches m JOIN tournaments t ON t.id=m.tournament_id WHERE t.settings->>'demo_seed'=$1 GROUP BY m.status ORDER BY m.status",
          [marker],
        )
      ).rows,
    }
    await db.query('COMMIT')
    return summary
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.env.NODE_ENV === 'production')
      throw new Error('Démonstration réservée au développement local.')
    await migrate()
    console.log(JSON.stringify(await seedDemo(), null, 2))
  } finally {
    await pool.end()
  }
}
