// screens-club.jsx — Pro Club management (captain perspective)
// Mon Club: overview + roster + streaming hub + applications + Pro Clubs league
// Plus a separate registration flow for players joining a club.

function ScreenClub({ density, isAdmin }) {
  const [tab, setTab] = React.useState('overview');

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'roster', label: 'Effectif & rôles', count: CLUB_ROSTER.length },
    { id: 'streaming', label: 'Streaming', count: CLUB_STREAMS_LIVE.length, live: true },
    { id: 'applications', label: 'Candidatures', count: CLUB_APPLICATIONS.length },
    { id: 'league', label: 'Ligue Pro Clubs' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <ClubHero density={density} isAdmin={isAdmin} />

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 5, paddingTop: 4
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
            color: tab === t.id ? 'var(--ink)' : 'var(--muted)',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 8
          }}>
            {t.live && <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)', animation: 'pulse 1.2s infinite' }} />}
            {t.label}
            {t.count != null && (
              <span style={{
                background: tab === t.id ? 'var(--accent)' : 'var(--mute-bg)',
                color: tab === t.id ? '#fff' : 'var(--muted)',
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                fontFamily: 'var(--font-mono)', fontWeight: 800
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <ClubOverview />}
      {tab === 'roster' && <ClubRoster density={density} isAdmin={isAdmin} />}
      {tab === 'streaming' && <ClubStreaming />}
      {tab === 'applications' && <ClubApplications isAdmin={isAdmin} />}
      {tab === 'league' && <ClubLeague />}
    </div>
  );
}

// ============================================================
// HERO — club identity strip
// ============================================================
function ClubHero({ density, isAdmin }) {
  const C = MY_CLUB;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 22,
      background: `linear-gradient(135deg, ${C.color} 0%, #1a1a1a 70%)`,
      color: '#fff', padding: density === 'compact' ? 22 : 30
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 16px)'
      }} />
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 24, alignItems: 'center' }}>
        <div style={{
          width: 120, height: 120, borderRadius: 24, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48,
          color: C.color, letterSpacing: '-0.04em',
          border: '4px solid rgba(255,255,255,0.3)'
        }}>{C.tag}</div>

        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Badge solid tone="accent">★ MON CLUB</Badge>
            <Badge tone="outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
              <GameIcon game="EA FC 26" size={12} /> Pro Clubs · 11v11
            </Badge>
            <Badge tone="outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
              {flag(C.country)} {C.city}
            </Badge>
          </div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 56, letterSpacing: '-0.04em', lineHeight: 0.95
          }}>{C.name}</h1>
          <div style={{ marginTop: 10, fontSize: 14, opacity: 0.85, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <span>« {C.motto} »</span>
            <span>·</span>
            <span>Fondé en {C.founded}</span>
            <span>·</span>
            <span>{C.trophies} trophées</span>
            <span>·</span>
            <span>{C.followers.toLocaleString('fr-FR')} fans</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ligue actuelle</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>2ᵉ · Division 1</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>45 pts · course aux champions</div>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Btn variant="accent" size="sm" style={{ background: '#fff', color: C.color }}>+ Inviter joueur</Btn>
              <Btn variant="ghost" size="sm" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>⚙ Paramètres</Btn>
            </div>
          )}
        </div>
      </div>

      <div style={{
        position: 'relative', marginTop: 22, paddingTop: 22,
        borderTop: '1px solid rgba(255,255,255,0.15)',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14
      }}>
        <HeroStat label="Effectif" value="14" sub="8 titulaires · 4 subs · 2 staff" />
        <HeroStat label="Saison en cours" value="45 pts" sub="14V · 3N · 2D · +34" />
        <HeroStat label="Streamers" value="6" sub="2 en live actuellement" tone="live" />
        <HeroStat label="Candidatures" value={CLUB_APPLICATIONS.length} sub="2 essais à programmer" />
        <HeroStat label="Discord" value={C.followers.toLocaleString('fr-FR')} sub={`${C.monthlyGrowth} ce mois`} />
      </div>
    </div>
  );
}

