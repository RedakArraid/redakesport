// screens-pro1.jsx — Matchmaking + Marketplace (transfers + free agents)

// =============================================================
// MATCHMAKING — queue ranked, lobby finder, party builder, anti-cheat
// =============================================================
function ScreenMatchmaking({ density, isAdmin }) {
  const [mode, setMode] = React.useState('queue');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <SectionTitle kicker="JEUX RAPIDES & CLASSÉS" title="Matchmaking" size="lg"
        action={
          <div style={{ display: 'flex', gap: 6 }}>
            {[['queue', 'File classée'], ['party', 'Party finder'], ['lobby', 'Lobby browser'], ['anti', 'Anti-cheat']].map(([k, l]) => (
              <Btn key={k} size="sm" variant={mode === k ? 'primary' : 'ghost'} onClick={() => setMode(k)}>{l}</Btn>
            ))}
          </div>
        }
      />

      {mode === 'queue' && <MMQueue />}
      {mode === 'party' && <MMParty />}
      {mode === 'lobby' && <MMLobby />}
      {mode === 'anti' && <MMAntiCheat />}
    </div>
  );
}

function MMQueue() {
  const [inQueue, setInQueue] = React.useState(true);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <Card padding={0} style={{ overflow: 'hidden', minHeight: 480 }}>
        <div style={{
          background: inQueue ? 'var(--ink)' : 'var(--card)',
          color: inQueue ? '#fff' : 'var(--ink)',
          padding: 40, position: 'relative', overflow: 'hidden'
        }}>
          {inQueue && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'repeating-linear-gradient(45deg, rgba(255,59,48,0.06) 0 2px, transparent 2px 28px)',
              animation: 'pulse 3s infinite'
            }} />
          )}
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 800, marginBottom: 12 }}>
              {inQueue ? '● RECHERCHE EN COURS' : 'PRÊT À JOUER'}
            </div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', lineHeight: 0.9 }}>
              {inQueue ? '00:42' : 'EA FC 26 · BO3'}
            </h2>
            <div style={{ marginTop: 14, fontSize: 14, opacity: inQueue ? 0.7 : 0.6 }}>
              {inQueue ? 'Recherche d\'un adversaire de ton niveau (1820 ± 100 ELO)' : 'File classée · Solo 1v1'}
            </div>
            <div style={{ marginTop: 32 }}>
              <Btn variant="accent" size="lg" onClick={() => setInQueue(!inQueue)}>
                {inQueue ? '✕ Annuler la recherche' : '▶ Lancer la recherche'}
              </Btn>
            </div>
            {inQueue && (
              <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, textAlign: 'center' }}>
                <MMQueueStat label="Joueurs en file" value="142" />
                <MMQueueStat label="Temps moyen" value="0:38" />
                <MMQueueStat label="Ta position" value="#4" />
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: 22, borderTop: '1px solid var(--border)' }}>
          <SectionTitle kicker="MODE" title="Configuration" size="sm" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Mode"><CardPick active title="Classé · Solo" sub="ELO impact" icon="🏆" /></FormField>
            <FormField label="Best of"><CardPick active title="BO3" sub="meilleur de 3" icon="3" /></FormField>
            <FormField label="Région"><CardPick active title="EU West" sub="ping ~28ms" icon="🌍" /></FormField>
            <FormField label="Plateforme"><CardPick active title="PS5 · cross-play" sub="cross-gen on" icon="◉" /></FormField>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="TON CLASSEMENT" title="ELO 1820" size="sm" />
          <div style={{ position: 'relative', height: 12, background: 'var(--mute-bg)', borderRadius: 6, marginTop: 14 }}>
            <div style={{ position: 'absolute', inset: '0 30% 0 0', background: 'linear-gradient(90deg, #16a34a 0%, #facc15 50%, var(--accent) 100%)', borderRadius: 6 }} />
            <div style={{ position: 'absolute', left: '70%', top: -4, width: 4, height: 20, background: 'var(--ink)', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
            <span>Bronze</span><span>Argent</span><span>Or</span><span>Platine</span><span>Diamant</span>
          </div>
          <div style={{ marginTop: 14, padding: 12, background: 'var(--mute-bg)', borderRadius: 10, fontSize: 13 }}>
            Rang actuel : <strong>Or III</strong> · 180 pts pour Platine
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="DERNIÈRES PARTIES" title="Historique" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ r: 'W', s: '3-1', op: 'Vortex_FR', mmr: '+18' },
              { r: 'W', s: '2-0', op: 'Zeke', mmr: '+14' },
              { r: 'L', s: '1-2', op: 'NeoKeeper', mmr: '-22' },
              { r: 'W', s: '4-3', op: 'Kasper', mmr: '+16' },
              { r: 'D', s: '2-2', op: 'Phoenix_TV', mmr: '+2' }].map((g, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 60px 60px', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, background: 'var(--mute-bg)' }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: g.r === 'W' ? '#16a34a' : g.r === 'L' ? '#dc2626' : '#facc15',
                  color: g.r === 'D' ? '#0a0a0a' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11
                }}>{g.r}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{g.op}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{g.s}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: g.mmr.startsWith('+') ? '#16a34a' : g.mmr.startsWith('-') ? '#dc2626' : 'var(--muted)' }}>{g.mmr}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MMQueueStat({ label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function MMParty() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 22 }}>
      <Card>
        <SectionTitle kicker="VOTRE GROUPE" title="Party 3v3 · Rocket League" size="md"
          action={<Btn variant="accent" size="sm">+ Inviter</Btn>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
          {[
            { handle: 'Le0n', role: 'Captain', status: 'ready', mmr: 1840 },
            { handle: 'Mira', role: 'Joueur', status: 'ready', mmr: 1760 },
            { handle: '+ Slot libre', role: null, status: 'empty', mmr: null }
          ].map((p, i) => (
            <div key={i} style={{
              padding: 18, borderRadius: 14,
              background: p.status === 'empty' ? 'var(--mute-bg)' : 'var(--card)',
              border: p.status === 'empty' ? '2px dashed var(--border)' : '1px solid var(--border)',
              textAlign: 'center', minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10
            }}>
              {p.status === 'empty' ? (
                <div style={{ color: 'var(--muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>＋</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Slot libre</div>
                  <Btn variant="ghost" size="sm" style={{ marginTop: 8 }}>Trouver un coéquipier</Btn>
                </div>
              ) : (
                <>
                  <div style={{
                    width: 54, height: 54, borderRadius: 27, background: MY_CLUB.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20
                  }}>{p.handle[0]}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{p.handle}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.role} · ELO {p.mmr}</div>
                  <Badge solid tone={p.status === 'ready' ? 'success' : 'warning'}>● {p.status === 'ready' ? 'PRÊT' : 'EN ATTENTE'}</Badge>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: 18, background: 'var(--ink)', color: '#fff', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>ELO MOYEN GROUPE</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>1800 · Platine III</div>
          </div>
          <Btn variant="accent" size="lg">▶ Lancer une recherche</Btn>
        </div>
      </Card>
      <Card>
        <SectionTitle kicker="COÉQUIPIERS SUGGÉRÉS" title="Pour ton niveau" size="sm" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['Yu7o', 'Ravn', 'Hex', 'Sora', 'Cinder'].map((h, i) => (
            <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, background: 'var(--mute-bg)' }}>
              <span style={{
                width: 32, height: 32, borderRadius: 16, background: 'var(--ink)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 800
              }}>{h[0]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{h}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>ELO {1750 + i * 30} · Win {65 - i * 2}%</div>
              </div>
              <Btn variant="ghost" size="sm">+ Inviter</Btn>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MMLobby() {
  const lobbies = [
    { name: 'Friendly Cup vendredi soir', host: 'Le0n', game: 'EA FC 26', mode: '1v1 BO3', players: '6/8', region: 'EU', mmr: '1700-1900', password: false },
    { name: 'Pro Clubs scrim — recrute', host: 'Marc D.', game: 'EA FC 26 PC', mode: '11v11', players: '18/22', region: 'EU', mmr: 'Open', password: true },
    { name: 'Ranked grind party RL', host: 'Mira', game: 'Rocket League', mode: '3v3 ranked', players: '4/6', region: 'EU', mmr: '1800+', password: false },
    { name: 'Showmatch caster', host: 'Sasha_caster', game: 'Valorant', mode: '5v5 custom', players: '8/10', region: 'EU', mmr: 'Pro only', password: true },
    { name: 'Open lobby débutants', host: 'Phoenix_TV', game: 'EA FC 26', mode: '1v1 BO1', players: '12/16', region: 'EU', mmr: '<1500', password: false },
  ];
  return (
    <Card padding={0}>
      <div style={{ padding: 22, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <input placeholder="Rechercher un lobby…" style={{ flex: 1, padding: '10px 16px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--mute-bg)', fontSize: 13, outline: 'none' }} />
        <Btn variant="ghost" size="sm">Filtres</Btn>
        <Btn variant="accent" size="md">+ Créer un lobby</Btn>
      </div>
      {lobbies.map((lo, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 100px 80px 80px auto', alignItems: 'center', gap: 14, padding: '16px 22px', borderBottom: i < lobbies.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <span style={{ fontSize: 22 }}>{lo.password ? '🔒' : '🔓'}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{lo.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>par {lo.host} · {lo.game}</div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{lo.mode}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>{lo.players}</span>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{lo.region}</span>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{lo.mmr}</span>
          <Btn variant="primary" size="sm">Rejoindre</Btn>
        </div>
      ))}
    </Card>
  );
}

function MMAntiCheat() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="PROTECTION ACTIVE" title="Anti-cheat Redak Shield" size="md"
            action={<Badge solid tone="success">● ACTIF</Badge>}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <ShieldStat label="Tournois protégés" value="247" />
            <ShieldStat label="Joueurs scannés" value="18.4K" />
            <ShieldStat label="Cheaters détectés" value="42" sub="ce mois" tone="red" />
            <ShieldStat label="Faux positifs" value="<0.1%" tone="green" />
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="MODULES ACTIVÉS" title="Niveaux de protection" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Détection mémoire (Easy Anti-Cheat)', desc: 'Scan des process et signatures suspectes', on: true, level: 'haut' },
              { name: 'Hardware ID fingerprint', desc: 'Empreinte unique du PC, bloque les multi-comptes', on: true, level: 'haut' },
              { name: 'Vérification d\'identité (KYC light)', desc: 'Liaison Steam/EA/PSN vérifiée', on: true, level: 'moyen' },
              { name: 'Analyse comportementale ML', desc: 'Détecte aimbots et timing impossibles', on: true, level: 'haut' },
              { name: 'Stream delay forcé', desc: 'Empêche le stream-sniping en compétition', on: false, level: 'moyen' },
              { name: 'VPN / Proxy block', desc: 'Bloque les connexions anonymisées', on: true, level: 'bas' },
            ].map(m => (
              <div key={m.name} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto auto', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, background: 'var(--mute-bg)' }}>
                <span style={{ fontSize: 18 }}>{m.on ? '🛡' : '🚫'}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.desc}</div>
                </div>
                <Badge tone={m.level === 'haut' ? 'live' : m.level === 'moyen' ? 'warning' : 'outline'}>{m.level}</Badge>
                <Btn variant="ghost" size="sm">{m.on ? '✓ ON' : 'OFF'}</Btn>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="ALERTES RÉCENTES" title="Activité suspecte" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { who: 'Anonymous_8341', what: 'Pattern de tir non-humain détecté', sev: 'haut', time: 'il y a 4h', resolved: false },
              { who: 'KryptonFC', what: 'HWID partagée avec compte banni', sev: 'haut', time: 'il y a 11h', resolved: true },
              { who: 'NeoX', what: 'VPN connexion détectée', sev: 'bas', time: 'hier', resolved: true },
            ].map((a, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto auto', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: a.sev === 'haut' ? 'var(--accent)' : '#facc15',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                }}>⚠</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{a.who}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.what} · {a.time}</div>
                </div>
                <Badge tone={a.sev === 'haut' ? 'live' : 'warning'}>{a.sev}</Badge>
                {a.resolved ? <Badge tone="success">✓ Résolu</Badge> : <Btn variant="accent" size="sm">Investiguer</Btn>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="VÉRIFICATION D'IDENTITÉ" title="KYC light" size="sm" />
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
            Liez vos comptes pour gagner le badge ✓ Vérifié.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Steam', on: true },
              { name: 'EA Account', on: true },
              { name: 'PSN', on: false },
              { name: 'Xbox Live', on: false },
              { name: 'Email (vérifié)', on: true },
              { name: 'Téléphone (SMS)', on: false },
              { name: 'Pièce d\'identité (gold)', on: false },
            ].map(l => (
              <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, background: 'var(--mute-bg)' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 11,
                  background: l.on ? '#16a34a' : 'var(--mute-bg)', color: '#fff',
                  border: l.on ? 'none' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800
                }}>{l.on ? '✓' : ''}</span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{l.name}</span>
                <Btn variant={l.on ? 'ghost' : 'primary'} size="sm">{l.on ? 'Lié' : 'Lier'}</Btn>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: 12, background: 'var(--ink)', color: '#fff', borderRadius: 10, fontSize: 12 }}>
            ✓ Niveau actuel : <strong>SILVER</strong> (3/7) · Passez à GOLD pour participer aux tournois prize money &gt; 1000€.
          </div>
        </Card>
      </div>
    </div>
  );
}

function ShieldStat({ label, value, sub, tone }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: tone === 'red' ? 'rgba(255,59,48,0.06)' : tone === 'green' ? 'rgba(22,163,74,0.06)' : 'var(--mute-bg)'
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.03em',
        color: tone === 'red' ? 'var(--accent)' : tone === 'green' ? '#16a34a' : 'var(--ink)'
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// =============================================================
// MARKETPLACE — free agents + transferts + mercato + salary cap
// =============================================================
function ScreenMarketplace({ density, isAdmin }) {
  const [tab, setTab] = React.useState('agents');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <MercatoBanner />
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'agents', label: '🔍 Free agents', n: 142 },
          { id: 'clubs', label: '⚑ Clubs qui recrutent', n: 28 },
          { id: 'transfers', label: '🔄 Transferts récents', n: 18 },
          { id: 'salary', label: '💰 Salary cap', n: null },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
            color: tab === t.id ? 'var(--ink)' : 'var(--muted)',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 8
          }}>
            {t.label}{t.n != null && <span style={{ background: tab === t.id ? 'var(--accent)' : 'var(--mute-bg)', color: tab === t.id ? '#fff' : 'var(--muted)', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{t.n}</span>}
          </button>
        ))}
      </div>
      {tab === 'agents' && <FreeAgents />}
      {tab === 'clubs' && <RecruitingClubs />}
      {tab === 'transfers' && <RecentTransfers />}
      {tab === 'salary' && <SalaryCap />}
    </div>
  );
}

function MercatoBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--accent) 0%, #c41e10 100%)', color: '#fff',
      borderRadius: 18, padding: 24, display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 24
    }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 6 }}>
          ⚡ FENÊTRE DE MERCATO OUVERTE
        </div>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em' }}>
          12 jours, 8 heures restantes
        </h2>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
          Du 01/06 au 18/06 — Roster lock le 18/06 à 23h59. Aucun transfert possible pendant les playoffs.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, paddingLeft: 24, borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
        <MercaStat label="Transferts" value="284" />
        <MercaStat label="Volume" value="48K€" />
      </div>
      <Btn variant="accent" size="md" style={{ background: '#fff', color: 'var(--accent)' }}>📜 Règles du mercato</Btn>
    </div>
  );
}
function MercaStat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>{label}</div>
    </div>
  );
}

