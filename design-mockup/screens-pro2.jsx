// screens-pro2.jsx — Broadcast hub (OBS overlays, VOD library, caster tools, predictions) + Wallet (sponsors, prize pool)

// =============================================================
// BROADCAST HUB
// =============================================================
function ScreenBroadcast({ density, isAdmin }) {
  const [tab, setTab] = React.useState('overlays');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <SectionTitle kicker="BROADCAST STUDIO" title="Outils pour casters" size="lg" />
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'overlays', label: '🎬 Overlays OBS' },
          { id: 'vod', label: '📼 VOD library' },
          { id: 'caster', label: '🎙 Outils caster' },
          { id: 'predict', label: '🎯 Prédictions' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
            color: tab === t.id ? 'var(--ink)' : 'var(--muted)',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'overlays' && <OBSOverlays />}
      {tab === 'vod' && <VODLibrary />}
      {tab === 'caster' && <CasterTools />}
      {tab === 'predict' && <Predictions />}
    </div>
  );
}

function OBSOverlays() {
  const [pick, setPick] = React.useState(0);
  const overlays = [
    { name: 'Scoreboard classique', desc: 'Top du stream — score, timer, équipes' },
    { name: 'Lower thirds caster', desc: 'Nom du joueur, statistiques en bas' },
    { name: 'Bracket en miniature', desc: 'Bracket complet en coin' },
    { name: 'Slate de transition', desc: 'Entre les matchs, sponsors' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 280px', gap: 22 }}>
      <Card>
        <SectionTitle kicker="TEMPLATES" title="Bibliothèque" size="sm" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {overlays.map((o, i) => (
            <div key={o.name} onClick={() => setPick(i)} style={{
              padding: 12, borderRadius: 10, cursor: 'pointer',
              border: pick === i ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: pick === i ? 'rgba(255,59,48,0.04)' : 'var(--card)'
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{o.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{o.desc}</div>
            </div>
          ))}
        </div>
        <Btn variant="ghost" size="sm" style={{ marginTop: 12, width: '100%' }}>+ Nouveau template</Btn>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="APERÇU LIVE" title={overlays[pick].name} size="sm"
            action={<Badge tone="live">● Mise à jour temps réel</Badge>}
          />
          <div style={{ position: 'relative', aspectRatio: '16/9', background: '#1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
            <MediaPlaceholder label="STREAM PRÉVISUALISATION" tone="dark" rounded={0} aspect="16/9" />
            {/* Scoreboard overlay */}
            {pick === 0 && (
              <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', color: '#fff', padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 18, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: '#ff8a00', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>EMB</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>2</span>
                </div>
                <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em' }}>● 78'</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>2</span>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: '#facc15', color: '#0a0a0a', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>HVR</span>
                </div>
              </div>
            )}
            {/* Lower third */}
            {pick === 1 && (
              <div style={{ position: 'absolute', bottom: 14, left: 14, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', color: '#fff', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', minWidth: 280, borderLeft: '4px solid var(--accent)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--accent)' }}>SUR LE TERRAIN</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginTop: 2 }}>Le0n · NVX #10</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
                  <span>Buts: <strong>28</strong></span>
                  <span>Passes: <strong>12</strong></span>
                  <span>Note: <strong>8.4</strong></span>
                </div>
              </div>
            )}
            {/* Bracket mini */}
            {pick === 2 && (
              <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', color: '#fff', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', width: 200 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 6 }}>BRACKET QF</div>
                {['EMB 2-2 HVR', 'NVX 3-1 BLZ', 'KRA 3-0 AZR', 'OBL 3-2 PXL'].map(t => (
                  <div key={t} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Slate */}
            {pick === 3 && (
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--accent) 0%, #0a0a0a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', color: '#fff', opacity: 0.8 }}>PROCHAIN MATCH</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48, color: '#fff', letterSpacing: '-0.03em' }}>NVX vs KRA</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: '#fff', opacity: 0.7 }}>14/06 · 20h00</div>
                <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
                  {['Logitech G', 'Red Bull', 'Secretlab'].map(s => <div key={s} style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, opacity: 0.6, fontSize: 11, letterSpacing: '0.06em' }}>{s.toUpperCase()}</div>)}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="EXPORT" title="Connecter à OBS" size="sm" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
            <div style={{ padding: 14, background: 'var(--mute-bg)', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all' }}>
              https://overlay.redak.gg/<strong style={{ color: 'var(--accent)' }}>nvx-{pick + 1}xj7s2</strong>
            </div>
            <Btn variant="primary" size="md">📋 Copier l'URL</Btn>
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            Dans OBS : Source → Browser → Coller cette URL → 1920×1080. Mise à jour automatique sans rechargement.
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle kicker="STYLE" title="Personnalisation" size="sm" />
        <FormField label="Couleur d'accent">
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {['#ff3b30', '#2547ff', '#a855f7', '#16a34a', '#facc15'].map((c, i) => (
              <div key={c} style={{ width: 32, height: 32, borderRadius: 16, background: c, cursor: 'pointer', border: i === 0 ? '3px solid var(--ink)' : 'none' }} />
            ))}
          </div>
        </FormField>
        <FormField label="Position scoreboard">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 6 }}>
            {['Haut', 'Bas', 'Coin'].map((p, i) => (
              <CardPick key={p} active={i === 0} title={p} sub="" />
            ))}
          </div>
        </FormField>
        <FormField label="Animations"><CardPick active title="Slide-in" sub="0.3s" icon="→" /></FormField>
        <FormField label="Logo organisation"><Btn variant="ghost" size="sm" style={{ width: '100%' }}>📤 Uploader</Btn></FormField>
      </Card>
    </div>
  );
}

const VOD_ITEMS = [
  { title: 'EMB vs HVR — QF4 intégral', match: 'Redak Cup 2026', duration: '1:47:24', views: '24K', tone: 'red', auto: false },
  { title: 'But du tournoi : Mu7 (71\')', match: 'QF4', duration: '0:18', views: '142K', tone: 'red', auto: true },
  { title: 'Égalisation Hivemind 45\'+2', match: 'QF4', duration: '0:34', views: '89K', tone: 'blue', auto: true },
  { title: 'Triple sauvegarde Astra (NVX)', match: 'QF1', duration: '0:42', views: '67K', tone: 'cream', auto: true },
  { title: 'Highlights Pro Clubs J18', match: 'Pro League', duration: '4:12', views: '38K', tone: 'red', auto: false },
  { title: 'Interview post-match Kr1m', match: 'QF1', duration: '6:30', views: '12K', tone: 'blue', auto: false },
  { title: 'Solo run Le0n vs BLZ', match: 'QF1', duration: '0:24', views: '54K', tone: 'cream', auto: true },
  { title: 'Top 10 buts semaine 2', match: 'Compilation', duration: '8:18', views: '203K', tone: 'red', auto: false },
];

function VODLibrary() {
  const [filter, setFilter] = React.useState('all');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'Tous'], ['auto', '✨ Auto-générés'], ['manual', 'Casters'], ['compile', 'Compilations']].map(([k, l]) => (
            <Btn key={k} size="sm" variant={filter === k ? 'primary' : 'ghost'} onClick={() => setFilter(k)}>{l}</Btn>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" size="sm">↓ Exporter</Btn>
          <Btn variant="accent" size="sm">+ Nouveau clip</Btn>
        </div>
      </div>

      <Card style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid #a855f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>✨</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>Détection IA des moments forts</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>3 nouveaux clips générés depuis le dernier match · revue requise</div>
          </div>
          <Btn variant="accent" size="md" style={{ marginLeft: 'auto', background: '#a855f7' }}>Approuver tout</Btn>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {VOD_ITEMS.map((v, i) => (
          <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card)' }}>
            <div style={{ position: 'relative' }}>
              <MediaPlaceholder label={v.title} tone={v.tone} type="video" duration={v.duration} height={150} rounded={0} />
              {v.auto && (
                <span style={{ position: 'absolute', top: 8, left: 8, background: '#a855f7', color: '#fff', padding: '3px 7px', borderRadius: 4, fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', fontWeight: 800 }}>✨ AUTO</span>
              )}
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{v.title}</div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                <span>{v.match}</span><span>👁 {v.views}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CasterTools() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <Card padding={0}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionTitle kicker="EN COURS" title="Sasha caste QF4" size="sm" />
          <Badge tone="live">● ON AIR</Badge>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ padding: 20, borderRight: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>MARKERS (5)</div>
            {[
              { t: '06:12', label: 'But Ravi (EMB) — frappe enroulée', tone: 'red' },
              { t: '34:08', label: 'But Hye (HVR) — tête', tone: 'blue' },
              { t: '45:42', label: 'But Min (HVR) — contre rapide', tone: 'blue' },
              { t: '64:18', label: 'But Dani (EMB) — reprise lucarne', tone: 'red' },
              { t: '71:03', label: 'PEN Mu7 (EMB)', tone: 'red' },
            ].map((m, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: m.tone === 'red' ? 'var(--accent)' : 'var(--blue)' }}>{m.t}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                <Btn variant="ghost" size="sm">📎</Btn>
              </div>
            ))}
            <Btn variant="accent" size="sm" style={{ marginTop: 12, width: '100%' }}>+ Ajouter un marker (78\')</Btn>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>HOTKEYS LIVE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { k: 'F1', a: 'Marker but équipe A' },
                { k: 'F2', a: 'Marker but équipe B' },
                { k: 'F3', a: 'Marker action importante' },
                { k: 'F4', a: 'Clip 30s rétroactif' },
                { k: 'F5', a: 'Sondage instantané chat' },
                { k: 'F6', a: 'Sponsor splash' },
                { k: 'F7', a: 'Replay slow-mo' },
              ].map(h => (
                <div key={h.k} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <kbd style={{ background: 'var(--ink)', color: '#fff', padding: '3px 8px', borderRadius: 5, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>{h.k}</kbd>
                  <span style={{ fontSize: 12 }}>{h.a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="DOSSIER MATCH" title="Notes & faits" size="sm" />
          <div style={{ padding: 12, background: 'var(--mute-bg)', borderRadius: 10, fontSize: 12, lineHeight: 1.7 }}>
            <strong>EMB vs HVR :</strong> 4ᵉ confrontation cette saison. Ember a remporté les 2 dernières (3-1, 2-0). Hivemind est invaincu à domicile depuis 7 matchs. Mu7 cherche son 30ᵉ but. Coach Park (HVR) absent — assistant aux commandes.
          </div>
          <Btn variant="ghost" size="sm" style={{ marginTop: 10, width: '100%' }}>+ Note rapide</Btn>
        </Card>
        <Card>
          <SectionTitle kicker="MULTI-STREAM" title="Diffusion active" size="sm" />
          {[
            { p: 'twitch', n: 'redak_official', v: '24K' },
            { p: 'youtube', n: '@RedakEsports', v: '8.2K' },
            { p: 'kick', n: 'redak', v: '2.1K' },
          ].map(s => (
            <div key={s.p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: 'var(--mute-bg)', marginBottom: 6 }}>
              <span style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SocialIcon kind={s.p} size={14} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{s.n}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>👁 {s.v} viewers</div>
              </div>
              <Badge tone="live">●</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Predictions() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #c41e10 100%)', color: '#fff' }}>
          <SectionTitle kicker="SONDAGE LIVE · 47K VOTES" title="Qui gagne EMB vs HVR ?" size="md" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
            <PredBar label="🟧 Ember Collective" pct={58} bg="rgba(255,255,255,0.2)" />
            <PredBar label="🟨 Hivemind" pct={28} bg="rgba(255,255,255,0.15)" />
            <PredBar label="Match nul / prolongations" pct={14} bg="rgba(255,255,255,0.1)" />
          </div>
          <div style={{ marginTop: 18, fontSize: 13, opacity: 0.85 }}>
            Les votes ferment à 90' · pas de mise réelle, points fantasy uniquement.
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="CLASSEMENT PRÉDICTEURS" title="Top fantasy du tournoi" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { rank: 1, name: 'Maxou_GG', pts: 2840, accuracy: '84%' },
              { rank: 2, name: 'Lyra_TV', pts: 2720, accuracy: '81%' },
              { rank: 3, name: 'KryptonFC', pts: 2580, accuracy: '79%' },
              { rank: 4, name: 'Win_TH', pts: 2410, accuracy: '76%' },
              { rank: 5, name: 'Toi (Le0n)', pts: 2350, accuracy: '75%', mine: true },
              { rank: 6, name: 'Pixel_42', pts: 2210, accuracy: '72%' },
            ].map((p, i) => (
              <div key={p.rank} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)', background: p.mine ? 'rgba(255,59,48,0.05)' : 'transparent', padding: p.mine ? '12px 14px' : '12px 0', borderRadius: p.mine ? 8 : 0 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: p.rank <= 3 ? 'var(--accent)' : 'var(--muted)' }}>#{p.rank}</span>
                <span style={{ fontWeight: p.mine ? 800 : 600, fontSize: 14 }}>{p.name}{p.mine && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>★</span>}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, textAlign: 'right' }}>{p.pts}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#16a34a', textAlign: 'right' }}>{p.accuracy}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle kicker="TES PRÉDICTIONS" title="Du jour" size="sm" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { m: 'EMB vs HVR', pred: 'EMB gagne', confidence: 75, status: 'pending' },
            { m: 'Score final', pred: '3-2', confidence: 30, status: 'pending' },
            { m: 'Buteur du match', pred: 'Dani', confidence: 50, status: 'won' },
            { m: 'Carton jaune avant 30\'', pred: 'Oui', confidence: 60, status: 'won' },
          ].map((p, i) => (
            <div key={i} style={{ padding: 10, borderRadius: 10, background: 'var(--mute-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.m}</span>
                <Badge tone={p.status === 'won' ? 'success' : 'warning'}>{p.status === 'won' ? '✓ GAGNÉ' : '⏳'}</Badge>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginTop: 4 }}>{p.pred}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Confiance: {p.confidence}%</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PredBar({ label, pct, bg }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 10, background: bg, borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 5 }} />
      </div>
    </div>
  );
}

// =============================================================
// WALLET — finances club + sponsor marketplace + prize pool
// =============================================================
function ScreenWallet({ density, isAdmin }) {
  const [tab, setTab] = React.useState('overview');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <SectionTitle kicker="FINANCES & PARTENARIATS" title="Wallet & sponsors" size="lg" />
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'overview', label: '💼 Vue d\'ensemble' },
          { id: 'prize', label: '🏆 Prize pool' },
          { id: 'sponsors', label: '🤝 Marketplace sponsors' },
          { id: 'transactions', label: '↻ Transactions' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
            color: tab === t.id ? 'var(--ink)' : 'var(--muted)',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'overview' && <WalletOverview />}
      {tab === 'prize' && <PrizePool />}
      {tab === 'sponsors' && <SponsorMarket />}
      {tab === 'transactions' && <Transactions />}
    </div>
  );
}

function WalletOverview() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: 28, background: 'linear-gradient(135deg, var(--ink) 0%, #2a2a2a 100%)', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>WALLET NOVA ESPORTS</span>
              <Badge tone="success">✓ Vérifié</Badge>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', lineHeight: 1 }}>
              28 420<span style={{ fontSize: 28, opacity: 0.5 }}>€</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#86efac' }}>↑ +4 280€ ce mois</div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <Btn variant="accent" size="md">↑ Retirer</Btn>
              <Btn variant="ghost" size="md" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>↓ Déposer</Btn>
              <Btn variant="ghost" size="md" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>→ Transférer</Btn>
            </div>
          </div>
          <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <WalletKpi label="Prize money" value="18 200€" sub="6 mois" />
            <WalletKpi label="Sponsors" value="6 800€" sub="récurrent" />
            <WalletKpi label="Subs Twitch" value="2 420€" sub="cumul" />
            <WalletKpi label="Frais" value="-2 100€" sub="streaming, déplacements" tone="red" />
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="REVENUS SUR 6 MOIS" title="Graphique" size="sm" />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '20px 0' }}>
            {[
              { m: 'Jan', v: 35 }, { m: 'Fév', v: 48 }, { m: 'Mar', v: 52 }, { m: 'Avr', v: 71 }, { m: 'Mai', v: 89 }, { m: 'Juin', v: 100 }
            ].map(b => (
              <div key={b.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: '100%', maxWidth: 80, height: `${b.v}%`, background: b.m === 'Juin' ? 'var(--accent)' : 'var(--ink)', borderRadius: '8px 8px 0 0' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{b.m}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="MOYENS DE PAIEMENT" title="Connectés" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PayMethod kind="card" name="Visa ····4729" sub="Principal · expire 02/28" />
            <PayMethod kind="bank" name="IBAN FR··2415" sub="BNP Paribas" />
            <PayMethod kind="paypal" name="nova.esports@..." sub="PayPal Business" />
            <PayMethod kind="stripe" name="Stripe Connect" sub="Pour les sponsors B2B" />
          </div>
          <Btn variant="ghost" size="sm" style={{ marginTop: 10, width: '100%' }}>+ Ajouter un moyen</Btn>
        </Card>
        <Card>
          <SectionTitle kicker="TAXES & CONFORMITÉ" title="📋 Déclaration" size="sm" />
          <div style={{ padding: 14, background: 'var(--mute-bg)', borderRadius: 10, fontSize: 13, lineHeight: 1.5 }}>
            Tous les gains supérieurs à 1 500€ sont déclarés automatiquement. Export fiscal disponible (FR · BE · CH · LU).
          </div>
        </Card>
      </div>
    </div>
  );
}

function WalletKpi({ label, value, sub, tone }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: tone === 'red' ? 'var(--accent)' : 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function PayMethod({ kind, name, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: 'var(--mute-bg)' }}>
      <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11 }}>
        {kind === 'card' ? 'CB' : kind === 'bank' ? 'IBAN' : kind === 'paypal' ? 'PP' : 'STR'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
      </div>
      <Btn variant="ghost" size="sm">⚙</Btn>
    </div>
  );
}

function PrizePool() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #c41e10 100%)', color: '#fff' }}>
          <SectionTitle kicker="REDAK CUP 2026" title="Prize pool 50 000€" size="md" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 13, opacity: 0.85 }}>
            <span>Versé : <strong style={{ fontSize: 16 }}>0€</strong></span>
            <span>En séquestre : <strong style={{ fontSize: 16 }}>50 000€</strong></span>
            <span>Distribution : <strong style={{ fontSize: 16 }}>14/06 · 22h</strong></span>
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="RÉPARTITION CONFIGURÉE" title="Split automatique" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { rank: '🏆 1er', share: 50, amount: 25000, recipient: 'TBD', color: '#facc15' },
              { rank: '🥈 2e', share: 25, amount: 12500, recipient: 'TBD', color: '#94a3b8' },
              { rank: '🥉 3e/4e', share: 12.5, amount: 6250, recipient: 'TBD ×2', color: '#cd7f32' },
              { rank: '5e-8e', share: 3, amount: 1500, recipient: 'TBD ×4', color: 'var(--mute-bg)' },
              { rank: 'MVP tournoi', share: 1, amount: 500, recipient: 'TBD', color: 'var(--accent)' },
            ].map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 100px 100px', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{p.rank}</span>
                <div style={{ position: 'relative', height: 8, background: 'var(--mute-bg)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${p.share * 2}%`, height: '100%', background: p.color }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{p.share}%</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, textAlign: 'right' }}>{p.amount.toLocaleString('fr-FR')}€</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{p.recipient}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="HISTORIQUE PRIZE POOLS" title="6 tournois récents" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { name: 'Redak Cup 2025 — Winter', total: 35000, winner: 'Nova Esports', date: 'Déc 2025' },
              { name: 'EU Masters Spring', total: 60000, winner: 'Kraken Gaming', date: 'Mars 2025' },
              { name: 'Pro Clubs Elite S4', total: 180000, winner: 'Nova Esports', date: 'Fin S4' },
              { name: 'Paris Open 2024', total: 25000, winner: 'Nova Esports', date: 'Oct 2024' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 200px 100px', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{t.name}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, textAlign: 'right' }}>{t.total.toLocaleString('fr-FR')}€</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>🏆 {t.winner}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{t.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="SÉCURITÉ" title="🔒 Escrow Redak" size="sm" />
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>
            Les fonds prize money sont bloqués dès la création du tournoi sur compte séquestre Stripe Connect. Versement automatique au final, ou remboursement complet en cas d'annulation.
          </div>
          <div style={{ marginTop: 12, padding: 10, background: 'var(--mute-bg)', borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
            Compte escrow : ESC-2026-04-RC9·2847
          </div>
        </Card>
        <Card>
          <SectionTitle kicker="FRAIS PLATEFORME" title="0%" size="sm" />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.04em', color: '#16a34a' }}>0€</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Aucune commission Redak. Frais Stripe : 1.4% + 0.25€ par versement.</div>
        </Card>
      </div>
    </div>
  );
}

function SponsorMarket() {
  const opportunities = [
    { brand: 'Logitech G', logo: 'LG', kind: 'Material', value: '€€€', desc: 'Équipement complet pour 5 joueurs + budget activation 8K€', tags: ['EU', 'Tier 1'], expires: '20/06', color: '#00b86b' },
    { brand: 'Red Bull Gaming', logo: 'RB', kind: 'Cash', value: '€€€€', desc: 'Sponsoring jersey · 24K€/an + bonus tournoi', tags: ['Worldwide', 'Tier 1'], expires: '01/07', color: '#ff3b30' },
    { brand: 'PaySafeCard', logo: 'PS', kind: 'Cash', value: '€€', desc: 'Display ads pendant les streams · 4K€/3 mois', tags: ['EU', 'Tier 2'], expires: '15/06', color: '#2547ff' },
    { brand: 'GFuel', logo: 'GF', kind: 'Material', value: '€', desc: 'Stock énergie + code promo 15% revenue share', tags: ['Worldwide'], expires: 'Open', color: '#facc15' },
    { brand: 'Twitch', logo: 'TW', kind: 'Cash', value: '€€€', desc: 'Programme partenariat ambassadeurs · 6K€', tags: ['Streaming'], expires: '30/06', color: '#a855f7' },
    { brand: 'SecretLab', logo: 'SL', kind: 'Material', value: '€€', desc: '5 sièges + cobranding sur 1 an', tags: ['EU', 'Tier 1'], expires: '10/07', color: '#0f0f10' },
  ];
  return (
    <div>
      <Card style={{ background: 'rgba(37,71,255,0.06)', border: '1px solid var(--blue)', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', fontWeight: 700 }}>MARKETPLACE PARTENAIRES</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginTop: 4 }}>14 opportunités correspondent à votre profil</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Basé sur : Nova Esports · 18K fans · Division 1 EU · 6 streamers actifs</div>
          </div>
          <Btn variant="primary" size="md">⚙ Modifier mes critères</Btn>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {opportunities.map(o => (
          <Card key={o.brand} padding={18}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: o.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{o.logo}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{o.brand}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <Badge tone={o.kind === 'Cash' ? 'success' : 'outline'}>{o.kind}</Badge>
                  <Badge tone="warning">{o.value}</Badge>
                  {o.tags.map(t => <Badge key={t} tone="outline">{t}</Badge>)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
              {o.desc}
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>⏳ Deadline : {o.expires}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ghost" size="sm">Détails</Btn>
                <Btn variant="accent" size="sm">📨 Postuler</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Transactions() {
  const txs = [
    { date: '06/06 · 14:32', desc: 'Renouvellement Logitech G — sponsoring annuel', amount: 12000, kind: 'in', cat: 'Sponsor' },
    { date: '05/06 · 18:00', desc: 'Subs Twitch — Mai 2026', amount: 1240, kind: 'in', cat: 'Stream' },
    { date: '04/06 · 09:14', desc: 'Achat équipement caméras (Astra)', amount: -680, kind: 'out', cat: 'Material' },
    { date: '03/06 · 21:42', desc: 'Prize money Redak Cup S5 — finale', amount: 8400, kind: 'in', cat: 'Prize' },
    { date: '02/06 · 16:18', desc: 'Salaire Le0n — Juin', amount: -1800, kind: 'out', cat: 'Salaire' },
    { date: '02/06 · 16:18', desc: 'Salaire Kr1m — Juin', amount: -1500, kind: 'out', cat: 'Salaire' },
    { date: '01/06 · 11:00', desc: 'Red Bull Gaming — activation tournoi', amount: 3500, kind: 'in', cat: 'Sponsor' },
    { date: '30/05 · 19:25', desc: 'Frais Stripe (versement)', amount: -42, kind: 'out', cat: 'Frais' },
  ];
  return (
    <Card padding={0}>
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="primary" size="sm">Toutes</Btn>
          <Btn variant="ghost" size="sm">Entrées</Btn>
          <Btn variant="ghost" size="sm">Sorties</Btn>
        </div>
        <Btn variant="ghost" size="sm">↓ Export CSV/PDF</Btn>
      </div>
      {txs.map((t, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 100px 110px', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{t.date}</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{t.desc}</span>
          <Badge tone="outline">{t.cat}</Badge>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, textAlign: 'right', color: t.kind === 'in' ? '#16a34a' : 'var(--accent)' }}>
            {t.kind === 'in' ? '+' : ''}{t.amount.toLocaleString('fr-FR')}€
          </span>
        </div>
      ))}
    </Card>
  );
}

Object.assign(window, { ScreenBroadcast, ScreenWallet });