function HeroStat({ label, value, sub, tone }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 6 }}>
        {tone === 'live' && <span style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--accent)', animation: 'pulse 1.2s infinite' }} />}
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ============================================================
// OVERVIEW TAB
// ============================================================
function ClubOverview() {
  const captain = playerById(MY_CLUB.captainId);
  const liveStreams = CLUB_STREAMS_LIVE;
  const nextMatch = PRO_CLUBS_LEAGUE.schedule.find(s => s.status === 'upcoming');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Captain card + Next match */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <SectionTitle kicker="DIRECTION" title="Capitaine" size="sm" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 30, background: MY_CLUB.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24
              }}>{captain.handle[0]}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
                  {captain.handle} <span style={{ color: 'var(--accent)' }}>★</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{captain.name} · {flag(captain.country)} · {captain.position} #{captain.shirt}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>« {captain.flair} »</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
              <MiniKpi label="Apps" value={captain.stats.app} />
              <MiniKpi label="Buts" value={captain.stats.goals} />
              <MiniKpi label="Passes" value={captain.stats.assists} />
              <MiniKpi label="Note" value={captain.stats.rating} />
            </div>
          </Card>

          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ background: 'var(--ink)', color: '#fff', padding: 18 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
                PROCHAIN GROS MATCH
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em' }}>
                  vs Kraken
                </span>
                <span style={{ opacity: 0.6, fontSize: 14 }}>· 11/06 · 20h</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Pro Clubs Elite — choc en haut de tableau</div>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: MY_CLUB.color, color: '#fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800 }}>NVX</div>
                  <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>2ᵉ · 45 pts</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--muted)' }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: '#2547ff', color: '#fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800 }}>KRA</div>
                  <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>1ᵉʳ · 47 pts</div>
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
                <Btn variant="accent" size="sm" style={{ flex: 1 }}>📋 Composition</Btn>
                <Btn variant="ghost" size="sm" style={{ flex: 1 }}>📺 Stream</Btn>
              </div>
            </div>
          </Card>
        </div>

        {/* Live streams from club */}
        <Card>
          <SectionTitle kicker="EN DIRECT" title="Streams du club"
            action={<Btn variant="ghost" size="sm">Voir tous →</Btn>}
          />
          {liveStreams.length === 0 ? (
            <EmptyState text="Aucun stream actif. Programmez un live ?" cta="+ Planifier un stream" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {liveStreams.map(s => <LiveStreamCard key={s.player} stream={s} />)}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card>
          <SectionTitle kicker="ACTIVITÉ" title="Dernières actions" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { icon: '✓', t: 'Kasper a accepté votre invitation à un essai', sub: 'aujourd\'hui · 14h32', tone: 'success' },
              { icon: '+', t: 'Nouvelle candidature de Phoenix_TV (ATT)', sub: 'aujourd\'hui · 11h20', tone: 'accent' },
              { icon: '⚽', t: 'Victoire 3-1 contre Hivemind — Le0n MOTM', sub: 'il y a 2 jours', tone: 'success' },
              { icon: '📺', t: 'Kr1m a commencé à streamer (Twitch)', sub: 'il y a 2h', tone: 'accent' },
              { icon: '★', t: 'Astra promue au statut de titulaire', sub: 'il y a 3 jours', tone: 'neutral' },
              { icon: '€', t: 'Logitech G a renouvelé son sponsoring (12 mois)', sub: 'il y a 5 jours', tone: 'success' },
            ].map((a, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr auto', alignItems: 'center', gap: 12,
                padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)'
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 14, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13,
                  background: a.tone === 'success' ? 'rgba(22,163,74,0.12)' : a.tone === 'accent' ? 'rgba(255,59,48,0.12)' : 'var(--mute-bg)',
                  color: a.tone === 'success' ? '#16a34a' : a.tone === 'accent' ? 'var(--accent)' : 'var(--ink)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }}>{a.icon}</span>
                <span style={{ fontSize: 14 }}>{a.t}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{a.sub}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Quick stats */}
        <Card>
          <SectionTitle kicker="RANG EN LIGUE" title={`2ᵉ — Division 1`} size="sm" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 56, letterSpacing: '-0.04em', color: 'var(--accent)' }}>2</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--muted)' }}>/ 10</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
            Vous êtes à <strong style={{ color: 'var(--ink)' }}>2 points</strong> de la 1ʳᵉ place (Kraken). 5 matchs restants.
          </div>
          <div style={{ marginTop: 14, padding: 12, background: 'var(--mute-bg)', borderRadius: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Forme</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {['W','W','W','D','W'].map((f, i) => (
                <span key={i} style={{
                  width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: f === 'W' ? '#16a34a' : f === 'L' ? '#dc2626' : '#facc15',
                  color: f === 'D' ? '#0a0a0a' : '#fff', fontFamily: 'var(--font-mono)'
                }}>{f}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Roles distribution */}
        <Card>
          <SectionTitle kicker="STAFF & EFFECTIF" title="Rôles" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(ROLE_META).map(([key, meta]) => {
              const count = CLUB_ROSTER.filter(p => p.role === key).length;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 8, background: meta.color, color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 800
                  }}>{meta.short}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{meta.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="SPONSORS CLUB" title="Partenaires" size="sm" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {MY_CLUB.sponsors.map(s => (
              <div key={s} style={{
                border: '1px solid var(--border)', borderRadius: 10, padding: '12px 6px',
                textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em'
              }}>{s.toUpperCase()}</div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="SOCIAL" title="Suivre Nova" size="sm" />
          <SocialBar items={[
            { kind: 'twitch' }, { kind: 'youtube' }, { kind: 'x' },
            { kind: 'instagram' }, { kind: 'tiktok' }, { kind: 'discord' },
            { kind: 'facebook' }
          ]} />
        </Card>
      </div>
    </div>
  );
}

function MiniKpi({ label, value }) {
  return (
    <div style={{ background: 'var(--mute-bg)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

function EmptyState({ text, cta }) {
  return (
    <div style={{ padding: 30, textAlign: 'center', background: 'var(--mute-bg)', borderRadius: 12 }}>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>{text}</div>
      <Btn variant="primary" size="sm">{cta}</Btn>
    </div>
  );
}

function LiveStreamCard({ stream }) {
  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MediaPlaceholder label={`${stream.player.toUpperCase()} · TWITCH`} tone="dark" height={140} type="video" rounded={0} />
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
        <Badge tone="live">● LIVE</Badge>
        <Badge solid tone="accent" style={{ background: stream.color }}>{stream.player}</Badge>
      </div>
      <div style={{ position: 'absolute', top: 10, right: 10 }}>
        <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', fontWeight: 700 }}>
          👁 {stream.viewers.toLocaleString('fr-FR')}
        </span>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{stream.title}</div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
          <SocialIcon kind={stream.platform} size={12} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{stream.platform} · démarré il y a {stream.started}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROSTER TAB — pitch view + table view
// ============================================================
function ClubRoster({ density, isAdmin }) {
  const [view, setView] = React.useState('pitch');
  const [filterRole, setFilterRole] = React.useState('all');

  const filtered = filterRole === 'all'
    ? CLUB_ROSTER
    : CLUB_ROSTER.filter(p => p.role === filterRole);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Btn size="sm" variant={filterRole === 'all' ? 'primary' : 'ghost'} onClick={() => setFilterRole('all')}>Tous · {CLUB_ROSTER.length}</Btn>
          {Object.entries(ROLE_META).map(([key, meta]) => {
            const count = CLUB_ROSTER.filter(p => p.role === key).length;
            if (count === 0) return null;
            return (
              <Btn key={key} size="sm" variant={filterRole === key ? 'primary' : 'ghost'} onClick={() => setFilterRole(key)}>
                {meta.label} · {count}
              </Btn>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['pitch', '⚽ Terrain'], ['list', '☰ Liste']].map(([k, l]) => (
            <Btn key={k} size="sm" variant={view === k ? 'primary' : 'ghost'} onClick={() => setView(k)}>{l}</Btn>
          ))}
          {isAdmin && <Btn size="sm" variant="accent">+ Inviter un joueur</Btn>}
        </div>
      </div>

      {view === 'pitch' && <PitchView />}
      {view === 'list' && <RosterTable roster={filtered} isAdmin={isAdmin} />}
    </div>
  );
}

// Football pitch view — visual 4-2-3-1 with all roles
function PitchView() {
  const starters = CLUB_ROSTER.filter(p => p.role === 'captain' || p.role === 'vice_captain' || p.role === 'starter' || p.role === 'streamer');
  const subs = CLUB_ROSTER.filter(p => p.role === 'sub');
  const staff = CLUB_ROSTER.filter(p => p.role === 'coach' || p.role === 'manager');

  // 4-2-3-1 positions, but adapted to the 8 starters in our data
  // GK (1) — DEF row (2) — MID row (2) — ATT row (2) — Striker (1) → 8 total
  const positions = [
    { x: 50, y: 88, p: starters.find(p => p.position === 'GK') }, // GK
    { x: 22, y: 70, p: starters.filter(p => p.position === 'DEF')[0] },
    { x: 78, y: 70, p: starters.filter(p => p.position === 'DEF')[1] },
    { x: 30, y: 50, p: starters.filter(p => p.position === 'MIL')[0] },
    { x: 70, y: 50, p: starters.filter(p => p.position === 'MIL')[1] },
    { x: 22, y: 30, p: starters.filter(p => p.position === 'MIL')[2] },
    { x: 78, y: 30, p: starters.filter(p => p.position === 'ATT')[0] },
    { x: 50, y: 14, p: starters.filter(p => p.position === 'ATT')[1] || starters.filter(p => p.position === 'ATT')[0] },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>FORMATION</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>4-2-3-1 · Onze type</div>
          </div>
          <Btn variant="ghost" size="sm">Modifier la compo</Btn>
        </div>
        <div style={{
          position: 'relative', aspectRatio: '4/5',
          background: `
            linear-gradient(180deg, #1f8a5b 0%, #166a44 100%)
          `,
          overflow: 'hidden'
        }}>
          {/* Pitch markings */}
          <svg viewBox="0 0 100 125" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <rect x="2" y="2" width="96" height="121" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
            <line x1="2" y1="62.5" x2="98" y2="62.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
            <circle cx="50" cy="62.5" r="10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
            <rect x="20" y="2" width="60" height="14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
            <rect x="35" y="2" width="30" height="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
            <rect x="20" y="109" width="60" height="14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
            <rect x="35" y="117" width="30" height="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
          </svg>
          {/* Stripes */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 32px, transparent 32px 64px)',
            pointerEvents: 'none'
          }} />
          {positions.map((pos, i) => pos.p && <PitchPlayer key={i} pos={pos} player={pos.p} />)}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card>
          <SectionTitle kicker={`BANC · ${subs.length} JOUEURS`} title="Remplaçants" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subs.map(p => <RosterRow key={p.id} p={p} compact />)}
          </div>
        </Card>
        <Card>
          <SectionTitle kicker="STAFF" title="Encadrement" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {staff.map(p => <RosterRow key={p.id} p={p} compact />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PitchPlayer({ pos, player }) {
  const meta = ROLE_META[player.role];
  const isCap = player.role === 'captain';
  const isVC = player.role === 'vice_captain';
  const isStreamer = player.role === 'streamer';
  return (
    <div style={{
      position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
      transform: 'translate(-50%, -50%)', textAlign: 'center', width: 90
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28, background: MY_CLUB.color, color: '#fff',
        margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22,
        border: '3px solid #fff', position: 'relative',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
      }}>
        {player.shirt}
        {isCap && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: '#facc15', color: '#0a0a0a',
            width: 22, height: 22, borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-display)',
            border: '2px solid #fff'
          }}>C</span>
        )}
        {isVC && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: '#fff', color: '#f59e0b',
            width: 22, height: 22, borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-display)',
            border: '2px solid #f59e0b'
          }}>VC</span>
        )}
        {isStreamer && (
          <span style={{
            position: 'absolute', bottom: -4, right: -4,
            background: '#a855f7', color: '#fff',
            width: 22, height: 22, borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff'
          }}>
            <SocialIcon kind="twitch" size={10} />
          </span>
        )}
      </div>
      <div style={{
        marginTop: 6, color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13,
        letterSpacing: '-0.01em', textShadow: '0 1px 3px rgba(0,0,0,0.5)'
      }}>{player.handle}</div>
      <div style={{
        marginTop: 2, fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em'
      }}>{player.position}</div>
    </div>
  );
}

function RosterRow({ p, compact, isAdmin }) {
  const meta = ROLE_META[p.role];
  const stat = STATUS_META[p.status];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? '36px 1fr auto' : '40px 1fr 80px 100px 80px auto',
      alignItems: 'center', gap: 12,
      padding: '8px 10px', borderRadius: 8, background: 'var(--mute-bg)'
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 18, background: MY_CLUB.color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, position: 'relative'
      }}>
        {p.handle[0]}
        <span style={{
          position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
          borderRadius: 5, background: stat.color, border: '2px solid #fff'
        }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          {p.handle}
          {p.shirt && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>#{p.shirt}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{flag(p.country)} {p.name}</div>
      </div>
      {!compact && (
        <>
          <Badge solid tone="accent" style={{ background: meta.color, fontSize: 10 }}>{meta.label}</Badge>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.position}</span>
          <span style={{ fontSize: 11, color: stat.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>● {stat.label}</span>
        </>
      )}
      <Btn variant="ghost" size="sm">→</Btn>
    </div>
  );
}

function RosterTable({ roster, isAdmin }) {
  // Sort by role priority
  const sorted = roster.slice().sort((a, b) => ROLE_META[a.role].priority - ROLE_META[b.role].priority);
  return (
    <Card padding={0}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '50px 2fr 130px 60px 80px 1fr 110px 60px',
        gap: 12, padding: '14px 22px', borderBottom: '1px solid var(--border)',
        fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)'
      }}>
        <span>#</span><span>Joueur</span><span>Rôle</span><span style={{ textAlign: 'center' }}>Pos</span>
        <span style={{ textAlign: 'center' }}>Statut</span><span>Stats saison</span>
        <span>Stream</span><span>Actions</span>
      </div>
      {sorted.map((p, i) => {
        const meta = ROLE_META[p.role];
        const stat = STATUS_META[p.status];
        return (
          <div key={p.id} style={{
            display: 'grid',
            gridTemplateColumns: '50px 2fr 130px 60px 80px 1fr 110px 60px',
            gap: 12, padding: '14px 22px', alignItems: 'center',
            borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 18, background: MY_CLUB.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
              position: 'relative'
            }}>
              {p.shirt || p.handle[0]}
              <span style={{
                position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
                borderRadius: 5, background: stat.color, border: '2px solid #fff'
              }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                {p.handle}
                {p.role === 'captain' && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>★</span>}
                {p.role === 'streamer' && p.streaming && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 800 }}>● LIVE</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{flag(p.country)} {p.name} · {p.age} ans</div>
            </div>
            <Badge solid style={{ background: meta.color, fontSize: 10, color: '#fff' }}>{meta.label}</Badge>
            <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{p.position}</span>
            <span style={{ fontSize: 11, color: stat.color, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'center' }}>● {stat.label}</span>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {p.stats ? (
                <span>
                  <strong style={{ color: 'var(--ink)' }}>{p.stats.app}</strong>app · <strong style={{ color: 'var(--ink)' }}>{p.stats.goals}</strong>b · <strong style={{ color: 'var(--ink)' }}>{p.stats.assists}</strong>p · ⭐{p.stats.rating}
                </span>
              ) : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {p.stream ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <SocialIcon kind="twitch" size={11} /> {p.stream.split('/').pop()}
                </span>
              ) : '—'}
            </div>
            <Btn variant="ghost" size="sm">⋯</Btn>
          </div>
        );
      })}
    </Card>
  );
}

// ============================================================
// STREAMING TAB
// ============================================================
function ClubStreaming() {
  const streamers = CLUB_ROSTER.filter(p => p.stream);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="EN DIRECT MAINTENANT" title="Streams actifs" size="md"
            action={<Btn variant="accent" size="sm">+ Démarrer un stream</Btn>}
          />
          {CLUB_STREAMS_LIVE.length === 0 ? (
            <EmptyState text="Aucun stream en cours" cta="+ Programmer" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {CLUB_STREAMS_LIVE.map(s => <LiveStreamCard key={s.player} stream={s} />)}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle kicker="PROGRAMME" title="Streams planifiés" size="md" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {CLUB_STREAMS_SCHEDULED.map((s, i) => {
              const player = CLUB_ROSTER.find(p => p.handle === s.player);
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr 130px auto',
                  alignItems: 'center', gap: 14,
                  padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)'
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, background: MY_CLUB.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 800
                  }}>{s.player[0]}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                      {s.player} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {s.topic}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <SocialIcon kind={s.platform} size={12} /> {s.platform}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{s.when}</span>
                  <Btn variant="ghost" size="sm">🔔 Rappel</Btn>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="POLITIQUE" title="Règles de streaming du club" size="sm" />
          <ol style={{ paddingLeft: 18, margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--ink)' }}>
            <li>Tous les streams officiels doivent afficher le logo Nova en overlay.</li>
            <li>Le streamer officiel (Vyx) a priorité sur les matchs majeurs.</li>
            <li>Multi-stream autorisé (Twitch + TikTok Live simultanés).</li>
            <li>Discord en intégration obligatoire pour les commandes communautaires.</li>
            <li>Les retombées sponsoring sont mutualisées à 70/30 (joueur/club).</li>
          </ol>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="STREAMERS DU CLUB" title={`${streamers.length} actifs`} size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {streamers.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                borderRadius: 10, background: p.streaming ? 'rgba(255,59,48,0.05)' : 'var(--mute-bg)',
                border: p.streaming ? '1px solid var(--accent)' : '1px solid transparent'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 18, background: MY_CLUB.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800
                }}>{p.handle[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                    {p.handle}
                    {p.role === 'streamer' && <span style={{ marginLeft: 6, color: '#a855f7', fontSize: 10, fontWeight: 800 }}>★ OFFICIEL</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <SocialIcon kind="twitch" size={10} /> {p.stream}
                  </div>
                </div>
                {p.streaming && <Badge tone="live">● LIVE</Badge>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="PLATEFORMES" title="Chaînes officielles club" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PlatformRow kind="twitch" name="novaesports" stat="42K followers · 2.1K viewers moy." />
            <PlatformRow kind="youtube" name="@NovaEsports" stat="18K abonnés" />
            <PlatformRow kind="kick" name="nova" stat="4.2K followers" />
            <PlatformRow kind="tiktok" name="@nova.esports" stat="89K followers" />
            <PlatformRow kind="instagram" name="nova.esports" stat="36K followers" />
            <PlatformRow kind="discord" name="discord.gg/nova" stat="3 247 membres" />
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="ANALYTICS" title="30 derniers jours" size="sm" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <MiniKpi label="Heures stream" value="142h" />
            <MiniKpi label="Viewers cumulés" value="89K" />
            <MiniKpi label="Nouveaux follows" value="+2.1K" />
            <MiniKpi label="Revenus subs" value="1 240 €" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlatformRow({ kind, name, stat }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, background: 'var(--mute-bg)' }}>
      <span style={{
        width: 32, height: 32, borderRadius: 16, background: 'var(--ink)', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <SocialIcon kind={kind} size={14} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{stat}</div>
      </div>
      <Btn variant="ghost" size="sm">⚙</Btn>
    </div>
  );
}

// ============================================================
// APPLICATIONS TAB
// ============================================================
function ClubApplications({ isAdmin }) {
  const [selected, setSelected] = React.useState(CLUB_APPLICATIONS[0]?.id);
  const current = CLUB_APPLICATIONS.find(a => a.id === selected) || CLUB_APPLICATIONS[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
      <Card padding={0}>
        <div style={{ padding: 18, borderBottom: '1px solid var(--border)' }}>
          <SectionTitle kicker={`${CLUB_APPLICATIONS.length} EN ATTENTE`} title="Candidatures" size="sm" />
          <div style={{ display: 'flex', gap: 4 }}>
            <Btn size="sm" variant="primary">Toutes</Btn>
            <Btn size="sm" variant="ghost">Recommandées</Btn>
            <Btn size="sm" variant="ghost">Essais</Btn>
          </div>
        </div>
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {CLUB_APPLICATIONS.map((app) => (
            <div key={app.id} onClick={() => setSelected(app.id)} style={{
              padding: 14, cursor: 'pointer',
              background: selected === app.id ? 'var(--mute-bg)' : 'transparent',
              borderLeft: selected === app.id ? '3px solid var(--accent)' : '3px solid transparent',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 16, background: 'var(--ink)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12
                }}>{app.handle[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{app.handle}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{flag(app.country)} {app.position} · {app.level}</div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{app.sentAt}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {app.referredBy && <Badge tone="warning">Recommandé par {app.referredBy}</Badge>}
                {app.tryoutDate && <Badge tone="success">Essai {app.tryoutDate}</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card padding={0}>
        <div style={{ padding: 22, background: 'var(--mute-bg)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 36, background: 'var(--ink)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28
            }}>{current.handle[0]}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em' }}>
                {current.handle}
              </h2>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                {current.name} · {flag(current.country)} {current.country} · {current.age} ans · {current.position}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <Badge tone="outline">{current.level}</Badge>
                <Badge tone="outline">{current.winRate}% victoires</Badge>
                {current.referredBy && <Badge tone="warning">Parrainé par {current.referredBy}</Badge>}
              </div>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" size="md">✕ Refuser</Btn>
                <Btn variant="primary" size="md">📅 Programmer essai</Btn>
                <Btn variant="accent" size="md">✓ Accepter</Btn>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <SectionTitle kicker="MESSAGE" title="Lettre de motivation" size="sm" />
            <p style={{ margin: 0, padding: 16, background: 'var(--mute-bg)', borderRadius: 10, fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
              « {current.message} »
            </p>
          </div>

          <div>
            <SectionTitle kicker="STATISTIQUES CARRIÈRE" title="Performances" size="sm" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <SmallStat label="Matchs" value={current.stats.matches} />
              <SmallStat label="Buts" value={current.stats.goals} />
              <SmallStat label="Passes" value={current.stats.assists} />
              <SmallStat label="Note moyenne" value={current.stats.rating} tone="red" />
            </div>
          </div>

          {current.tryoutDate && (
            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(22,163,74,0.08)', border: '1px solid #16a34a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>📅</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>Essai programmé le {current.tryoutDate}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Match de tryout 30 min · serveur d'entraînement Nova</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <SectionTitle kicker="DÉCISION RAPIDE" title="Que faire ?" size="sm" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <DecisionCard label="✓ Accepter directement" sub="Ajouter au banc (remplaçant)" tone="success" />
              <DecisionCard label="📅 Tryout" sub="Match d'essai 30 min" tone="warning" />
              <DecisionCard label="✕ Refuser" sub="Message de réponse standard" tone="neutral" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SmallStat({ label, value, tone }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: 'var(--mute-bg)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em',
        color: tone === 'red' ? 'var(--accent)' : 'var(--ink)'
      }}>{value}</div>
    </div>
  );
}

function DecisionCard({ label, sub, tone }) {
  const bg = tone === 'success' ? 'rgba(22,163,74,0.08)' : tone === 'warning' ? 'rgba(250,204,21,0.12)' : 'var(--mute-bg)';
  const border = tone === 'success' ? '#16a34a' : tone === 'warning' ? '#facc15' : 'var(--border)';
  return (
    <div style={{ padding: 14, borderRadius: 10, background: bg, border: `1px solid ${border}`, cursor: 'pointer' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ============================================================
// PRO CLUBS LEAGUE TAB
// ============================================================
function ClubLeague() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* League header */}
      <div style={{
        background: 'var(--ink)', color: '#fff', borderRadius: 18, padding: 24,
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center'
      }}>
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <Badge solid tone="accent">EA FC PRO CLUBS</Badge>
            <Badge tone="outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>11 vs 11 · BO1</Badge>
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.03em' }}>
            {PRO_CLUBS_LEAGUE.division}
          </h2>
          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.7 }}>
            {PRO_CLUBS_LEAGUE.season} · Dotation totale {PRO_CLUBS_LEAGUE.prizePool}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <HeroStat label="Promotion" value={`${PRO_CLUBS_LEAGUE.promotionSlots} places`} sub="Conférence Elite" />
          <HeroStat label="Relégation" value={`${PRO_CLUBS_LEAGUE.relegationSlots} places`} sub="Division 2" />
        </div>
      </div>

      {/* Schedule + Standings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 22 }}>
        <Card>
          <SectionTitle kicker="CALENDRIER NOVA" title="Prochains matchs" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {PRO_CLUBS_LEAGUE.schedule.map((m, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '60px 1fr auto',
                alignItems: 'center', gap: 12,
                padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                opacity: m.status === 'done' ? 0.6 : 1
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{m.date}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{m.time}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 16, background: m.oppColor, color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11
                  }}>{m.oppTag}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                      {m.home ? 'vs' : '@'} {m.opp}{m.big && <span style={{ marginLeft: 6, color: 'var(--accent)' }}>🔥</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {m.status === 'done' ? `Terminé · ${m.score}` : (m.stream ? <span><SocialIcon kind={m.stream} size={10} /> Diffusion {m.stream}</span> : 'À venir')}
                    </div>
                  </div>
                </div>
                {m.status === 'done' ? (
                  <Badge tone="done">{m.score}</Badge>
                ) : (
                  <Btn variant="ghost" size="sm">→</Btn>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ padding: '18px 22px 12px' }}>
            <SectionTitle kicker="DIVISION 1 · CONFÉRENCE OUEST" title="Classement" size="sm" />
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr 40px 40px 40px 40px 60px 120px 50px',
            gap: 8, padding: '8px 22px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
            fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)'
          }}>
            <span>#</span><span>Club</span>
            <span style={{ textAlign: 'center' }}>MJ</span><span style={{ textAlign: 'center' }}>V</span>
            <span style={{ textAlign: 'center' }}>N</span><span style={{ textAlign: 'center' }}>D</span>
            <span style={{ textAlign: 'center' }}>+/–</span><span style={{ textAlign: 'center' }}>Forme</span>
            <span style={{ textAlign: 'right' }}>Pts</span>
          </div>
          {PRO_CLUBS_LEAGUE.standings.map((row, i) => {
            const isProm = row.rank <= PRO_CLUBS_LEAGUE.promotionSlots;
            const isReleg = row.rank > (PRO_CLUBS_LEAGUE.standings.length - PRO_CLUBS_LEAGUE.relegationSlots);
            return (
              <div key={row.tag} style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr 40px 40px 40px 40px 60px 120px 50px',
                gap: 8, padding: '12px 22px', alignItems: 'center',
                borderBottom: i < PRO_CLUBS_LEAGUE.standings.length - 1 ? '1px solid var(--border)' : 'none',
                background: row.mine ? 'rgba(255,59,48,0.05)' : 'transparent',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 3, height: 22, borderRadius: 2,
                    background: isProm ? 'var(--accent)' : isReleg ? '#94a3b8' : 'transparent'
                  }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>{row.rank}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 6, background: row.color, color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10
                  }}>{row.tag}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: row.mine ? 800 : 600, fontSize: 13 }}>
                    {row.club}{row.mine && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>★</span>}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{flag(row.country)}</span>
                </div>
                <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.mp}</span>
                <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{row.w}</span>
                <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{row.d}</span>
                <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{row.l}</span>
                <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <span style={{ color: '#16a34a' }}>+{row.gf - row.ga}</span>
                </span>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {row.form.map((f, fi) => (
                    <span key={fi} style={{
                      width: 14, height: 14, borderRadius: 3, fontSize: 8, fontWeight: 800,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: f === 'W' ? '#16a34a' : f === 'L' ? '#dc2626' : '#facc15',
                      color: f === 'D' ? '#0a0a0a' : '#fff', fontFamily: 'var(--font-mono)'
                    }}>{f}</span>
                  ))}
                </div>
                <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{row.pts}</span>
              </div>
            );
          })}
          <div style={{ padding: '12px 22px', display: 'flex', gap: 16, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent)', marginRight: 4, verticalAlign: 'middle' }}></span> Promotion ({PRO_CLUBS_LEAGUE.promotionSlots})</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#94a3b8', marginRight: 4, verticalAlign: 'middle' }}></span> Relégation ({PRO_CLUBS_LEAGUE.relegationSlots})</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// PLAYER REGISTRATION FLOW — for players joining a club
// ============================================================
function ScreenJoinClub({ density }) {
  const [step, setStep] = React.useState(1);
  const [selectedClub, setSelectedClub] = React.useState(null);

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <SectionTitle kicker="DEVIENS PRO" title="Rejoindre un club esport" size="lg" />

      {/* Steps */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { n: 1, label: 'Profil' },
          { n: 2, label: 'Trouver un club' },
          { n: 3, label: 'Candidater' },
          { n: 4, label: 'Tryout' },
        ].map(s => (
          <div key={s.n} style={{
            flex: 1, padding: 14, borderRadius: 10,
            background: step === s.n ? 'var(--ink)' : 'var(--mute-bg)',
            color: step === s.n ? 'var(--card)' : 'var(--ink)',
            cursor: 'pointer'
          }} onClick={() => setStep(s.n)}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
              Étape {s.n}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Card padding={28}>
        {step === 1 && <JoinStep1 />}
        {step === 2 && <JoinStep2 onPick={(c) => { setSelectedClub(c); setStep(3); }} />}
        {step === 3 && <JoinStep3 club={selectedClub} />}
        {step === 4 && <JoinStep4 />}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={() => setStep(Math.max(1, step - 1))}>← Précédent</Btn>
          {step < 4 && <Btn variant="accent" onClick={() => setStep(Math.min(4, step + 1))}>Continuer →</Btn>}
          {step === 4 && <Btn variant="accent">✓ Soumettre la candidature</Btn>}
        </div>
      </Card>
    </div>
  );
}

function JoinStep1() {
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 1" title="Crée ton profil joueur" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 22, maxWidth: 540 }}>
        Les clubs verront ton profil quand tu candidates. Sois précis sur ton niveau et tes disponibilités.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="Pseudo / handle"><TextInput placeholder="Ton pseudo en jeu" /></FormField>
        <FormField label="Nom complet (privé)"><TextInput placeholder="Visible seulement par le capitaine" /></FormField>
        <FormField label="Âge"><TextInput placeholder="18" /></FormField>
        <FormField label="Pays / région"><TextInput placeholder="🇫🇷 France" /></FormField>
        <FormField label="Poste préféré">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 4 }}>
            {['GK', 'DEF', 'MIL', 'ATT', 'Polyvalent'].map((p, i) => (
              <CardPick key={p} active={i === 3} title={p} sub="" />
            ))}
          </div>
        </FormField>
        <FormField label="Niveau actuel">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 4 }}>
            {['Débutant', 'Confirmé', 'Compétitif', 'Pro/semi-pro'].map((l, i) => (
              <CardPick key={l} active={i === 2} title={l} sub="" />
            ))}
          </div>
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="Disponibilités">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {['Lun soir', 'Mar soir', 'Mer soir', 'Jeu soir', 'Ven soir', 'Sam après-midi', 'Sam soir', 'Dim après-midi', 'Dim soir'].map(s => (
                <Badge key={s} tone="outline">{s}</Badge>
              ))}
            </div>
          </FormField>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="Streams perso ?" sub="Optionnel — utile pour les rôles streamer">
            <TextInput placeholder="twitch.tv/tonpseudo" />
          </FormField>
        </div>
      </div>
    </div>
  );
}

function JoinStep2({ onPick }) {
  const clubs = PRO_CLUBS_LEAGUE.standings.slice(0, 6);
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 2" title="Choisis un club qui recrute" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 22, maxWidth: 540 }}>
        6 clubs en Division 1 cherchent activement de nouveaux joueurs. Filtre par poste, divisons et style.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {clubs.map(c => (
          <div key={c.tag} onClick={() => onPick(c)} style={{
            border: '1px solid var(--border)', borderRadius: 14, padding: 18, cursor: 'pointer',
            background: 'var(--card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 48, height: 48, borderRadius: 12, background: c.color, color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 800
              }}>{c.tag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em' }}>
                  {c.club}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{flag(c.country)} · {c.rank}ᵉ · {c.pts} pts</div>
              </div>
              <Badge tone="success">Recrute</Badge>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Cherche : <strong style={{ color: 'var(--ink)' }}>1 ATT, 1 DEF, 1 streamer</strong>. Essais ouverts jusqu'au 30/06.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JoinStep3({ club }) {
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 3" title={`Candidature à ${club?.club || 'Nova Esports'}`} size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 22, maxWidth: 540 }}>
        Soigne ta lettre — c'est elle que le capitaine lit en premier. Mets en avant ce que tu apportes à l'équipe.
      </p>
      <FormField label="Lettre de motivation" sub="200-400 mots, parle de ton parcours, de ton style de jeu, de tes objectifs.">
        <textarea defaultValue="Salut Nova, j'ai suivi votre saison et votre style 4-2-3-1 me correspond parfaitement. Je joue en Division 2 EU depuis 2 saisons et je cherche un club ambitieux pour franchir un palier. Je suis disponible 4 soirs par semaine + week-ends, et je stream sur Twitch (8K followers)." style={{
          width: '100%', minHeight: 160, padding: 14, borderRadius: 10,
          border: '1px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit',
          fontSize: 14, lineHeight: 1.5, resize: 'vertical', outline: 'none'
        }} />
      </FormField>
      <div style={{ marginTop: 16 }}>
        <FormField label="Quelqu'un peut-il te recommander ?" sub="Optionnel — accélère la décision.">
          <TextInput placeholder="Yu7o, Mira…" />
        </FormField>
      </div>
      <div style={{ marginTop: 16 }}>
        <FormField label="Liens vidéo / VOD" sub="3 max — replays ou highlights.">
          <TextInput placeholder="twitch.tv/clip/... · youtube.com/..." />
        </FormField>
      </div>
    </div>
  );
}

function JoinStep4() {
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 4" title="Disponibilités pour un essai" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 22, maxWidth: 540 }}>
        Si retenu, le capitaine organisera un match d'essai. Indique tes créneaux et le délai d'attente acceptable.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="Préférence de date"><TextInput placeholder="Cette semaine" /></FormField>
        <FormField label="Plage horaire"><TextInput placeholder="19h-23h CEST" /></FormField>
      </div>
      <div style={{ marginTop: 16 }}>
        <FormField label="Engagement minimum" sub="Combien d'heures par semaine tu peux donner au club.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 4 }}>
            {['5-8h', '8-12h', '12-20h', '20h+'].map((l, i) => (
              <CardPick key={l} active={i === 1} title={l} sub="" />
            ))}
          </div>
        </FormField>
      </div>
      <div style={{ marginTop: 22, padding: 18, background: 'var(--mute-bg)', borderRadius: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>📋 Récapitulatif</div>
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Ta candidature sera envoyée au capitaine et au manager. Réponse moyenne : <strong style={{ color: 'var(--ink)' }}>3 jours</strong>.
          Tu seras notifié par mail et sur Discord.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenClub, ScreenJoinClub });