const FREE_AGENTS = [
  { handle: 'Vortex_FR', country: 'FR', position: 'ATT', age: 19, mmr: 1840, value: 2500, available: 'immediate', stream: true, lastClub: 'Solo' },
  { handle: 'NeoKeeper', country: 'PL', position: 'GK', age: 22, mmr: 1920, value: 3800, available: 'immediate', stream: false, lastClub: 'Northern Stars' },
  { handle: 'Zeke', country: 'BE', position: 'MIL', age: 17, mmr: 1640, value: 800, available: 'immediate', stream: false, lastClub: 'Solo' },
  { handle: 'Kasper', country: 'SE', position: 'DEF', age: 24, mmr: 2050, value: 5200, available: '15/06', stream: false, lastClub: 'Northern Stars' },
  { handle: 'Phoenix_TV', country: 'FR', position: 'ATT', age: 23, mmr: 1880, value: 4100, available: 'immediate', stream: true, lastClub: 'Free Solo' },
  { handle: 'KingArt', country: 'PT', position: 'ATT', age: 20, mmr: 1750, value: 1900, available: 'immediate', stream: false, lastClub: 'Lisbon Crew' },
  { handle: 'Akari', country: 'JP', position: 'MIL', age: 21, mmr: 1810, value: 2200, available: '20/06', stream: true, lastClub: 'Tokyo Bolt' },
  { handle: 'Marit', country: 'NO', position: 'DEF', age: 19, mmr: 1690, value: 1100, available: 'immediate', stream: false, lastClub: 'Solo' },
];

