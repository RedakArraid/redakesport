// screens-pro3.jsx — Integrations (Discord bot, API, calendar, mobile) + Advanced stats + Game rules

// =============================================================
// INTEGRATIONS HUB
// =============================================================
function ScreenIntegrations({ density }) {
  const [tab, setTab] = React.useState('discord');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <SectionTitle kicker="DÉVELOPPEURS & INTÉGRATIONS" title="Connecter Redak à votre stack" size="lg" />
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'discord', label: '🤖 Bot Discord' },
          { id: 'api', label: '⚡ API & Webhooks' },
          { id: 'calendar', label: '📅 Calendar sync' },
          { id: 'mobile', label: '📱 App mobile' },
          { id: 'others', label: '🔗 Autres' },
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
      {tab === 'discord' && <DiscordBot />}
      {tab === 'api' && <APIHub />}
      {tab === 'calendar' && <CalendarSync />}
      {tab === 'mobile' && <MobileApp />}
      {tab === 'others' && <OtherIntegrations />}
    </div>
  );
}

function DiscordBot() {
  const commands = [
    { cmd: '/match score 3-1 @adversaire', desc: 'Soumettre un score depuis Discord' },
    { cmd: '/match upcoming', desc: 'Voir tes prochains matchs' },
    { cmd: '/club roster', desc: 'Effectif complet du club' },
    { cmd: '/club apply [pseudo]', desc: 'Candidater à rejoindre le club' },
    { cmd: '/bracket [tournoi]', desc: 'Image du bracket en cours' },
    { cmd: '/standings [ligue]', desc: 'Classement actuel' },
    { cmd: '/stream [@joueur]', desc: 'Voir si un joueur est en live' },
    { cmd: '/predict [match]', desc: 'Lance un sondage prédiction live' },
    { cmd: '/highlight [URL twitch]', desc: 'Ajoute un clip à la VOD library' },
    { cmd: '/help', desc: 'Liste des commandes' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card style={{ background: '#5865f2', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SocialIcon kind="discord" size={36} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>BOT DISCORD</div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>Redak Bot</h2>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Installé sur <strong>3 247 serveurs</strong> · ✓ Connecté à Nova Esports</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn size="md" variant="accent" style={{ background: '#fff', color: '#5865f2' }}>+ Installer sur autre serveur</Btn>
              <Btn size="md" variant="ghost" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>⚙ Configurer</Btn>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="COMMANDES SLASH" title={`${commands.length} commandes disponibles`} size="sm" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {commands.map(c => (
              <div key={c.cmd} style={{ padding: 10, borderRadius: 8, background: 'var(--mute-bg)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#5865f2' }}>{c.cmd}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="EXEMPLE DANS DISCORD" title="Aperçu d'une réponse" size="sm" />
          <div style={{ background: '#36393f', borderRadius: 12, padding: 16, color: '#fff', fontFamily: '-apple-system, sans-serif' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 18, background: '#5865f2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><SocialIcon kind="discord" size={16} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14 }}><strong style={{ color: '#5865f2' }}>RedakBot</strong> <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>APP</span> <span style={{ color: '#999', fontSize: 11 }}>aujourd'hui à 21:42</span></div>
                <div style={{ marginTop: 6, padding: 12, borderLeft: '4px solid var(--accent)', background: 'rgba(255,255,255,0.04)', borderRadius: '0 6px 6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>● MATCH LIVE</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, marginTop: 4 }}>EMB 2-2 HVR · QF4</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>78' · 2e mi-temps · prolongations possibles</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button style={{ background: '#5865f2', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📺 Stream</button>
                    <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📊 Stats live</button>
                    <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>🎯 Prédire</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="ACTIVITÉ" title="7 derniers jours" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BotStat label="Commandes exécutées" value="1 247" />
            <BotStat label="Scores soumis via bot" value="42" />
            <BotStat label="Notifications envoyées" value="3 847" />
            <BotStat label="Brackets affichés" value="89" />
          </div>
        </Card>
        <Card>
          <SectionTitle kicker="WEBHOOKS" title="Notifications config" size="sm" />
          {[
            { event: 'Nouveau match créé', channel: '#agenda', on: true },
            { event: 'Score validé', channel: '#scores', on: true },
            { event: 'Litige déclaré', channel: '#staff', on: true },
            { event: 'Stream démarré', channel: '#general', on: true },
            { event: 'Candidature reçue', channel: '#recrutement', on: true },
            { event: 'Transfert finalisé', channel: '#mercato', on: false },
          ].map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: w.on ? '#16a34a' : 'var(--border)' }} />
              <div style={{ flex: 1, fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>{w.event}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{w.channel}</div>
              </div>
              <Btn variant="ghost" size="sm">{w.on ? 'ON' : 'OFF'}</Btn>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function BotStat({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, background: 'var(--mute-bg)' }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{value}</span>
    </div>
  );
}

function APIHub() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="CLÉS API" title="Authentification" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Production', key: 'rdk_prod_8f4a2c1e9d3b7a6...', scope: 'read+write', used: 'il y a 4min' },
              { name: 'Staging', key: 'rdk_stag_2c1e9d3b7a6f8f4...', scope: 'read+write', used: 'il y a 2h' },
              { name: 'Public read-only', key: 'rdk_pub_3b7a6f8f4a2c1e9...', scope: 'read', used: 'temps réel' },
            ].map(k => (
              <div key={k.name} style={{ padding: 14, borderRadius: 10, background: 'var(--mute-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>{k.name}</span>
                  <Badge tone={k.scope === 'read' ? 'outline' : 'success'}>{k.scope}</Badge>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 10px', background: 'var(--card)', borderRadius: 6 }}>
                    {k.key}
                  </span>
                  <Btn variant="ghost" size="sm">📋</Btn>
                  <Btn variant="ghost" size="sm">↻</Btn>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Dernière utilisation : {k.used}</div>
              </div>
            ))}
          </div>
          <Btn variant="accent" size="sm" style={{ marginTop: 12 }}>+ Créer une nouvelle clé</Btn>
        </Card>

        <Card>
          <SectionTitle kicker="ENDPOINTS POPULAIRES" title="REST API v2" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { m: 'GET', url: '/tournaments/{id}/bracket', desc: 'Bracket complet avec résultats' },
              { m: 'GET', url: '/tournaments/{id}/standings', desc: 'Classement en temps réel' },
              { m: 'POST', url: '/matches/{id}/score', desc: 'Soumettre un score avec preuve' },
              { m: 'GET', url: '/clubs/{id}/roster', desc: 'Effectif et rôles d\'un club' },
              { m: 'GET', url: '/players/{id}/stats', desc: 'Stats carrière d\'un joueur' },
              { m: 'GET', url: '/streams/live', desc: 'Liste des streams actifs' },
              { m: 'POST', url: '/webhooks', desc: 'Créer un webhook' },
            ].map(e => (
              <div key={e.url} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center', gap: 12, padding: 8, borderRadius: 6, background: 'var(--mute-bg)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, padding: '3px 6px', borderRadius: 3, background: e.m === 'GET' ? '#16a34a' : e.m === 'POST' ? 'var(--accent)' : '#2547ff', color: '#fff', textAlign: 'center' }}>{e.m}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{e.url}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn variant="ghost" size="sm">📖 Documentation complète →</Btn>
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="EXEMPLE" title="curl" size="sm" />
          <pre style={{ margin: 0, padding: 16, background: 'var(--ink)', color: '#fff', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 12, overflow: 'auto', lineHeight: 1.6 }}>
{`curl -X POST https://api.redak.gg/v2/matches/qf4/score \\
  -H "Authorization: Bearer rdk_prod_8f4..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "score_a": 3,
    "score_b": 1,
    "proof_url": "https://...",
    "submitted_by": "p_le0n"
  }'`}
          </pre>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="USAGE" title="Ce mois" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BotStat label="Requêtes API" value="48 247" />
            <BotStat label="Webhooks envoyés" value="3 891" />
            <BotStat label="Erreurs 4xx" value="142" />
            <BotStat label="Latence p95" value="48ms" />
          </div>
        </Card>
        <Card>
          <SectionTitle kicker="WEBHOOKS ACTIFS" title="4 endpoints" size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { url: 'streamlabs.com/wh/...', status: 'ok' },
              { url: 'novaesports.com/api/...', status: 'ok' },
              { url: 'sheets.google.com/...', status: 'ok' },
              { url: 'staging.example.com/...', status: 'error' },
            ].map((w, i) => (
              <div key={i} style={{ padding: 8, borderRadius: 6, background: 'var(--mute-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{w.url}</span>
                  <Badge tone={w.status === 'ok' ? 'success' : 'live'}>● {w.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function CalendarSync() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="CALENDRIERS CONNECTÉS" title="Synchronisation" size="md" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: 'Google Calendar', email: 'le0n@nova.gg', sync: 'bidirectionnel', last: 'il y a 2min', on: true, color: '#4285f4' },
              { name: 'Apple iCloud', email: 'le0n@me.com', sync: 'lecture seule', last: 'il y a 4h', on: true, color: '#0a0a0a' },
              { name: 'Microsoft Outlook', email: '—', sync: '—', last: 'jamais', on: false, color: '#0078d4' },
              { name: 'iCal export (URL)', email: 'webcal://redak.gg/...', sync: 'lecture seule', last: 'temps réel', on: true, color: '#71706b' },
            ].map(c => (
              <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 140px 110px 80px', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, background: 'var(--mute-bg)' }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>{c.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{c.email}</div>
                </div>
                <Badge tone="outline">{c.sync}</Badge>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{c.last}</span>
                <Btn variant={c.on ? 'ghost' : 'primary'} size="sm">{c.on ? '⚙' : 'Lier'}</Btn>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle kicker="DÉTECTION DE CONFLITS" title="Vérificateur de dispo" size="sm" />
          <div style={{ padding: 14, background: 'rgba(250,204,21,0.08)', border: '1px solid #facc15', borderRadius: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>2 conflits détectés cette semaine</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Vyx absent samedi 19h (vacances), Astra a un cours universitaire mercredi.</div>
              </div>
              <Btn variant="primary" size="sm">Voir détail</Btn>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Lorsque tu planifies un match, Redak vérifie les calendriers de tous les joueurs concernés et signale les indispos avant que tu valides l'horaire.
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Card>
          <SectionTitle kicker="URL ICAL" title="Export universel" size="sm" />
          <div style={{ padding: 12, background: 'var(--mute-bg)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all' }}>
            webcal://redak.gg/cal/<strong>nvx-le0n-2c1e9d3b</strong>.ics
          </div>
          <Btn variant="primary" size="sm" style={{ marginTop: 10, width: '100%' }}>📋 Copier le lien</Btn>
        </Card>
        <Card>
          <SectionTitle kicker="NOTIFICATIONS" title="Rappels matchs" size="sm" />
          {[
            { when: '24h avant', on: true },
            { when: '2h avant', on: true },
            { when: '15 min avant', on: true },
            { when: 'À l\'heure de coup d\'envoi', on: true },
            { when: 'Si retard détecté', on: false },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
              <span style={{ fontSize: 13 }}>{r.when}</span>
              <Btn variant="ghost" size="sm">{r.on ? '✓' : ' '}</Btn>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function MobileApp() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 22 }}>
      <Card padding={32} style={{ background: 'var(--ink)', color: '#fff' }}>
        <SectionTitle kicker="APPLICATION MOBILE" title="Redak — iOS & Android" size="md" />
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginTop: 8 }}>
          Soumettre un score depuis le canapé. Suivre un match dans le métro. Recevoir une notif quand ton club recrute. L'app fait tout ce que le web fait, en plus rapide.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 22 }}>
          <Btn variant="accent" size="md" style={{ background: '#fff', color: '#0a0a0a' }}>🍎 App Store</Btn>
          <Btn variant="accent" size="md" style={{ background: '#fff', color: '#0a0a0a' }}>🤖 Google Play</Btn>
        </div>
        <div style={{ marginTop: 28, padding: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>QR CODE INSTALL</div>
          <div style={{ width: 120, height: 120, background: '#fff', borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)', padding: 8 }}>
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} style={{ background: Math.random() > 0.5 ? '#0a0a0a' : 'transparent' }} />
            ))}
          </div>
        </div>
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <MobileKpi label="Téléchargements" value="84K" />
          <MobileKpi label="★ App Store" value="4.8" />
          <MobileKpi label="DAU" value="22K" />
        </div>
      </Card>

      <PhoneMockup
        kicker="QF4 EN COURS"
        title="EMB 2-2 HVR"
        subtitle="78' · 2e mi-temps"
        content={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,59,48,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span><strong>71'</strong> Mu7 (EMB)</span>
              <span style={{ color: 'var(--accent)' }}>● BUT</span>
            </div>
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,59,48,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span><strong>64'</strong> Dani (EMB)</span>
              <span style={{ color: 'var(--accent)' }}>● BUT</span>
            </div>
            <Btn variant="accent" size="sm" style={{ width: '100%', marginTop: 6 }}>📺 Regarder en live</Btn>
          </div>
        }
      />
      <PhoneMockup
        kicker="SOUMETTRE UN SCORE"
        title="Étape 2 / 3"
        subtitle="Score & preuve"
        content={
          <div style={{ padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,59,48,0.06)', borderRadius: 8, border: '2px solid var(--accent)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>Toi</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, color: 'var(--accent)' }}>3</div>
              </div>
              <div style={{ textAlign: 'center', padding: 10, background: 'var(--mute-bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>Adv.</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36 }}>1</div>
              </div>
            </div>
            <MediaPlaceholder label="📸 Preuve" tone="cream" height={80} type="photo" rounded={8} />
            <Btn variant="primary" size="sm" style={{ width: '100%', marginTop: 10 }}>Continuer →</Btn>
          </div>
        }
      />
    </div>
  );
}

function PhoneMockup({ kicker, title, subtitle, content }) {
  return (
    <div style={{ background: '#0a0a0a', borderRadius: 32, padding: 10, height: 'fit-content', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
      <div style={{ background: 'var(--bg)', borderRadius: 24, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
          <span>21:42</span>
          <span>●●●</span>
        </div>
        <div style={{ padding: '0 16px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 800 }}>{kicker}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, marginTop: 2 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{subtitle}</div>
        </div>
        {content}
      </div>
    </div>
  );
}

function MobileKpi({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 }}>{label}</div>
    </div>
  );
}

function OtherIntegrations() {
  const integrations = [
    { name: 'Twitch API', desc: 'Embeds streams + clips auto', logo: 'twitch', on: true },
    { name: 'YouTube Data', desc: 'Live + uploads + statistiques', logo: 'youtube', on: true },
    { name: 'EA Sports API', desc: 'Stats matchs EA FC officielles', logo: '🎮', on: true },
    { name: 'Stripe Connect', desc: 'Paiements & escrow prize money', logo: '💳', on: true },
    { name: 'Slack', desc: 'Notifications dans Slack', logo: '◧', on: false },
    { name: 'Zapier', desc: '3 000+ automatisations possibles', logo: '⚡', on: true },
    { name: 'Streamlabs', desc: 'Alerts + donations', logo: '🎤', on: true },
    { name: 'Sheets / Excel', desc: 'Export auto vers Google Sheets', logo: '📊', on: false },
    { name: 'OBS Studio', desc: 'Overlays + scene auto', logo: '🎬', on: true },
    { name: 'Notion', desc: 'Sync club docs + roadmap', logo: '📓', on: false },
    { name: 'Trello', desc: 'Tâches & roadmap club', logo: '📋', on: false },
    { name: 'Microsoft Teams', desc: 'Notifs équipes & coachs', logo: 'M', on: false },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      {integrations.map(i => (
        <Card key={i.name} padding={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 48, height: 48, borderRadius: 10, background: i.on ? 'var(--ink)' : 'var(--mute-bg)', color: i.on ? '#fff' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              {['twitch', 'youtube'].includes(i.logo) ? <SocialIcon kind={i.logo} size={22} /> : i.logo}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{i.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{i.desc}</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            {i.on
              ? <Btn variant="ghost" size="sm" style={{ width: '100%' }}>✓ Connecté</Btn>
              : <Btn variant="primary" size="sm" style={{ width: '100%' }}>+ Connecter</Btn>}
          </div>
        </Card>
      ))}
    </div>
  );
}

// =============================================================
// ADVANCED STATS + RULES
// =============================================================
function ScreenAdvanced({ density }) {
  const [tab, setTab] = React.useState('stats');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <SectionTitle kicker="STATS & RÈGLEMENTS" title="Analytics avancées" size="lg" />
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'stats', label: '📈 Stats avancées' },
          { id: 'compare', label: '🆚 Comparateur' },
          { id: 'heatmap', label: '🔥 Heatmaps' },
          { id: 'rules', label: '📜 Règlements par jeu' },
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
      {tab === 'stats' && <AdvancedStats />}
      {tab === 'compare' && <PlayerCompare />}
      {tab === 'heatmap' && <Heatmaps />}
      {tab === 'rules' && <GameRules />}
    </div>
  );
}

function AdvancedStats() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatTile label="xG (buts attendus)" value="32.4" sub="vs 38 réels · efficacité +17%" accent />
        <StatTile label="Possession moyenne" value="58%" sub="2e ligue" />
        <StatTile label="PPDA (pression haute)" value="6.8" sub="passes adv avant action déf" />
        <StatTile label="Pace de jeu" value="HIGH" sub="142 actions/match" />
      </div>

      <Card>
        <SectionTitle kicker="ÉVOLUTION SUR 19 MATCHS" title="xG vs Buts réels" size="sm" />
        <div style={{ position: 'relative', height: 240, padding: '20px 0' }}>
          <svg viewBox="0 0 600 200" style={{ width: '100%', height: '100%' }}>
            {/* Grid */}
            {[0, 1, 2, 3, 4].map(i => (
              <line key={i} x1="40" y1={i * 50} x2="600" y2={i * 50} stroke="var(--border)" strokeDasharray="2 4" />
            ))}
            {/* xG line */}
            <polyline
              fill="none" stroke="var(--blue)" strokeWidth="2"
              points={Array.from({ length: 19 }).map((_, i) => `${40 + i * 30},${100 - Math.sin(i * 0.4) * 30 - Math.random() * 10}`).join(' ')}
            />
            {/* Goals line */}
            <polyline
              fill="none" stroke="var(--accent)" strokeWidth="3"
              points={Array.from({ length: 19 }).map((_, i) => `${40 + i * 30},${80 - Math.sin(i * 0.3 + 0.5) * 35 - Math.random() * 10}`).join(' ')}
            />
            {/* Markers */}
            {Array.from({ length: 19 }).map((_, i) => (
              <circle key={i} cx={40 + i * 30} cy={80 - Math.sin(i * 0.3 + 0.5) * 35 - 5} r="3" fill="var(--accent)" />
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 18, position: 'absolute', top: 0, right: 0, fontSize: 11 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>● Buts réels</span>
            <span style={{ color: 'var(--blue)', fontWeight: 700 }}>● xG</span>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        <Card>
          <SectionTitle kicker="ZONES DE BUT" title="D'où viennent les buts ?" size="sm" />
          <div style={{ position: 'relative', aspectRatio: '3/2', background: 'linear-gradient(180deg, #1f8a5b, #166a44)', borderRadius: 12, overflow: 'hidden' }}>
            <svg viewBox="0 0 100 67" style={{ position: 'absolute', inset: 0, width: '100%' }}>
              <rect x="2" y="2" width="96" height="63" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
              <rect x="2" y="18" width="22" height="31" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
              <rect x="76" y="18" width="22" height="31" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
              <circle cx="50" cy="33.5" r="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
            </svg>
            {[
              { x: 82, y: 32, r: 8, c: 'rgba(255,59,48,0.6)' },
              { x: 78, y: 28, r: 6, c: 'rgba(255,59,48,0.5)' },
              { x: 85, y: 38, r: 5, c: 'rgba(255,59,48,0.5)' },
              { x: 70, y: 33, r: 7, c: 'rgba(255,59,48,0.4)' },
              { x: 88, y: 25, r: 4, c: 'rgba(255,59,48,0.3)' },
              { x: 65, y: 40, r: 3, c: 'rgba(255,59,48,0.3)' },
              { x: 60, y: 28, r: 3, c: 'rgba(255,59,48,0.2)' },
            ].map((s, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
                width: `${s.r * 2}%`, height: `${s.r * 2}%`, borderRadius: '50%',
                background: s.c, transform: 'translate(-50%, -50%)'
              }} />
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            68% des buts dans la surface · 22% sur centres · 10% coups francs / corners
          </div>
        </Card>
        <Card>
          <SectionTitle kicker="STYLE DE JEU" title="Radar tactique" size="sm" />
          <div style={{ position: 'relative', aspectRatio: '1/1' }}>
            <svg viewBox="-110 -110 220 220" style={{ width: '100%' }}>
              {[20, 40, 60, 80, 100].map(r => (
                <circle key={r} cx="0" cy="0" r={r} fill="none" stroke="var(--border)" strokeDasharray="2 3" />
              ))}
              {['Attaque', 'Possession', 'Pressing', 'Défense', 'Transition', 'Set pieces'].map((axis, i) => {
                const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
                return (
                  <g key={axis}>
                    <line x1="0" y1="0" x2={Math.cos(angle) * 100} y2={Math.sin(angle) * 100} stroke="var(--border)" strokeWidth="0.5" />
                    <text x={Math.cos(angle) * 108} y={Math.sin(angle) * 108} fontSize="9" textAnchor="middle" dominantBaseline="middle" fill="var(--muted)" fontFamily="var(--font-mono)">{axis}</text>
                  </g>
                );
              })}
              <polygon
                points={[85, 70, 90, 60, 75, 80].map((v, i) => {
                  const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
                  return `${Math.cos(angle) * v},${Math.sin(angle) * v}`;
                }).join(' ')}
                fill="rgba(255,59,48,0.2)" stroke="var(--accent)" strokeWidth="2"
              />
            </svg>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlayerCompare() {
  return (
    <Card>
      <SectionTitle kicker="COMPARATEUR" title="Le0n vs Bj0rn (KRA)" size="md"
        action={<Btn variant="ghost" size="sm">+ Ajouter un 3ᵉ joueur</Btn>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 14, alignItems: 'center', marginBottom: 18, padding: 18, background: 'var(--ink)', color: '#fff', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800 }}>L</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>Le0n</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>NVX · ATT · 22 ans</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, opacity: 0.5 }}>VS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>Bj0rn</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>KRA · ATT · 25 ans</div>
          </div>
          <span style={{ width: 48, height: 48, borderRadius: 24, background: '#2547ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800 }}>B</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          ['Matchs joués', 142, 138],
          ['Buts', 28, 24],
          ['Passes décisives', 12, 18],
          ['Note moyenne', 8.4, 8.2],
          ['MVP', 31, 24],
          ['% Victoires', 69, 72],
          ['Précision passes', 88, 84],
          ['Buts attendus (xG)', 26.4, 22.1],
          ['Distance/match', 11.2, 10.8],
          ['Cartons jaunes', 4, 8],
        ].map(([l, a, b]) => {
          const aPct = (a / (a + b)) * 100;
          const aBetter = a >= b;
          return (
            <div key={l}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: aBetter ? 'var(--ink)' : 'var(--muted)' }}>{a}</span>
                <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'center' }}>{l}</span>
                <span style={{ color: !aBetter ? 'var(--ink)' : 'var(--muted)', textAlign: 'right' }}>{b}</span>
              </div>
              <div style={{ display: 'flex', height: 6, background: 'var(--mute-bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${aPct}%`, background: 'var(--accent)' }} />
                <div style={{ width: `${100 - aPct}%`, background: 'var(--blue)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Heatmaps() {
  return (
    <Card>
      <SectionTitle kicker="HEATMAP — LE0N · SAISON 5" title="Zones d'activité" size="md" />
      <div style={{ position: 'relative', aspectRatio: '3/2', background: 'linear-gradient(180deg, #1f8a5b, #166a44)', borderRadius: 14, overflow: 'hidden' }}>
        <svg viewBox="0 0 100 67" style={{ position: 'absolute', inset: 0, width: '100%' }}>
          <rect x="2" y="2" width="96" height="63" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
          <line x1="50" y1="2" x2="50" y2="65" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
          <circle cx="50" cy="33.5" r="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
          <rect x="2" y="18" width="22" height="31" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
          <rect x="76" y="18" width="22" height="31" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
        </svg>
        {/* Heat zones */}
        {[
          { x: 75, y: 34, r: 18, opacity: 0.55 },
          { x: 82, y: 30, r: 12, opacity: 0.6 },
          { x: 68, y: 38, r: 14, opacity: 0.5 },
          { x: 60, y: 30, r: 10, opacity: 0.45 },
          { x: 88, y: 36, r: 10, opacity: 0.6 },
          { x: 78, y: 50, r: 8, opacity: 0.4 },
          { x: 50, y: 35, r: 6, opacity: 0.25 },
        ].map((h, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${h.x}%`, top: `${h.y}%`,
            width: `${h.r * 2}%`, height: `${h.r * 2}%`,
            borderRadius: '50%', transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(255,59,48,${h.opacity}) 0%, transparent 70%)`,
            filter: 'blur(4px)'
          }} />
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SmallStat label="Zone principale" value="ATT droite" tone="red" />
        <SmallStat label="% temps adv. surface" value="34%" />
        <SmallStat label="Touches/match" value="68.2" />
        <SmallStat label="Récupérations" value="3.4" />
      </div>
    </Card>
  );
}

function GameRules() {
  const games = [
    { name: 'EA FC 26', icon: '⚽', rules: ['Durée mi-temps: 6 min', 'Difficulté: Légende', 'Vitesse: Normale', 'Pas de prolongations en BO1', 'TAB après prolongations en BO3+', 'Squad: Réelle + Stadium uniquement', 'Sauvegarde obligatoire après chaque match'] },
    { name: 'Call of Duty', icon: '◉', rules: ['Mode: Search & Destroy / Hardpoint / Control', 'Cartes: pool compétitif officiel', '4v4 sur LAN ou serveurs dédiés', 'Killcam désactivée', 'Armes ban list selon saison', 'Pause stratégique: 2/équipe par map'] },
    { name: 'Fortnite', icon: '◆', rules: ['Mode: Battle Royale custom lobby', 'Format: 10 squads max', 'Pas de farming hors zone', 'Pas de "tabouret tactique"', 'Stream delay 5min obligatoire', 'Loot map: officielle compétitive'] },
    { name: 'Rocket League', icon: '◐', rules: ['Durée: 5min standard / 6min compétitif', 'Pas de respawn delay', 'Cartes: pool compétitif (DFH, Mannfield, etc.)', 'Mutators désactivés', 'BO5 en finale, BO3 ailleurs', 'Pause: 2/équipe par série'] },
    { name: 'Valorant', icon: '◊', rules: ['Mode: Standard 5v5', 'Cartes: pool VCT en vigueur', 'Veto map: 1-2-2 standard', 'BO3 group, BO5 finale', 'Cheat pause autorisée', 'OBS recording obligatoire pour replays'] },
    { name: 'Street Fighter 6', icon: '✊', rules: ['Format: BO3 sets, FT2 (best of 3 rounds per match)', 'Stage: Random / Training', 'Pas de Modern Controls en pro', 'Pause: aucune', 'Caractères: full roster autorisé', 'Bracket: double élim recommandé'] },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
      {games.map(g => (
        <Card key={g.name} padding={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{g.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{g.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.rules.length} règles · Template officiel</div>
            </div>
            <Btn variant="ghost" size="sm">📋</Btn>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--ink)' }}>
            {g.rules.slice(0, 5).map((r, i) => <li key={i}>{r}</li>)}
            {g.rules.length > 5 && <li style={{ color: 'var(--muted)' }}>+ {g.rules.length - 5} autres règles</li>}
          </ul>
          <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
            <Btn variant="ghost" size="sm" style={{ flex: 1 }}>Voir tout</Btn>
            <Btn variant="primary" size="sm" style={{ flex: 1 }}>+ Utiliser ce template</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

Object.assign(window, { ScreenIntegrations, ScreenAdvanced });
