// screens-overview.jsx — Dashboard, Calendar, Wizard

// =============================================================
// DASHBOARD
// =============================================================
function ScreenDashboard({ density, navTo, isAdmin }) {
  const pad = density === 'compact' ? 14 : 22;
  const gap = density === 'compact' ? 14 : 22;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {/* HERO — tournament summary */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24,
        background: 'var(--ink)', color: 'var(--card)', padding: pad + 12,
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28
      }}>
        <div style={{
          position: 'absolute', right: -80, top: -80, width: 320, height: 320,
          background: 'var(--accent)', borderRadius: '50%', opacity: 0.18, filter: 'blur(20px)'
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Badge tone="live">● Live</Badge>
            <Badge tone="outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--card)' }}>
              <GameIcon game="EA FC 26" size={14} /> EA FC 26
            </Badge>
            <Badge tone="outline">Spring Major</Badge>
          </div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '-0.04em', lineHeight: 0.95
          }}>
            Redak Cup<br />
            <span style={{ color: 'var(--accent)' }}>2026.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, maxWidth: 460, marginTop: 14, lineHeight: 1.5 }}>
            16 équipes · format coupe avec phase de poules puis élimination directe. Diffusion live multi-plateforme, 47 matchs sur 14 jours.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <Btn variant="accent" onClick={() => navTo('match')}>Voir le match live</Btn>
            <Btn variant="ghost" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'var(--card)' }} onClick={() => navTo('bracket')}>Bracket complet</Btn>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>
          <MiniStat label="Dotation" value="50K€" />
          <MiniStat label="Équipes" value="16" />
          <MiniStat label="Matchs joués" value="38/47" />
          <MiniStat label="Spectateurs pic" value="62K" />
          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14, marginTop: 6 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Diffusé sur</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['twitch', 'youtube', 'kick', 'discord', 'x', 'instagram', 'tiktok', 'facebook'].map(k => (
                <span key={k} style={{
                  width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.08)',
                  color: 'var(--card)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <SocialIcon kind={k} size={15} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK NAV */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap }}>
        <QuickAction label="Match LIVE" sub="QF4 · Ember vs Hivemind" tone="live" onClick={() => navTo('match')} />
        <QuickAction label="Bracket" sub="Quart → Finale" onClick={() => navTo('bracket')} />
        <QuickAction label="Classement" sub="Pro League S5" onClick={() => navTo('standings')} />
        <QuickAction label="Calendrier" sub="9 matchs restants" onClick={() => navTo('calendar')} />
      </div>

      {/* MAIN 2-COL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>
          {/* Live now card */}
          <Card padding={0}>
            <div style={{ padding: pad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <SectionTitle kicker="EN DIRECT" title="QF4 · Match en cours" size="sm" />
              <Btn variant="ghost" size="sm" onClick={() => navTo('match')}>Page match →</Btn>
            </div>
            <div style={{ padding: pad, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <TeamMark team={teamById('t3')} size={56} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>{teamById('t3').name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>Ember Collective · BR</div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <ScoreBig a={2} b={2} size={56} />
                <div style={{
                  marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 12,
                  letterSpacing: '0.06em', color: 'var(--accent)', textTransform: 'uppercase'
                }}>● Live 78' · 2e MT</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>{teamById('t6').name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>Hivemind · KR</div>
                </div>
                <TeamMark team={teamById('t6')} size={56} />
              </div>
            </div>
            <div style={{ padding: pad, paddingTop: 0, display: 'flex', gap: 18, color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>👁 24 187 viewers</span>
              <span>🎙 Caster · Sasha M.</span>
              <span>📍 La Défense Arena</span>
            </div>
          </Card>

          {/* Bracket preview */}
          <Card>
            <SectionTitle kicker="PHASE FINALE" title="Aperçu du bracket"
              action={<Btn variant="ghost" size="sm" onClick={() => navTo('bracket')}>Vue complète →</Btn>}
            />
            <BracketMini />
          </Card>

          {/* Recent results */}
          <Card>
            <SectionTitle kicker="RÉSULTATS RÉCENTS" title="Derniers matchs"
              action={<Btn variant="ghost" size="sm" onClick={() => navTo('calendar')}>Tous →</Btn>}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {CALENDAR.filter(m => m.status === 'done').slice(0, 4).map((m, i, arr) => (
                <div key={m.id} style={{
                  display: 'grid', gridTemplateColumns: '90px 1fr auto 1fr 90px',
                  alignItems: 'center', gap: 12,
                  padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)'
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    {m.round}
                  </div>
                  <TeamRow team={teamById(m.a)} size={28} showCountry={false} />
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, textAlign: 'center', minWidth: 70 }}>
                    {m.sa} <span style={{ color: 'var(--muted)' }}>–</span> {m.sb}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <TeamRow team={teamById(m.b)} size={28} showCountry={false} />
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                    {m.date.slice(5).replace('-', '/')}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>
          {isAdmin && (
            <Card style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8 }}>
                Mode admin
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', marginTop: 4, marginBottom: 12 }}>
                3 actions en attente
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AdminAction label="Valider score QF3" />
                <AdminAction label="Approuver replay QF2" />
                <AdminAction label="Confirmer caster finale" />
              </div>
            </Card>
          )}

          {/* Top teams */}
          <Card>
            <SectionTitle kicker="LEADERBOARD" title="Top équipes"
              action={<Btn variant="ghost" size="sm" onClick={() => navTo('standings')}>Tout →</Btn>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STANDINGS.slice(0, 5).map((row) => {
                const t = teamById(row.team);
                return (
                  <div key={row.team} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16,
                      color: row.rank <= 3 ? 'var(--accent)' : 'var(--muted)'
                    }}>{row.rank}</span>
                    <TeamRow team={t} size={28} showCountry={false} showRecord />
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{row.pts} pts</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Sponsors */}
          <Card>
            <SectionTitle kicker="PARTENAIRES" title="Sponsors officiels" size="sm" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {TOURNAMENT.sponsors.map(s => (
                <div key={s} style={{
                  border: '1px solid var(--border)', borderRadius: 10, padding: '14px 8px',
                  textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em'
                }}>{s.toUpperCase()}</div>
              ))}
            </div>
          </Card>

          {/* Social */}
          <Card>
            <SectionTitle kicker="SOCIAL" title="Suivre le tournoi" size="sm" />
            <SocialBar items={[
              { kind: 'twitch' }, { kind: 'youtube' }, { kind: 'discord' },
              { kind: 'x' }, { kind: 'instagram' }, { kind: 'tiktok' }, { kind: 'facebook' }, { kind: 'snapchat' }
            ]} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function QuickAction({ label, sub, tone, onClick }) {
  return (
    <Card onClick={onClick} style={{
      cursor: 'pointer',
      borderColor: tone === 'live' ? 'var(--accent)' : 'var(--border)',
      transition: 'transform 0.15s'
    }} padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {tone === 'live' ? <Badge tone="live">● LIVE</Badge> : <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>}
        <span style={{ color: 'var(--muted)' }}>→</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: tone === 'live' ? 18 : 20, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
        {tone === 'live' ? sub : label}
      </div>
      {tone !== 'live' && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function AdminAction({ label }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600
    }}>
      <span>{label}</span>
      <span style={{
        background: '#fff', color: 'var(--accent)', borderRadius: 999, padding: '3px 10px',
        fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.04em', textTransform: 'uppercase'
      }}>Réviser</span>
    </div>
  );
}

function BracketMini() {
  const lineColor = 'var(--border)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
      {BRACKET_SE.rounds.map((round, ri) => (
        <div key={ri} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 14, minHeight: 200 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {round.name}
          </div>
          {round.matches.map((m) => (
            <div key={m.id} style={{
              border: `1px solid ${m.status === 'live' ? 'var(--accent)' : lineColor}`,
              borderRadius: 10, padding: 8, background: 'var(--card)',
              ...(m.status === 'live' ? { boxShadow: '0 0 0 3px rgba(255,59,48,0.1)' } : {})
            }}>
              <BracketMiniSide team={teamById(m.a)} score={m.sa} winner={m.sa > m.sb} />
              <div style={{ height: 1, background: lineColor, margin: '4px 0' }} />
              <BracketMiniSide team={teamById(m.b)} score={m.sb} winner={m.sb > m.sa} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
function BracketMiniSide({ team, score, winner }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between',
      opacity: score == null ? 0.55 : 1
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {team ? <TeamMark team={team} size={20} /> : <TeamMark team={null} size={20} />}
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: winner ? 800 : 600, fontSize: 12,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>{team ? team.tag : '—'}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{score ?? '–'}</span>
    </div>
  );
}

// =============================================================
// CALENDAR
// =============================================================
function ScreenCalendar({ density }) {
  const [filter, setFilter] = React.useState('all');
  const items = CALENDAR.filter(m => filter === 'all' || m.status === filter)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // Group by date
  const byDate = items.reduce((acc, m) => {
    (acc[m.date] = acc[m.date] || []).push(m);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <SectionTitle kicker="PROGRAMME" title="Calendrier des rencontres" size="lg" />
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'Tous'], ['upcoming', 'À venir'], ['live', 'Live'], ['done', 'Terminés']].map(([k, l]) => (
            <Btn key={k} size="sm" variant={filter === k ? 'primary' : 'ghost'} onClick={() => setFilter(k)}>{l}</Btn>
          ))}
        </div>
      </div>

      {Object.entries(byDate).map(([date, matches]) => {
        const d = new Date(date);
        const dayNum = d.getDate();
        const day = d.toLocaleDateString('fr-FR', { weekday: 'long' });
        const month = d.toLocaleDateString('fr-FR', { month: 'long' });
        return (
          <div key={date} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24 }}>
            <div style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 56, letterSpacing: '-0.04em', lineHeight: 0.9, color: 'var(--accent)' }}>
                {String(dayNum).padStart(2, '0')}
              </div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {day} · {month}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{matches.length} match{matches.length > 1 ? 's' : ''}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {matches.map(m => <CalendarRow key={m.id} match={m} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarRow({ match }) {
  const a = teamById(match.a), b = teamById(match.b);
  return (
    <Card padding={16} style={{
      borderColor: match.status === 'live' ? 'var(--accent)' : 'var(--border)',
      ...(match.status === 'live' ? { boxShadow: '0 0 0 3px rgba(255,59,48,0.08)' } : {})
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto 1fr 110px', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>{match.time}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{match.round}</div>
        </div>
        <TeamRow team={a} size={36} />
        <div style={{ minWidth: 90, textAlign: 'center' }}>
          {match.status === 'done' && <ScoreBig a={match.sa} b={match.sb} size={28} />}
          {match.status === 'live' && (
            <div>
              <ScoreBig a={match.sa} b={match.sb} size={28} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em', marginTop: 2 }}>● LIVE</div>
            </div>
          )}
          {match.status === 'upcoming' && (
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--muted)', letterSpacing: '0.04em' }}>VS</div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <TeamRow team={b} size={36} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          {match.stream && <span style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--mute-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><SocialIcon kind={match.stream} size={14} /></span>}
          <StatusPill status={match.status} />
        </div>
      </div>
    </Card>
  );
}

// =============================================================
// WIZARD — Création de tournoi (multi-step)
// =============================================================
function ScreenWizard() {
  const [step, setStep] = React.useState(1);
  const steps = [
    { n: 1, label: 'Identité' },
    { n: 2, label: 'Format' },
    { n: 3, label: 'Participants' },
    { n: 4, label: 'Calendrier' },
    { n: 5, label: 'Diffusion' },
    { n: 6, label: 'Publication' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 28 }}>
      <div>
        <SectionTitle kicker="WIZARD" title="Nouveau tournoi" size="md" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.map(s => (
            <div key={s.n} onClick={() => setStep(s.n)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              borderRadius: 10, cursor: 'pointer',
              background: step === s.n ? 'var(--ink)' : 'transparent',
              color: step === s.n ? 'var(--card)' : 'var(--ink)'
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 12,
                background: step === s.n ? 'var(--accent)' : (s.n < step ? 'var(--ink)' : 'var(--mute-bg)'),
                color: step === s.n || s.n < step ? '#fff' : 'var(--muted)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700
              }}>{s.n < step ? '✓' : s.n}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, padding: 14, background: 'var(--mute-bg)', borderRadius: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          💡 Vos modifications sont sauvegardées automatiquement. Vous pourrez publier ou enregistrer en brouillon à la dernière étape.
        </div>
      </div>

      <Card padding={32}>
        {step === 1 && <WizardStep1 />}
        {step === 2 && <WizardStep2 />}
        {step === 3 && <WizardStep3 />}
        {step === 4 && <WizardStep4 />}
        {step === 5 && <WizardStep5 />}
        {step === 6 && <WizardStep6 />}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={() => setStep(Math.max(1, step - 1))}>← Précédent</Btn>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="soft">Enregistrer brouillon</Btn>
            {step < 6
              ? <Btn variant="accent" onClick={() => setStep(Math.min(6, step + 1))}>Continuer →</Btn>
              : <Btn variant="accent">Publier le tournoi 🚀</Btn>
            }
          </div>
        </div>
      </Card>
    </div>
  );
}

function FormField({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{label}</label>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>}
      {children}
    </div>
  );
}
function TextInput({ value, placeholder }) {
  return <input defaultValue={value} placeholder={placeholder} style={{
    border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px',
    fontSize: 14, fontFamily: 'inherit', background: 'var(--card)', color: 'var(--ink)', outline: 'none', width: '100%'
  }} />;
}
function CardPick({ title, sub, active, icon, onClick }) {
  return (
    <div onClick={onClick} style={{
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'rgba(255,59,48,0.05)' : 'var(--card)',
      borderRadius: 12, padding: 14, cursor: 'pointer',
      boxShadow: active ? '0 0 0 2px rgba(255,59,48,0.15)' : 'none'
    }}>
      {icon && <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

function WizardStep1() {
  const [visibility, setVisibility] = React.useState('public');
  const [scoreEntry, setScoreEntry] = React.useState('players');
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 1 / 6" title="Identité du tournoi" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 24, maxWidth: 520 }}>
        Le nom, le jeu et la dotation apparaîtront partout — bracket, page publique, embeds de diffusion. Choisissez avec soin.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="Nom du tournoi"><TextInput value="Redak Cup 2026" /></FormField>
        <FormField label="Sous-titre / édition"><TextInput value="Spring Major" /></FormField>
        <FormField label="Dotation totale (€)"><TextInput value="50000" /></FormField>
        <FormField label="Lieu / mode"><TextInput value="Paris La Défense Arena + Online" /></FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="Jeu" sub="Le jeu détermine les règles et formats disponibles.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 4 }}>
              <CardPick active title="EA FC 26" sub="Football · 1v1" icon="⚽" />
              <CardPick title="Call of Duty" sub="FPS · 4v4" icon="◉" />
              <CardPick title="Fortnite" sub="BR · solo/duo" icon="◆" />
              <CardPick title="Rocket League" sub="Sport · 3v3" icon="◐" />
              <CardPick title="Autre" sub="Générique" icon="+" />
            </div>
          </FormField>
        </div>

        <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
          <FormField label="Visibilité du tournoi" sub="Qui peut voir et s'inscrire ?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
              <div onClick={() => setVisibility('public')} style={{
                border: visibility === 'public' ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: visibility === 'public' ? 'rgba(255,59,48,0.04)' : 'var(--card)',
                borderRadius: 12, padding: 18, cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>🌐</span>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>Public</div>
                  <Badge tone="success" style={{ marginLeft: 'auto' }}>Recommandé</Badge>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Visible par tous via lien partageable. Inscriptions ouvertes. Idéal pour cup ouverte et événements communautaires.
                </div>
              </div>
              <div onClick={() => setVisibility('private')} style={{
                border: visibility === 'private' ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: visibility === 'private' ? 'rgba(255,59,48,0.04)' : 'var(--card)',
                borderRadius: 12, padding: 18, cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>🔒</span>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>Privé</div>
                  <Badge tone="outline" style={{ marginLeft: 'auto' }}>Sur invitation</Badge>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Réservé à ton club ou ta communauté. Accès uniquement sur invitation. Page publique cachée.
                </div>
              </div>
            </div>
          </FormField>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="Qui saisit les scores ?" sub="Tu pourras toujours intervenir en tant qu'admin.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 4 }}>
              <CardPick active={scoreEntry === 'players'} onClick={() => setScoreEntry('players')} title="Joueurs (avec preuve)" sub="Les deux joueurs soumettent, l'adversaire valide. Idéal pour cup ouverte." icon="👥" />
              <CardPick active={scoreEntry === 'captains'} onClick={() => setScoreEntry('captains')} title="Capitaines de club" sub="Seuls les capitaines peuvent saisir. Recommandé pour Pro Clubs et ligues." icon="★" />
              <CardPick active={scoreEntry === 'referee'} onClick={() => setScoreEntry('referee')} title="Arbitre dédié" sub="Un arbitre désigné saisit tous les scores. Pour LAN et événements broadcast." icon="🎯" />
            </div>
          </FormField>
        </div>
      </div>
    </div>
  );
}

function WizardStep2() {
  const [format, setFormat] = React.useState('cup');
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 2 / 6" title="Format de compétition" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 24, maxWidth: 520 }}>
        Choisissez la structure principale. Vous pourrez ajouter des phases secondaires (poules + KO, double consolation…).
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <CardPick active={format === 'se'} onClick={() => setFormat('se')} title="Élimination simple" sub="1 défaite = éliminé. Rapide, lisible." icon="🏆" />
        <CardPick active={format === 'de'} onClick={() => setFormat('de')} title="Élimination double" sub="Loser bracket pour seconde chance." icon="🔄" />
        <CardPick active={format === 'rr'} onClick={() => setFormat('rr')} title="Round-robin" sub="Tous contre tous, classement." icon="🔁" />
        <CardPick active={format === 'sw'} onClick={() => setFormat('sw')} title="Suisse" sub="Appariements par score, sans élimination." icon="♟" />
        <CardPick active={format === 'cup'} onClick={() => setFormat('cup')} title="Coupe (poules + KO)" sub="Phase de poules puis tableau final." icon="🥇" />
        <CardPick active={format === 'lad'} onClick={() => setFormat('lad')} title="Ladder permanent" sub="Saison continue, montée/descente." icon="📈" />
        <CardPick active={format === 'sea'} onClick={() => setFormat('sea')} title="Championnat saison" sub="Aller-retour, classement points." icon="📅" />
      </div>

      <div style={{ marginTop: 28, padding: 18, background: 'var(--mute-bg)', borderRadius: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Paramètres avancés</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <FormField label="Best of (BO)"><TextInput value="BO3 — phase de poules / BO5 — KO" /></FormField>
          <FormField label="Points victoire / nul / défaite"><TextInput value="3 / 1 / 0" /></FormField>
          <FormField label="Tie-breaker"><TextInput value="Différence de buts → confrontation directe" /></FormField>
        </div>
      </div>
    </div>
  );
}

function WizardStep3() {
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 3 / 6" title="Équipes & participants" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 24, maxWidth: 520 }}>
        Inscrivez les équipes manuellement, par import CSV, ou ouvrez les inscriptions publiques.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <CardPick active title="Inscriptions ouvertes" sub="Les équipes s'inscrivent via une page publique." icon="🌐" />
        <CardPick title="Manuel" sub="Vous ajoutez chaque équipe vous-même." icon="✍️" />
        <CardPick title="Import CSV" sub="Bulk import depuis un fichier." icon="📂" />
      </div>
      <FormField label={`16 équipes inscrites — places restantes : 0/16`}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 6,
          padding: 14, background: 'var(--mute-bg)', borderRadius: 12
        }}>
          {TEAMS.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 8,
              background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)'
            }}>
              <TeamMark team={t} size={26} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{t.tag} · {flag(t.country)}</div>
              </div>
            </div>
          ))}
        </div>
      </FormField>
    </div>
  );
}

function WizardStep4() {
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 4 / 6" title="Dates & calendrier" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 24, maxWidth: 520 }}>
        Planifiez la fenêtre, les créneaux et les délais entre matchs. L'auto-planificateur peut générer les horaires.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <FormField label="Date de début"><TextInput value="01/06/2026" /></FormField>
        <FormField label="Date de fin"><TextInput value="14/06/2026" /></FormField>
        <FormField label="Fuseau horaire"><TextInput value="Europe/Paris (UTC+2)" /></FormField>
        <FormField label="Durée moyenne d'un match"><TextInput value="45 minutes (+15 prolongations)" /></FormField>
      </div>
      <div style={{ marginTop: 24 }}>
        <FormField label="Créneaux disponibles" sub="L'algorithme placera les matchs dans ces fenêtres.">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {['Lun 18-23h', 'Mar 18-23h', 'Mer 18-23h', 'Jeu 18-23h', 'Ven 18-00h', 'Sam 14-00h', 'Dim 14-22h'].map(s => (
              <Badge key={s} tone="outline">{s}</Badge>
            ))}
          </div>
        </FormField>
      </div>
    </div>
  );
}

function WizardStep5() {
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 5 / 6" title="Diffusion & réseaux sociaux" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 24, maxWidth: 540 }}>
        Connectez vos chaînes de diffusion et comptes sociaux. Les embeds apparaîtront sur la page publique et chaque page de match.
      </p>
      {[
        { kind: 'twitch', label: 'Twitch', placeholder: 'twitch.tv/redak-cup' },
        { kind: 'youtube', label: 'YouTube Live', placeholder: '@RedakEsports' },
        { kind: 'kick', label: 'Kick', placeholder: 'kick.com/redak' },
        { kind: 'discord', label: 'Discord', placeholder: 'discord.gg/redak' },
        { kind: 'x', label: 'X / Twitter', placeholder: '@RedakCup' },
        { kind: 'instagram', label: 'Instagram', placeholder: '@redak.esports' },
        { kind: 'tiktok', label: 'TikTok', placeholder: '@redak.gg' },
        { kind: 'facebook', label: 'Facebook', placeholder: 'fb.com/redakcup' },
        { kind: 'snapchat', label: 'Snapchat', placeholder: 'redakcup' },
      ].map(s => (
        <div key={s.kind} style={{
          display: 'grid', gridTemplateColumns: '40px 120px 1fr 100px',
          alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)'
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 18, background: 'var(--mute-bg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}><SocialIcon kind={s.kind} size={18} /></span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{s.label}</span>
          <TextInput placeholder={s.placeholder} />
          <Badge tone={s.kind === 'twitch' || s.kind === 'youtube' ? 'success' : 'outline'} solid={s.kind === 'twitch' || s.kind === 'youtube'}>
            {s.kind === 'twitch' || s.kind === 'youtube' ? 'Connecté' : 'Lier'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function WizardStep6() {
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 6 / 6" title="Vérifier & publier" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 24, maxWidth: 520 }}>
        Tout est prêt. Vérifiez le récapitulatif puis publiez votre tournoi sur la page publique.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          ['Nom', 'Redak Cup 2026 — Spring Major'],
          ['Jeu', 'EA FC 26'],
          ['Format', 'Coupe — Poules (4×4) + KO 8 équipes'],
          ['Équipes', '16/16'],
          ['Dotation', '50 000 €'],
          ['Dates', '01/06 → 14/06/2026'],
          ['Lieu', 'Paris La Défense Arena + Online'],
          ['Diffusion', 'Twitch + YouTube + 7 réseaux'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 14, background: 'var(--mute-bg)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{k}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, padding: 18, background: 'var(--ink)', color: 'var(--card)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>Page publique prête</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>redak.gg/redak-cup-2026</div>
        </div>
        <Btn variant="accent">Publier 🚀</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenDashboard, ScreenCalendar, ScreenWizard, FormField, TextInput, CardPick });