function FreeAgents() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 22 }}>
      <Card>
        <SectionTitle kicker="FILTRES" title="Affiner" size="sm" />
        <FilterBlock label="Poste" options={['Tous', 'GK', 'DEF', 'MIL', 'ATT']} active={0} />
        <FilterBlock label="Âge" options={['Tous', '<18', '18-21', '22-25', '25+']} active={0} />
        <FilterBlock label="ELO" options={['Tous', '<1700', '1700-1850', '1850-2000', '2000+']} active={2} />
        <FilterBlock label="Disponibilité" options={['Tous', 'Immédiat', '< 7 jours', 'Fin de saison']} active={1} />
        <FilterBlock label="Streamer" options={['Tous', 'Oui', 'Non']} active={0} />
        <FilterBlock label="Région" options={['EU', 'NA', 'ASIA', 'OCE', 'SA']} active={0} />
      </Card>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>{FREE_AGENTS.length} joueurs disponibles · trié par ELO ↓</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="ghost" size="sm">ELO ↓</Btn>
            <Btn variant="ghost" size="sm">Valeur ↓</Btn>
            <Btn variant="ghost" size="sm">Récent ↑</Btn>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {FREE_AGENTS.map(a => <FreeAgentCard key={a.handle} a={a} />)}
        </div>
      </div>
    </div>
  );
}

