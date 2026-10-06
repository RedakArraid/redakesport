import { test, expect } from '@playwright/test'
import pg from 'pg'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { buildBracket } from '../../apps/api/src/brackets'
const connectionString =
  process.env.TEST_DATABASE_URL || 'postgresql://redak:redak_local@127.0.0.1:5440/redakesport_test'
if (!new URL(connectionString).pathname.endsWith('_test'))
  throw new Error('A test database is required')

for (const width of [1366, 390])
  test(`BO3 scores, Swiss standings and BO5 forfeits at ${width}px`, async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(90000)
    const pool = new pg.Pool({ connectionString }),
      errors: string[] = []
    await context.setExtraHTTPHeaders({
      'x-forwarded-for': width === 1366 ? '127.0.4.10' : '127.0.4.11',
    })
    await page.setViewportSize({ width, height: 900 })
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() >= 500) errors.push(`${r.status()} ${r.url()}`)
    })
    const actors: { id: string; token: string }[] = []
    const session = async (actor: (typeof actors)[number]) => {
      await context.clearCookies()
      await context.addCookies([
        { name: 'redak_session', value: actor.token, domain: 'localhost', path: '/' },
      ])
    }
    const call = async (actor: (typeof actors)[number], name: string, data: unknown) => {
      const response = await request.post(`/api/actions/${name}`, {
        data,
        headers: { cookie: `redak_session=${actor.token}`, 'x-forwarded-for': '127.0.4.20' },
      })
      expect(response.ok(), await response.text()).toBeTruthy()
    }
    try {
      for (let i = 0; i < 6; i++) {
        const id = randomUUID(),
          token = randomBytes(32).toString('base64url')
        await pool.query(
          'INSERT INTO auth.users(id,email,password_hash,raw_user_meta_data) VALUES($1,$2,$3,$4)',
          [id, `${id}@example.test`, 'fixture', { username: `Serie_${i}_${id.slice(0, 4)}` }],
        )
        await pool.query('UPDATE profiles SET role=$2,onboarding_completed=true WHERE id=$1', [
          id,
          i === 0 ? 'organizer' : 'player',
        ])
        await pool.query(
          "INSERT INTO auth.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
          [createHash('sha256').update(token).digest('hex'), id],
        )
        actors.push({ id, token })
      }
      const owner = actors[0],
        players = actors.slice(1),
        tournament = randomUUID(),
        cup = randomUUID()
      for (const [id, format, bestOf, n] of [
        [tournament, 'swiss', 3, 5],
        [cup, 'single_elimination', 5, 2],
      ] as const) {
        await pool.query(
          "INSERT INTO tournaments(id,name,slug,organizer_id,format,best_of,team_size,max_teams,status,is_public) VALUES($1::uuid,$2,$1::text,$3,$4,$5,1,$6,'registration',true)",
          [id, `Coupe séries BO${bestOf}`, owner.id, format, bestOf, n],
        )
        for (const player of players.slice(0, n))
          await pool.query(
            "INSERT INTO tournament_registrations(tournament_id,player_id,status) VALUES($1,$2,'approved')",
            [id, player.id],
          )
        await pool.query('SELECT public.install_bracket($1,$2,$3)', [
          owner.id,
          id,
          buildBracket(
            players.slice(0, n).map((p) => ({ id: p.id, type: 'player' })),
            id,
            format,
          ),
        ])
      }
      const firstRound = (
        await pool.query(
          'SELECT * FROM matches WHERE tournament_id=$1 AND team2_id IS NOT NULL ORDER BY match_number',
          [tournament],
        )
      ).rows
      const match = firstRound[0]
      await session(players.find((p) => p.id === match.team1_id)!)
      await page.goto(`/app/scores?match=${match.id}`)
      await expect(
        page.getByText('BO3 : saisis les manches gagnées.', { exact: false }),
      ).toBeVisible()
      await page.locator('#score-one').fill('1')
      await page.locator('#score-two').fill('0')
      await page.getByRole('button', { name: 'Soumettre le score', exact: true }).click()
      await expect(
        page.getByText(
          'BO3 : le vainqueur doit avoir 2 manches gagnées et son adversaire moins de 2',
          { exact: true },
        ),
      ).toBeVisible()
      await page.locator('#score-one').fill('2')
      await page.locator('#score-two').fill('1')
      await mkdir('test-results/competition', { recursive: true })
      await page.screenshot({ path: `test-results/competition/bo3-${width}.png`, fullPage: true })
      await page.getByRole('button', { name: 'Soumettre le score', exact: true }).click()
      await expect(
        page.getByText('En attente de confirmation par l’adversaire.', { exact: true }),
      ).toBeVisible()
      await session(players.find((p) => p.id === match.team2_id)!)
      await page.goto(`/app/scores?match=${match.id}`)
      await page.locator('#score-one').fill('2')
      await page.locator('#score-two').fill('1')
      await page.getByRole('button', { name: 'Soumettre le score', exact: true }).click()
      await expect(
        page.getByText('Résultat confirmé. Classement mis à jour.', { exact: true }),
      ).toBeVisible()
      await session(owner)
      await page.goto(`/app/matches/${firstRound[1].id}`)
      await page.getByRole('button', { name: 'Déclarer un forfait', exact: true }).click()
      await page.getByLabel('Participant qui déclare forfait').selectOption(firstRound[1].team2_id)
      await page.getByLabel('Motif du forfait').fill('Absence confirmée au début du match')
      await page.getByRole('button', { name: 'Confirmer le forfait', exact: true }).click()
      await expect(
        page.getByText('Score administratif. Aucun changement d’ELO.', { exact: true }),
      ).toBeVisible()
      await page.goto(`/app/tournaments/${tournament}/bracket`)
      await expect(page.getByRole('heading', { name: 'Ronde 2', exact: true })).toBeVisible()
      for (let i = 0; i < 20; i++) {
        const m = (
          await pool.query(
            "SELECT * FROM matches WHERE tournament_id=$1 AND status='pending' AND team2_id IS NOT NULL ORDER BY round LIMIT 1",
            [tournament],
          )
        ).rows[0]
        if (!m) break
        for (const id of [m.team1_id, m.team2_id])
          await call(
            players.find((p) => p.id === id)!,
            'submit_score',
            { p_match_id: m.id, p_score1: 2, p_score2: 0 },
          )
      }
      await page.goto(`/app/tournaments/${tournament}/standings`)
      await expect(page.getByRole('columnheader', { name: 'BH', exact: true })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'SB', exact: true })).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(5)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBeTruthy()
      await page.screenshot({
        path: `test-results/competition/swiss-standings-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      })
      const final = (await pool.query('SELECT * FROM matches WHERE tournament_id=$1', [cup]))
        .rows[0]
      await session(players.find((p) => p.id === final.team2_id)!)
      await page.goto(`/app/matches/${final.id}`)
      await page.getByRole('button', { name: 'Déclarer mon forfait', exact: true }).click()
      await page
        .getByLabel('Motif du forfait')
        .fill('Abandon volontaire avant le début de la série')
      await expect(
        page.getByRole('button', { name: 'Confirmer le forfait', exact: true }),
      ).toBeEnabled()
      await page.screenshot({
        path: `test-results/competition/forfeit-confirmation-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      })
      await page.getByRole('button', { name: 'Confirmer le forfait', exact: true }).click()
      await expect(
        page.getByText('Score administratif. Aucun changement d’ELO.', { exact: true }),
      ).toBeVisible()
      await expect(page.locator('.match-score')).toContainText('3')
      await page.getByRole('button', { name: '⚡ Événements', exact: true }).click()
      await expect(page.getByText('Forfait déclaré', { exact: true })).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Déclarer mon forfait', exact: true }),
      ).toHaveCount(0)
      await page.goto(`/app/tournaments/${cup}/bracket`)
      await expect(page.locator('[data-bracket-match]')).toContainText('BO5')
      await expect(page.locator('[data-bracket-match]')).toContainText('Forfait')
      await expect(page.getByRole('link', { name: 'Voir le classement final' })).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBeTruthy()
      expect(errors).toEqual([])
    } finally {
      await pool.end()
    }
  })
