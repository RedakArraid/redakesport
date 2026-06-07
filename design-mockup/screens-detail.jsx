// screens-detail.jsx — Match, Player, Event, Media

// =============================================================
// MATCH PAGE — live, with stream embed mock, score, events, stats, media
// =============================================================
function ScreenMatch({ density }) {
  const M = LIVE_MATCH;
  const a = teamById(M.a), b = teamById(M.b);
  const [tab, setTab] = React.useState('summary');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* HEADER */}
      <div style={{
        background: 'var(--ink)', color: 'var(--card)', borderRadius: 20, padding: 28,
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0, background:
            `linear-gradient(90deg, ${a.color}15 0%, transparent 30%, transparent 70%, ${b.color}15 100%)`
        }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge tone="live">● LIVE</Badge>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>
              {M.round}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 12, fontFamily: 'var(--font-mono)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span>👁 {M.viewers.toLocaleString('fr-FR')}</span>
            <span>🎙 Caster Sasha M.</span>
            <span>📍 La Défense Arena</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 24 }}>
          {/* Team A */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <TeamMark team={a} size={84} />
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.6, letterSpacing: '0.1em' }}>HOME · BR</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {a.name}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
                Ravi · Tico · Mu7 · Dani
              </div>
            </div>
          </div>
          {/* Score */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 100,
              letterSpacing: '-0.06em', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 18
            }}>
              <span>{M.sa}</span>
              <span style={{ color: 'var(--accent)', fontSize: 60 }}>:</span>
              <span>{M.sb}</span>
            </div>
            <div style={{ marginTop: 8, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
              ● {M.minute} · {M.period}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.5 }}>{M.bestOf}</div>
          </div>
          {/* Team B */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexDirection: 'row-reverse', textAlign: 'right' }}>
            <TeamMark team={b} size={84} />
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.6, letterSpacing: '0.1em' }}>AWAY · KR</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {b.name}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
                Jin · Hye · Min · Doh
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 22 }}>
        {/* LEFT — stream + tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Stream embed */}
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ position: 'relative' }}>
              <MediaPlaceholder label="STREAM TWITCH — REDAK_OFFICIAL" tone="dark" height={420} rounded={0} type="video" />
              <div style={{
                position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6
              }}>
                <Badge tone="live">● LIVE</Badge>
                <Badge solid tone="accent"><SocialIcon kind="twitch" size={12} /> TWITCH</Badge>
              </div>
              <div style={{
                position: 'absolute', bottom: 14, left: 14, right: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'
              }}>
                <div style={{ color: '#fff' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>EMBER vs HIVEMIND · QF4</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>1080p60 · français</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn size="sm" variant="accent" icon={<SocialIcon kind="twitch" size={12} />}>Twitch</Btn>
                  <Btn size="sm" variant="ghost" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }} icon={<SocialIcon kind="youtube" size={12} />}>YT</Btn>
                  <Btn size="sm" variant="ghost" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }} icon={<SocialIcon kind="kick" size={12} />}>Kick</Btn>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {[['summary', 'Résumé'], ['events', 'Faits de match'], ['stats', 'Statistiques'], ['lineups', 'Compositions']].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  flex: 1, padding: '14px 0', border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                  color: tab === k ? 'var(--ink)' : 'var(--muted)',
                  borderBottom: tab === k ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1
                }}>{l}</button>
              ))}
            </div>
            <div style={{ padding: 22 }}>
              {tab === 'summary' && <MatchSummaryTab />}
              {tab === 'events' && <MatchEventsTab />}
              {tab === 'stats' && <MatchStatsTab />}
              {tab === 'lineups' && <MatchLineupsTab />}
            </div>
          </Card>

          {/* Media gallery for this match */}
          <Card>
            <SectionTitle kicker="MÉDIAS DU MATCH" title="Photos, clips & highlights" size="sm"
              action={<Btn variant="ghost" size="sm">Galerie complète →</Btn>}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {LIVE_MATCH.media.map((m, i) => (
                <div key={i}>
                  <MediaPlaceholder label={m.label} tone={m.tone} type={m.type} duration={m.duration} aspect="4/3" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT — chat + share + related */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Share / social */}
          <Card>
            <SectionTitle kicker="DIFFUSION" title="Suivez le match" size="sm" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SocialLink kind="twitch" name="redak_official" sub="LIVE · 24K viewers" highlight />
              <SocialLink kind="youtube" name="@RedakEsports" sub="LIVE · 8.2K viewers" />
              <SocialLink kind="kick" name="redak" sub="LIVE · 2.1K viewers" />
              <SocialLink kind="discord" name="discord.gg/redak" sub="3 247 membres en ligne" />
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                Partager le match
              </div>
              <SocialBar items={[
                { kind: 'x' }, { kind: 'facebook' }, { kind: 'instagram' },
                { kind: 'tiktok' }, { kind: 'snapchat' }
              ]} />
            </div>
          </Card>

          {/* Live chat preview */}
          <Card padding={0}>
            <div style={{ padding: 18, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>Live chat</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>Discord · #qf4-match</div>
              </div>
              <Badge tone="success">3 247 ●</Badge>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
              {LIVE_CHAT.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14, background: c.color,
                    color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 800, flexShrink: 0
                  }}>{c.user[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.user} <span style={{ color: 'var(--muted)', fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{c.time}</span></div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{c.msg}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
              <input placeholder="Envoyer un message…" style={{
                width: '100%', padding: '10px 14px', borderRadius: 999,
                border: '1px solid var(--border)', background: 'var(--mute-bg)',
                fontSize: 13, outline: 'none'
              }} />
            </div>
          </Card>

          <Card>
            <SectionTitle kicker="ENSUITE" title="Prochains matchs" size="sm" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CALENDAR.filter(m => m.status === 'upcoming').slice(0, 3).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 56 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>{m.time}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{m.date.slice(5).replace('-', '/')}</div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    {m.a ? <TeamMark team={teamById(m.a)} size={20} /> : <TeamMark team={null} size={20} />}
                    <span style={{ fontWeight: 700 }}>{m.a ? teamById(m.a).tag : '?'}</span>
                    <span style={{ color: 'var(--muted)' }}>vs</span>
                    {m.b ? <TeamMark team={teamById(m.b)} size={20} /> : <TeamMark team={null} size={20} />}
                    <span style={{ fontWeight: 700 }}>{m.b ? teamById(m.b).tag : '?'}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{m.round}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const LIVE_CHAT = [
  { user: 'Maxou_GG', color: '#ff3b30', time: '21:42', msg: 'Quel PEN de Mu7 🔥 🔥 🔥' },
  { user: 'KryptonFC', color: '#2547ff', time: '21:43', msg: 'Ember mérite vraiment cette demi finale' },
  { user: 'Sasha_caster', color: '#a855f7', time: '21:43', msg: 'On entre dans les 10 dernières minutes, prolongations possibles' },
  { user: 'Nova_fan', color: '#16a34a', time: '21:44', msg: 'Hivemind a craqué après le but de Dani' },
  { user: 'Pixel_42', color: '#f59e0b', time: '21:44', msg: 'Le replay du 64\' svp 🙏' },
  { user: 'Redak_Bot', color: '#0a0a0a', time: '21:45', msg: 'Sondage : qui va gagner ? 🟥 EMBER · 🟨 HIVEMIND' },
  { user: 'Lyra_TV', color: '#ec4899', time: '21:45', msg: 'EMBER c\'est le destin' },
  { user: 'Win_TH', color: '#22d3ee', time: '21:46', msg: 'Hivemind reviens stp' },
];

function SocialLink({ kind, name, sub, highlight }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 10,
      background: highlight ? 'var(--mute-bg)' : 'transparent',
      border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 10
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 18, background: 'var(--ink)', color: 'var(--card)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <SocialIcon kind={kind} size={18} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{sub}</div>
      </div>
      <Btn size="sm" variant="ghost">→</Btn>
    </div>
  );
}

function MatchSummaryTab() {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Résumé éditorial · 78ᵉ minute
      </div>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--ink)' }}>
        {LIVE_MATCH.summary}
      </p>
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <SmallStat label="Joueur du match" value="Dani" sub="1 but, 1 passe décisive" tone="red" />
        <SmallStat label="Buts attendus (xG)" value="2.41 : 1.87" sub="Ember domine offensivement" />
        <SmallStat label="Pression" value="HIGH" sub="Possession 60% sur 10' derniers" tone="blue" />
      </div>
    </div>
  );
}

function SmallStat({ label, value, sub, tone }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12, background: 'var(--mute-bg)'
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em',
        color: tone === 'red' ? 'var(--accent)' : tone === 'blue' ? 'var(--blue)' : 'var(--ink)'
      }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function MatchEventsTab() {
  const eventIcon = {
    goal: { glyph: '⚽', bg: '#16a34a' },
    yellow: { glyph: '■', bg: '#facc15' },
    sub: { glyph: '⇄', bg: '#0ea5e9' },
    now: { glyph: '●', bg: 'var(--accent)' },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {LIVE_MATCH.events.slice().reverse().map((e, i) => {
        const t = e.team ? teamById(e.team) : null;
        const ic = eventIcon[e.type];
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '50px 32px 1fr auto',
            alignItems: 'center', gap: 12, padding: '12px 0',
            borderBottom: i < LIVE_MATCH.events.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{e.min}</div>
            <span style={{
              width: 28, height: 28, borderRadius: 14, background: ic.bg, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14
            }}>{ic.glyph}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{e.player || (e.type === 'now' ? 'Phase actuelle' : '')}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.detail}</div>
            </div>
            {t && <TeamMark team={t} size={26} />}
          </div>
        );
      })}
    </div>
  );
}

function MatchStatsTab() {
  const s = LIVE_MATCH.stats;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StatBar label="Possession" a={s.possession[0]} b={s.possession[1]} unit="%" isPercent />
      <StatBar label="Tirs" a={s.shots[0]} b={s.shots[1]} />
      <StatBar label="Tirs cadrés" a={s.shotsOnTarget[0]} b={s.shotsOnTarget[1]} />
      <StatBar label="Corners" a={s.corners[0]} b={s.corners[1]} />
      <StatBar label="Fautes" a={s.fouls[0]} b={s.fouls[1]} />
      <StatBar label="Passes" a={s.passes[0]} b={s.passes[1]} />
      <StatBar label="Précision passes" a={s.passAccuracy[0]} b={s.passAccuracy[1]} unit="%" isPercent />
    </div>
  );
}