function FreeAgentCard({ a }) {
  return (
    <Card padding={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 28, background: 'var(--ink)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20
        }}>{a.handle[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{a.handle}</span>
            {a.stream && <Badge solid tone="accent" style={{ background: '#a855f7', padding: '2px 6px' }}>📺</Badge>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{flag(a.country)} {a.country} · {a.age} ans · ex-{a.lastClub}</div>
        </div>
        <Badge solid tone="accent" style={{ background: 'var(--ink)' }}>{a.position}</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
        <MiniKpi label="ELO" value={a.mmr} />
        <MiniKpi label="Valeur" value={`${a.value}€`} />
        <MiniKpi label="Dispo" value={a.available === 'immediate' ? 'Now' : a.available} />
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
        <Btn variant="primary" size="sm" style={{ flex: 1 }}>📨 Contacter</Btn>
        <Btn variant="ghost" size="sm" style={{ flex: 1 }}>+ Watchlist</Btn>
      </div>
    </Card>
  );
}

function FilterBlock({ label, options, active }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {options.map((o, i) => (
          <div key={o} style={{
            padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
            background: i === active ? 'var(--ink)' : 'transparent',
            color: i === active ? 'var(--card)' : 'var(--ink)',
            fontSize: 13, fontWeight: i === active ? 700 : 500
          }}>{o}</div>
        ))}
      </div>
    </div>
  );
}

function RecruitingClubs() {
  const clubs = [
    { tag: 'KRA', name: 'Kraken Gaming', color: '#2547ff', country: 'NO', rank: 1, needs: ['ATT', 'streamer'], budget: '6 000€', deadline: '15/06' },
    { tag: 'EMB', name: 'Ember Collective', color: '#ff8a00', country: 'BR', rank: 3, needs: ['MIL', 'DEF'], budget: '3 500€', deadline: '18/06' },
    { tag: 'OBL', name: 'Oblivion', color: '#a855f7', country: 'DE', rank: 5, needs: ['ATT'], budget: '2 000€', deadline: '18/06' },
    { tag: 'AZR', name: 'Azur Légion', color: '#0ea5e9', country: 'FR', rank: 7, needs: ['ATT', 'GK', 'streamer'], budget: '1 500€', deadline: 'Open' },
    { tag: 'BLZ', name: 'Blizzard FC', color: '#94a3b8', country: 'CA', rank: 8, needs: ['MIL', 'DEF', 'ATT'], budget: '900€', deadline: 'Open' },
    { tag: 'NEO', name: 'Neon Tigers', color: '#22d3ee', country: 'TH', rank: 10, needs: ['Tous postes'], budget: 'Variable', deadline: 'Open' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
      {clubs.map(c => (
        <Card key={c.tag} padding={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{
              width: 54, height: 54, borderRadius: 12, background: c.color, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18
            }}>{c.tag}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{flag(c.country)} · {c.rank}ᵉ Division 1</div>
            </div>
            <Badge tone="live">RECRUTE</Badge>
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {c.needs.map(n => <Badge key={n} solid tone="accent">{n}</Badge>)}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
            <span>💰 Budget : <strong style={{ color: 'var(--ink)' }}>{c.budget}</strong></span>
            <span>⏳ Deadline : <strong style={{ color: 'var(--ink)' }}>{c.deadline}</strong></span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
            <Btn variant="primary" size="sm" style={{ flex: 1 }}>📨 Candidater</Btn>
            <Btn variant="ghost" size="sm">Voir l'effectif</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RecentTransfers() {
  const transfers = [
    { player: 'Kasper', from: 'Northern Stars', fromC: '#94a3b8', to: 'Nova Esports', toC: '#ff3b30', fee: 5200, date: 'aujourd\'hui', type: 'paid' },
    { player: 'Vortex_FR', from: 'Free Agent', fromC: '#71706b', to: 'Nova Esports', toC: '#ff3b30', fee: 0, date: 'aujourd\'hui', type: 'free' },
    { player: 'Doh', from: 'Hivemind', fromC: '#facc15', to: 'Kraken Gaming', toC: '#2547ff', fee: 4800, date: 'hier', type: 'paid' },
    { player: 'Pol', from: 'Solar Riot', fromC: '#f43f5e', to: 'Ember Collective', toC: '#ff8a00', fee: 2100, date: 'hier', type: 'paid' },
    { player: 'Inés', from: 'Solar Riot', fromC: '#f43f5e', to: 'Free Agent', toC: '#71706b', fee: 0, date: 'il y a 2j', type: 'release' },
    { player: 'Anaé', from: 'Hivemind', fromC: '#facc15', to: 'Pixel Wolves', toC: '#00b86b', fee: 1800, date: 'il y a 3j', type: 'paid' },
    { player: 'Jin', from: 'Free Agent', fromC: '#71706b', to: 'Oblivion', toC: '#a855f7', fee: 0, date: 'il y a 3j', type: 'free' },
    { player: 'Bart', from: 'Zero Day', fromC: '#475569', to: 'Vexa Crew', toC: '#84cc16', fee: 600, date: 'il y a 4j', type: 'paid' },
  ];
  return (
    <Card padding={0}>
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '160px 1fr 200px 1fr 100px 80px', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
        <span>Joueur</span><span>De</span><span></span><span>À</span><span style={{ textAlign: 'right' }}>Montant</span><span style={{ textAlign: 'right' }}>Date</span>
      </div>
      {transfers.map((t, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 200px 1fr 100px 80px', gap: 12, padding: '16px 22px', borderBottom: i < transfers.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12 }}>{t.player[0]}</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{t.player}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 5, background: t.fromC, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)' }}>{t.from.slice(0, 3).toUpperCase()}</span>
            <span style={{ fontSize: 13 }}>{t.from}</span>
          </div>
          <div style={{ textAlign: 'center', color: 'var(--accent)', fontSize: 16 }}>→</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 5, background: t.toC, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)' }}>{t.to.slice(0, 3).toUpperCase()}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{t.to}</span>
          </div>
          <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>
            {t.type === 'free' ? <span style={{ color: '#16a34a', fontSize: 12 }}>LIBRE</span> :
              t.type === 'release' ? <span style={{ color: 'var(--muted)', fontSize: 12 }}>RELEASE</span> :
              `${t.fee.toLocaleString('fr-FR')}€`}
          </span>
          <span style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{t.date}</span>
        </div>
      ))}
    </Card>
  );
}

function SalaryCap() {
  const cap = 12000;
  const used = 8740;
  const usedPct = (used / cap) * 100;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="BUDGET DIVISION 1" title="Salary cap Nova Esports" size="md" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>UTILISÉ</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48, letterSpacing: '-0.03em' }}>{used.toLocaleString('fr-FR')}€<span style={{ fontSize: 20, color: 'var(--muted)' }}> / mois</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>CAP MAX</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>{cap.toLocaleString('fr-FR')}€</div>
            </div>
          </div>
          <div style={{ position: 'relative', height: 24, background: 'var(--mute-bg)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${usedPct}%`, background: usedPct > 85 ? 'var(--accent)' : usedPct > 70 ? '#facc15' : '#16a34a', transition: 'width 0.3s' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 12, color: '#fff', mixBlendMode: 'difference' }}>
              {usedPct.toFixed(0)}%
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>Marge disponible : <strong style={{ color: '#16a34a' }}>{(cap - used).toLocaleString('fr-FR')}€</strong></div>
        </Card>

        <Card>
          <SectionTitle kicker="RÉPARTITION SALAIRES" title="Top contrats" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { p: 'Le0n', role: 'Captain', salary: 1800, contract: '18 mois' },
              { p: 'Kr1m', role: 'Vice-cap', salary: 1500, contract: '12 mois' },
              { p: 'Astra', role: 'GK titulaire', salary: 1200, contract: '24 mois' },
              { p: 'Vyx', role: 'Streamer', salary: 1100, contract: '12 mois', stream: true },
              { p: 'Ravn', role: 'Titulaire', salary: 950, contract: '12 mois' },
              { p: 'Yu7o', role: 'Titulaire', salary: 850, contract: '6 mois' },
              { p: 'Mira', role: 'Titulaire', salary: 800, contract: '12 mois' },
              { p: 'Hex', role: 'Titulaire', salary: 540, contract: '6 mois' },
            ].map((c, i) => (
              <div key={c.p} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 100px 60px', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span style={{ width: 32, height: 32, borderRadius: 16, background: MY_CLUB.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{c.p[0]}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                    {c.p}{c.stream && <span style={{ color: '#a855f7', marginLeft: 6 }}>📺</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.role}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, textAlign: 'right' }}>{c.salary}€<span style={{ fontSize: 10, color: 'var(--muted)' }}>/mois</span></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>{c.contract}</span>
                <Btn variant="ghost" size="sm">⋯</Btn>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card style={{ background: 'var(--ink)', color: '#fff' }}>
          <SectionTitle kicker="ROSTER LOCK" title="18/06 · 23:59" size="sm" />
          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6, marginTop: 8 }}>
            Après cette date :
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, opacity: 0.85, lineHeight: 1.8 }}>
            <li>Aucun transfert pendant playoffs</li>
            <li>Effectif gelé jusqu'à fin de saison</li>
            <li>1 wildcard d'urgence autorisée (joueur blessé)</li>
            <li>Tryouts internes possibles mais pas d'enregistrement officiel</li>
          </ul>
        </Card>

        <Card>
          <SectionTitle kicker="BONUS & MALUS" title="Réglementation" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { what: 'Cap luxury (jusqu\'à +20%)', val: 'Autorisé · taxe 10%', tone: 'warning' },
              { what: 'Bonus performance (MVP saison)', val: 'jusqu\'à +2 000€', tone: 'success' },
              { what: 'Dépassement >20% du cap', val: 'Inéligible playoffs', tone: 'live' },
              { what: 'Joueur formé au club', val: '50% du salaire hors-cap', tone: 'success' },
            ].map(r => (
              <div key={r.what} style={{ padding: 10, borderRadius: 8, background: 'var(--mute-bg)' }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{r.what}</div>
                <Badge tone={r.tone}>{r.val}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenMatchmaking, ScreenMarketplace });