function MatchLineupsTab() {
  const a = teamById(LIVE_MATCH.a), b = teamById(LIVE_MATCH.b);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {[a, b].map((t, i) => (
        <div key={t.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <TeamMark team={t} size={32} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{t.name}</div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Formation 4-2-3-1</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {t.players.map((p, pi) => (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, background: 'var(--mute-bg)'
              }}>
                <span style={{ width: 24, height: 24, borderRadius: 12, background: t.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{pi + 1}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>{p}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{['ATT', 'MIL', 'DEF', 'GK'][pi]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================
// PLAYER PROFILE
// =============================================================
function ScreenPlayer({ density }) {
  const P = PLAYER;
  const t = teamById(P.team);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* HERO */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24,
        background: `linear-gradient(135deg, ${t.color} 0%, var(--ink) 100%)`,
        color: '#fff', padding: 32
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 28, alignItems: 'center' }}>
          <div style={{
            width: 160, height: 160, borderRadius: '50%', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 64,
            color: t.color, letterSpacing: '-0.04em', border: '4px solid rgba(255,255,255,0.4)'
          }}>{P.handle[0]}</div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>
              {flag(P.country)} {P.country} · {P.age} ans · {P.role}
            </div>
            <h1 style={{
              margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 64, letterSpacing: '-0.04em', lineHeight: 0.95
            }}>{P.handle}</h1>
            <div style={{ fontSize: 16, opacity: 0.8, marginTop: 6 }}>{P.realName} · {t.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge solid tone="accent" style={{ marginBottom: 12 }}>CAPITAINE</Badge>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 90,
              letterSpacing: '-0.05em', lineHeight: 1
            }}>#01</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ranking EU</div>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        <StatTile label="Matchs" value={P.stats.matches} />
        <StatTile label="Victoires" value={P.stats.wins} sub={`${P.stats.winRate}% de réussite`} accent />
        <StatTile label="Buts/match" value={P.stats.goalsPerGame} />
        <StatTile label="MVP" value={P.stats.mvp} sub="cette saison" />
        <StatTile label="Trophées" value={P.stats.trophies} sub="majeurs" />
        <StatTile label="Série actuelle" value={`${P.stats.currentStreak}W`} sub="invaincu" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Card>
            <SectionTitle kicker="BIO" title="À propos" size="sm" />
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--ink)' }}>{P.bio}</p>
          </Card>

          <Card>
            <SectionTitle kicker="DERNIERS MATCHS" title="Forme actuelle" size="sm" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {P.recent.map((r, i) => {
                const opp = teamById(r.opp);
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '60px 60px 1fr 100px 60px',
                    alignItems: 'center', gap: 12, padding: '14px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)'
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{r.date}</div>
                    <span style={{
                      width: 32, height: 32, borderRadius: 16,
                      background: r.result === 'W' ? '#16a34a' : r.result === 'L' ? '#dc2626' : '#facc15',
                      color: r.result === 'D' ? '#0a0a0a' : '#fff',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontWeight: 800
                    }}>{r.result}</span>
                    <TeamRow team={opp} size={28} showCountry={false} />
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{r.score}</span>
                    <Btn size="sm" variant="ghost">→</Btn>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionTitle kicker="MOMENTS CLÉS" title="Highlights vidéo" size="sm"
              action={<Btn variant="ghost" size="sm">Tout voir →</Btn>}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <MediaPlaceholder label="Triplé vs Kraken" type="video" tone="red" duration="2:18" aspect="16/10" />
              <MediaPlaceholder label="Solo run – Pro League S5" type="video" tone="blue" duration="0:42" aspect="16/10" />
              <MediaPlaceholder label="Cérémonie Paris Open 2024" type="photo" tone="cream" aspect="16/10" />
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Card>
            <SectionTitle kicker="RÉSEAUX SOCIAUX" title="Suivre Le0n" size="sm" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SocialLink kind="twitch" name={P.socials.twitch} sub="142K followers" highlight />
              <SocialLink kind="youtube" name={P.socials.youtube} sub="89K abonnés" />
              <SocialLink kind="x" name={P.socials.x} sub="52K followers" />
              <SocialLink kind="instagram" name={P.socials.instagram} sub="68K followers" />
              <SocialLink kind="tiktok" name={P.socials.tiktok} sub="124K followers" />
              <SocialLink kind="discord" name={P.socials.discord} sub="Serveur privé" />
            </div>
          </Card>

          <Card>
            <SectionTitle kicker="PALMARÈS" title="Trophées" size="sm" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {P.trophies.map((tr, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '50px 40px 1fr auto',
                  alignItems: 'center', gap: 10,
                  padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)'
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{tr.year}</span>
                  <span style={{
                    width: 32, height: 32, borderRadius: 16,
                    background: tr.place === 1 ? 'var(--accent)' : 'var(--mute-bg)',
                    color: tr.place === 1 ? '#fff' : 'var(--ink)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontFamily: 'var(--font-display)'
                  }}>{tr.place}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{tr.name}</span>
                  <span style={{ fontSize: 18 }}>{tr.place === 1 ? '🏆' : '🥈'}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle kicker="ÉQUIPE" title="Coéquipiers" size="sm" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {t.players.map((p, i) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, background: i === 0 ? 'var(--mute-bg)' : 'transparent' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 18, background: t.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{p[0]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p}{i === 0 && <span style={{ color: 'var(--accent)', marginLeft: 6, fontSize: 11 }}>★ C</span>}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{['Attaquant · Capitaine', 'Milieu offensif', 'Défenseur central', 'Gardien'][i]}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// EVENT / PUBLIC PAGE (registration + sponsors)
// =============================================================
function ScreenEvent({ density }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* HERO */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24,
        background: 'linear-gradient(135deg, #ff3b30 0%, #c41e10 50%, #1a1a1a 100%)',
        color: '#fff', padding: 0, minHeight: 480
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 28px)'
        }} />
        <div style={{ position: 'relative', padding: 40, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, height: '100%' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <Badge tone="live">● Inscriptions ouvertes</Badge>
              <Badge tone="outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>EA FC 26</Badge>
              <Badge tone="outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>PS5 · Xbox · PC</Badge>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 12 }}>
              REDAK ESPORTS · SPRING MAJOR
            </div>
            <h1 style={{
              margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 'clamp(56px, 7vw, 96px)', letterSpacing: '-0.05em', lineHeight: 0.9
            }}>
              REDAK<br />CUP<br />
              <span style={{ background: '#fff', color: 'var(--accent)', padding: '0 16px', display: 'inline-block', marginTop: 6 }}>2026</span>
            </h1>
            <p style={{ marginTop: 24, fontSize: 17, lineHeight: 1.5, opacity: 0.9, maxWidth: 460 }}>
              16 équipes. 14 jours. 50 000 € à la clé.<br />
              Paris La Défense Arena & online — diffusion live multi-plateforme.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Btn variant="accent" size="lg" style={{ background: '#fff', color: 'var(--accent)' }}>Inscrire mon équipe →</Btn>
              <Btn variant="ghost" size="lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>Règlement</Btn>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: 24,
            border: '1px solid rgba(255,255,255,0.15)', alignSelf: 'center'
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 18 }}>
              Compte à rebours · début du tournoi
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
              {[['00', 'Jours'], ['00', 'Heures'], ['00', 'Min'], ['00', 'Sec']].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 56, letterSpacing: '-0.05em', lineHeight: 1 }}>{n}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 20, paddingTop: 20, fontSize: 13 }}>
              <Row label="Dates" value="01 → 14 juin 2026" />
              <Row label="Format" value="Poules + KO 16 équipes" />
              <Row label="Inscription" value="GRATUITE · 0/16 places" />
              <Row label="Date limite" value="28/05/2026 — 23h59" />
            </div>
          </div>
        </div>
      </div>

      {/* Sponsors */}
      <Card>
        <SectionTitle kicker="PARTENAIRES OFFICIELS" title="Soutenu par les meilleurs de l'industrie" size="md" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {TOURNAMENT.sponsors.map(s => (
            <div key={s} style={{
              border: '1px solid var(--border)', borderRadius: 12, padding: '24px 12px',
              textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
              color: 'var(--ink)', letterSpacing: '0.04em', minHeight: 80
            }}>{s.toUpperCase()}</div>
          ))}
        </div>
      </Card>

      {/* Format & rewards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22 }}>
        <Card>
          <SectionTitle kicker="FORMAT" title="Comment ça se passe" size="md" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { n: 1, title: 'Phase de poules', sub: '4 groupes de 4 équipes · matchs aller simple · top 2 qualifiés' },
              { n: 2, title: 'Quarts de finale', sub: 'BO3 — élimination directe · 8 équipes' },
              { n: 3, title: 'Demi-finales', sub: 'BO5 — diffusées live · La Défense Arena' },
              { n: 4, title: 'Finale', sub: 'BO7 — 14/06 à 20h · cérémonie + remise de trophée' },
            ].map(p => (
              <div key={p.n} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 14, padding: 14, borderRadius: 12, background: 'var(--mute-bg)' }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 18, background: 'var(--accent)', color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800
                }}>{p.n}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="DOTATION" title="50 000 € à partager" size="md" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { p: 1, amount: '25 000 €', label: '🏆 Vainqueur' },
              { p: 2, amount: '12 500 €', label: '🥈 Finaliste' },
              { p: 3, amount: '6 250 €', label: '🥉 Demi-finalistes' },
              { p: 5, amount: '1 500 €', label: 'Quarts de finale' },
              { p: 9, amount: '500 €', label: 'MVP du tournoi' },
            ].map(p => (
              <div key={p.p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, background: p.p === 1 ? 'var(--ink)' : 'var(--mute-bg)', color: p.p === 1 ? 'var(--card)' : 'var(--ink)' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: p.p === 1 ? 'var(--accent)' : 'var(--ink)' }}>{p.amount}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle kicker="RÉSEAUX OFFICIELS" title="Suivez Redak Esports" size="md" />
        <SocialBar size="lg" items={[
          { kind: 'twitch' }, { kind: 'youtube' }, { kind: 'kick' }, { kind: 'discord' },
          { kind: 'x' }, { kind: 'instagram' }, { kind: 'tiktok' }, { kind: 'facebook' }, { kind: 'snapchat' }
        ]} />
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', opacity: 0.9 }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// =============================================================
// MEDIA LIBRARY
// =============================================================
function ScreenMedia({ density }) {
  const [filter, setFilter] = React.useState('all');
  const items = MEDIA_LIBRARY.filter(m => filter === 'all' || m.kind === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
        <SectionTitle kicker="MÉDIATHÈQUE" title="Photos, vidéos & highlights" size="lg" />
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'Tout'], ['photo', 'Photos'], ['video', 'Vidéos']].map(([k, l]) => (
            <Btn key={k} size="sm" variant={filter === k ? 'primary' : 'ghost'} onClick={() => setFilter(k)}>{l}</Btn>
          ))}
        </div>
      </div>

      {/* Featured row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
        <MediaCard m={items[1]} large />
        <MediaCard m={items[0]} />
        <MediaCard m={items[4]} />
      </div>

      {/* Masonry grid */}
      <div style={{
        columnCount: 4, columnGap: 14, columnFill: 'balance'
      }}>
        {items.slice(2).map(m => (
          <div key={m.id} style={{ marginBottom: 14, breakInside: 'avoid' }}>
            <MediaCard m={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaCard({ m, large }) {
  const heights = { tall: 320, wide: 200, square: 240 };
  const h = large ? 460 : heights[m.size] || 220;
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--border)' }}>
      <MediaPlaceholder label={m.title} tone={m.tone} type={m.kind} duration={m.duration} height={h} rounded={0} />
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.match}</div>
          </div>
          <Badge tone={m.kind === 'video' ? 'accent' : 'outline'}>{m.kind === 'video' ? '▶ VIDÉO' : '◳ PHOTO'}</Badge>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenMatch, ScreenPlayer, ScreenEvent, ScreenMedia });
