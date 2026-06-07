// landing.jsx — Marketing landing page for the Redak platform

function ScreenLanding({ navTo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: -36 /* break out of main padding */ }}>
      <LandingHero navTo={navTo} />
      <LandingStats />
      <LandingFeatures />
      <LandingFormats />
      <LandingScoreFlow navTo={navTo} />
      <LandingStreaming />
      <LandingTestimonials />
      <LandingPricing />
      <LandingFAQ />
      <LandingCTA navTo={navTo} />
      <LandingFooter />
    </div>
  );
}

// ============================================================
// HERO
// ============================================================
function LandingHero({ navTo }) {
  return (
    <section style={{
      position: 'relative', background: '#0a0a0a', color: '#fff',
      padding: '60px 60px 100px', overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 32px)'
      }} />
      {/* Big accent blob */}
      <div style={{
        position: 'absolute', right: -120, top: -120, width: 480, height: 480,
        background: 'var(--accent)', borderRadius: '50%', opacity: 0.2, filter: 'blur(40px)'
      }} />

      {/* Top nav */}
      <nav style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60 }}>
        <RedakLogo size={28} />
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="#features" style={landingLinkStyle}>Fonctionnalités</a>
          <a href="#formats" style={landingLinkStyle}>Formats</a>
          <a href="#pricing" style={landingLinkStyle}>Tarifs</a>
          <a href="#faq" style={landingLinkStyle}>FAQ</a>
          <Btn variant="ghost" size="md" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }} onClick={() => navTo('dashboard')}>Se connecter</Btn>
          <Btn variant="accent" size="md" onClick={() => navTo('wizard')}>Créer un tournoi</Btn>
        </div>
      </nav>

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 60, alignItems: 'center', maxWidth: 1400, margin: '0 auto' }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
            <Badge tone="live">● 247 tournois en cours</Badge>
            <Badge tone="outline" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>Beta gratuite</Badge>
          </div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(54px, 7.5vw, 110px)', letterSpacing: '-0.05em', lineHeight: 0.92
          }}>
            Le système<br />
            d'exploitation<br />
            de l'<span style={{ color: 'var(--accent)' }}>esport.</span>
          </h1>
          <p style={{ marginTop: 28, fontSize: 19, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', maxWidth: 520 }}>
            Crée des tournois, gère ton club, diffuse tes matchs et fais grandir ta communauté — en une seule plateforme. Joueurs, capitaines et organisateurs sur le même terrain.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
            <Btn variant="accent" size="lg" onClick={() => navTo('wizard')}>Créer mon tournoi · gratuit →</Btn>
            <Btn variant="ghost" size="lg" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }} onClick={() => navTo('event')}>Voir un exemple live</Btn>
          </div>
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 14, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            <span>★★★★★ <strong style={{ color: '#fff' }}>4.8/5</strong></span>
            <span>·</span>
            <span>Utilisé par <strong style={{ color: '#fff' }}>2 400+ clubs</strong></span>
            <span>·</span>
            <span>Sans CB</span>
          </div>
        </div>

        {/* Right preview — fake bracket */}
        <div style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
          borderRadius: 24, padding: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(255,59,48,0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <Badge tone="live">● LIVE NOW</Badge>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
              👁 24K
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 4 }}>
            QF4 · Ember vs Hivemind
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 18 }}>
            Redak Cup 2026 · 78' · 2e MT
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: '#ff8a00', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800 }}>EMB</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Ember</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: 'var(--accent)' }}>2 : 2</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Hivemind</span>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: '#facc15', color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800 }}>HVR</span>
            </div>
          </div>
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 8 }}>FAITS DE MATCH</div>
            {[
              { m: "78'", t: 'Phase actuelle', d: 'Possession Hivemind' },
              { m: "71'", t: 'But · Mu7 (EMB)', d: 'Pénalty transformé' },
              { m: "64'", t: 'But · Dani (EMB)', d: 'Reprise lucarne' },
            ].map((e, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 8, padding: '6px 0', fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)' }}>{e.m}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{e.t}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{e.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
            <Btn variant="accent" size="sm" style={{ flex: 1 }} icon={<SocialIcon kind="twitch" size={12} />}>Twitch</Btn>
            <Btn variant="ghost" size="sm" style={{ flex: 1, borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }} icon={<SocialIcon kind="youtube" size={12} />}>YT</Btn>
            <Btn variant="ghost" size="sm" style={{ flex: 1, borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }} icon={<SocialIcon kind="discord" size={12} />}>Discord</Btn>
          </div>
        </div>
      </div>
    </section>
  );
}

const landingLinkStyle = {
  color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 600,
  fontFamily: 'var(--font-display)'
};

// ============================================================
// STATS BAR
// ============================================================
function LandingStats() {
  return (
    <section style={{ background: 'var(--accent)', color: '#fff', padding: '40px 60px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 32 }}>
        {[
          ['12 480', 'tournois organisés'],
          ['2 400+', 'clubs actifs'],
          ['184K', 'joueurs inscrits'],
          ['8.2M €', 'dotations distribuées'],
          ['47', 'pays'],
        ].map(([v, l]) => (
          <div key={l}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(36px, 4vw, 56px)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// FEATURES
// ============================================================
function LandingFeatures() {
  const features = [
    { icon: '🏆', title: 'Brackets de tous types', text: 'Élimination simple/double, round-robin, suisse, coupe à phases, championnat saison, ladder permanent — tu choisis, on génère.', tag: 'BRACKETS' },
    { icon: '👥', title: 'Gestion club pro', text: 'Effectif, rôles (capitaine, vice-capitaine, streamer officiel), candidatures, tryouts. Tout ce qu\'il faut pour faire grandir un club.', tag: 'CLUBS' },
    { icon: '📺', title: 'Diffusion intégrée', text: 'Twitch, YouTube, Kick, Discord, TikTok Live. Multi-stream, chat unifié, embeds automatiques sur chaque page de match.', tag: 'STREAM' },
    { icon: '📊', title: 'Scores avec preuve', text: 'Les joueurs soumettent les scores avec capture d\'écran. Validation par l\'adversaire ou l\'arbitre. Litiges traités en 24h.', tag: 'SCORES' },
    { icon: '🔓', title: 'Public ou privé', text: 'Tournoi ouvert à tous via lien public, ou réservé à ton club / ta communauté. Tu contrôles qui voit quoi.', tag: 'CONTRÔLE' },
    { icon: '🎬', title: 'Médias riches', text: 'Galerie photos, replays vidéo, highlights, résumés éditoriaux. Chaque match a son histoire.', tag: 'MÉDIAS' },
    { icon: '📱', title: 'Tableaux temps réel', text: 'Classements, calendriers, statistiques — tout se met à jour automatiquement. Spectateurs et joueurs au courant en même temps.', tag: 'LIVE' },
    { icon: '🤝', title: 'Sponsors & dotations', text: 'Affiche tes partenaires sur la page publique. Gère les dotations, paiements et splits prize-money automatiquement.', tag: 'BUSINESS' },
  ];
  return (
    <section id="features" style={{ padding: '100px 60px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 60px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
            FONCTIONNALITÉS
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(40px, 5vw, 72px)', letterSpacing: '-0.04em', lineHeight: 0.95 }}>
            Tout. Au même endroit.
          </h2>
          <p style={{ marginTop: 18, fontSize: 17, color: 'var(--muted)', lineHeight: 1.5 }}>
            Plus besoin de jongler entre Discord, Challonge, Toornament, Twitch et Excel. Redak gère tout, du premier inscrit au trophée final.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24,
              display: 'flex', flexDirection: 'column', gap: 10, minHeight: 220
            }}>
              <div style={{ fontSize: 36, lineHeight: 1 }}>{f.icon}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginTop: 6 }}>{f.tag}</div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FORMATS
// ============================================================
function LandingFormats() {
  const formats = [
    { name: 'Élimination simple', icon: '🏆', d: '8 → 4 → 2 → 1. Rapide, lisible.', games: 16 },
    { name: 'Élimination double', icon: '🔄', d: 'Upper + lower bracket. Seconde chance.', games: 32 },
    { name: 'Round-robin', icon: '🔁', d: 'Tous contre tous. Classement aux points.', games: 28 },
    { name: 'Suisse', icon: '♟', d: 'Appariements par score. 5 à 9 rondes.', games: 12 },
    { name: 'Coupe à phases', icon: '🥇', d: 'Poules + KO. Le format coupe classique.', games: 24 },
    { name: 'Championnat saison', icon: '📅', d: 'Aller-retour sur plusieurs semaines.', games: 18 },
    { name: 'Ladder permanent', icon: '📈', d: 'Saison continue, montée/descente.', games: 9 },
  ];
  return (
    <section id="formats" style={{ padding: '100px 60px', background: 'var(--ink)', color: '#fff' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
              FORMATS DE COMPÉTITION
            </div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(40px, 5vw, 72px)', letterSpacing: '-0.04em', lineHeight: 0.95 }}>
              7 formats.<br/>Tous tes jeux.
            </h2>
            <p style={{ marginTop: 18, fontSize: 17, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, maxWidth: 480 }}>
              Du tournoi LAN entre potes au championnat mondial. EA FC, Call of Duty, Rocket League, Fortnite, ou ton jeu de société préféré — la plateforme s'adapte.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
              {['EA FC 26', 'CoD', 'Fortnite', 'Rocket League', 'Valorant', 'Street Fighter', '+200 autres'].map(g => (
                <Badge key={g} tone="outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>{g}</Badge>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {formats.map(f => (
              <div key={f.name} style={{
                display: 'grid', gridTemplateColumns: '48px 1fr 60px',
                gap: 16, padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 14,
                alignItems: 'center', border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <span style={{ fontSize: 28 }}>{f.icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{f.d}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                  {f.games}K<br/><span style={{ fontSize: 9 }}>JOUÉS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SCORE FLOW
// ============================================================
function LandingScoreFlow({ navTo }) {
  return (
    <section style={{ padding: '100px 60px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
              SCORES VÉRIFIÉS
            </div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '-0.04em', lineHeight: 0.95 }}>
              Les joueurs<br/>soumettent.<br/>
              <span style={{ color: 'var(--accent)' }}>Tout est tracé.</span>
            </h2>
            <p style={{ marginTop: 22, fontSize: 17, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 480 }}>
              Fini les engueulades sur Discord. Les joueurs envoient le score avec une capture d'écran. L'adversaire valide ou conteste. L'arbitre tranche si besoin.
            </p>
            <ol style={{ marginTop: 22, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { n: 1, t: 'Saisie en 30 secondes', d: 'Score + screenshot + commentaire. Mobile-friendly.' },
                { n: 2, t: 'Validation adversaire', d: 'Notif instantanée. Accord en 1 clic.' },
                { n: 3, t: 'Litige → arbitre', d: 'Si désaccord, l\'arbitre voit les deux preuves et tranche.' },
                { n: 4, t: 'Bracket mis à jour', d: 'Avancement automatique au tour suivant.' },
              ].map(s => (
                <li key={s.n} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 14, alignItems: 'start' }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 16, background: 'var(--ink)', color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 800
                  }}>{s.n}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{s.t}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div style={{ marginTop: 28 }}>
              <Btn variant="primary" size="lg" onClick={() => navTo('scores')}>Voir le flow de validation →</Btn>
            </div>
          </div>

          {/* Phone mockup */}
          <div style={{
            background: 'linear-gradient(135deg, #fff 0%, #f8f6ee 100%)',
            border: '1px solid var(--border)', borderRadius: 24, padding: 30
          }}>
            <div style={{
              background: '#0a0a0a', borderRadius: 36, padding: 14, maxWidth: 360, margin: '0 auto',
              boxShadow: '0 30px 80px rgba(0,0,0,0.15)'
            }}>
              <div style={{ background: 'var(--bg)', borderRadius: 26, overflow: 'hidden', padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>21:42</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>● ● ●</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700 }}>
                  ÉTAPE 2 / 3
                </div>
                <h3 style={{ margin: '4px 0 16px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
                  Score final ?
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div style={{ padding: 14, background: 'var(--card)', borderRadius: 12, textAlign: 'center', border: '2px solid var(--accent)' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Toi · NVX</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48, letterSpacing: '-0.04em', color: 'var(--accent)' }}>3</div>
                  </div>
                  <div style={{ padding: 14, background: 'var(--card)', borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Adv. · BLZ</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48, letterSpacing: '-0.04em' }}>1</div>
                  </div>
                </div>
                <MediaPlaceholder label="📸 Preuve — Écran fin de match" tone="cream" height={120} type="photo" rounded={12} />
                <div style={{ marginTop: 14, padding: 12, background: 'var(--mute-bg)', borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}>
                  Cap obligatoire — sera comparée avec celle de l'adversaire.
                </div>
                <button style={{
                  width: '100%', marginTop: 14, padding: '14px',
                  background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 999,
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14
                }}>Soumettre →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// STREAMING SECTION
// ============================================================
function LandingStreaming() {
  return (
    <section style={{ padding: '100px 60px', background: '#0a0a0a', color: '#fff' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <MediaPlaceholder label="STREAM TWITCH · REDAK_OFFICIAL · 24K VIEWERS" tone="dark" height={420} type="video" rounded={20} />
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6 }}>
            <Badge tone="live">● LIVE</Badge>
          </div>
          <div style={{
            position: 'absolute', bottom: -20, right: -20,
            background: 'var(--accent)', color: '#fff', padding: 18,
            borderRadius: 14, transform: 'rotate(-3deg)',
            boxShadow: '0 20px 40px rgba(255,59,48,0.3)'
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em' }}>+ 9 PLATEFORMES</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, marginTop: 2 }}>Multi-stream natif</div>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
            DIFFUSION
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '-0.04em', lineHeight: 0.95 }}>
            Stream where<br/>your fans <span style={{ color: 'var(--accent)' }}>are.</span>
          </h2>
          <p style={{ marginTop: 22, fontSize: 17, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            Twitch, YouTube Live, Kick, Discord, TikTok Live, X… Connecte tes chaînes une fois. Les embeds apparaissent automatiquement sur chaque page de match. Le chat est unifié.
          </p>
          <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {['twitch', 'youtube', 'kick', 'discord', 'x', 'instagram', 'tiktok', 'facebook', 'snapchat'].map(k => (
              <div key={k} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.1)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                }}>
                  <SocialIcon kind={k} size={14} />
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TESTIMONIALS
// ============================================================
function LandingTestimonials() {
  const quotes = [
    { name: 'Marc D.', role: 'Coach Nova Esports', quote: 'On a quitté Toornament + Discord + Excel pour Redak. Gain de temps énorme et les joueurs adorent l\'interface.', color: '#ff3b30' },
    { name: 'Sasha M.', role: 'Casteuse esport pro', quote: 'Le hub diffusion intégré est game-changing. Mes lives ont triplé en spectateurs depuis qu\'on est sur la plateforme.', color: '#2547ff' },
    { name: 'Theo R.', role: 'Capitaine Azur Légion', quote: 'Gérer les candidatures de joueurs est devenu un plaisir. Le système de tryout intégré nous fait gagner 5h/semaine.', color: '#a855f7' },
    { name: 'Lina F.', role: 'Organisatrice LAN', quote: 'J\'ai monté un tournoi de 64 joueurs en 20 minutes. Bracket, calendrier, page publique, tout était prêt.', color: '#16a34a' },
  ];
  return (
    <section style={{ padding: '100px 60px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
            TÉMOIGNAGES
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(36px, 4vw, 56px)', letterSpacing: '-0.04em' }}>
            Ce qu'ils en disent.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
          {quotes.map((q, i) => (
            <div key={i} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 28,
              display: 'flex', flexDirection: 'column', gap: 18
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 60, lineHeight: 0.5, color: q.color, opacity: 0.4 }}>"</span>
              <p style={{ margin: 0, fontSize: 19, lineHeight: 1.5, color: 'var(--ink)', fontWeight: 500 }}>
                {q.quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 22, background: q.color, color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800
                }}>{q.name[0]}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{q.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PRICING
// ============================================================
function LandingPricing() {
  const plans = [
    {
      name: 'Communauté', price: '0 €', period: 'gratuit pour toujours',
      sub: 'Pour les tournois entre potes et petits événements.',
      features: ['Jusqu\'à 16 participants', 'Tournois publics ou privés', 'Bracket simple/double élim', 'Diffusion 1 plateforme', 'Médias 500 Mo'],
      cta: 'Commencer', highlight: false
    },
    {
      name: 'Club', price: '19 €', period: '/ mois',
      sub: 'Pour les clubs amateurs et semi-pro.',
      features: ['Jusqu\'à 128 participants', 'Tous les formats', 'Multi-stream illimité', 'Gestion d\'effectif complète', 'Scores avec preuve', 'Page publique personnalisée', 'Médias 20 Go'],
      cta: 'Essayer 14 jours', highlight: true
    },
    {
      name: 'Pro', price: 'Sur devis', period: 'ligues et organisateurs pro',
      sub: 'Pour les ligues, marques et événements broadcast.',
      features: ['Participants illimités', 'Sponsors & dotations gérés', 'API + intégrations sur mesure', 'White-label complet', 'Support dédié 24/7', 'SLA broadcast 99.99%', 'Médias illimités'],
      cta: 'Nous parler', highlight: false
    },
  ];
  return (
    <section id="pricing" style={{ padding: '100px 60px', background: 'var(--ink)', color: '#fff' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
            TARIFS
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(40px, 5vw, 64px)', letterSpacing: '-0.04em' }}>
            Honnête. Sans surprise.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {plans.map((p, i) => (
            <div key={i} style={{
              background: p.highlight ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
              color: p.highlight ? '#fff' : '#fff',
              border: p.highlight ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18, padding: 32,
              position: 'relative', overflow: 'hidden'
            }}>
              {p.highlight && (
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  background: '#fff', color: 'var(--accent)', padding: '4px 10px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 800
                }}>POPULAIRE</div>
              )}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, fontWeight: 700 }}>
                {p.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 56, letterSpacing: '-0.04em', lineHeight: 1 }}>{p.price}</span>
                <span style={{ fontSize: 13, opacity: 0.7 }}>{p.period}</span>
              </div>
              <p style={{ marginTop: 12, fontSize: 14, opacity: 0.75, lineHeight: 1.5 }}>{p.sub}</p>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '22px 0' }} />
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 9, background: p.highlight ? '#fff' : 'rgba(255,255,255,0.1)',
                      color: p.highlight ? 'var(--accent)' : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800
                    }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button style={{
                width: '100%', marginTop: 24, padding: '14px',
                background: p.highlight ? '#fff' : 'rgba(255,255,255,0.08)',
                color: p.highlight ? 'var(--accent)' : '#fff',
                border: 'none', borderRadius: 999,
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, cursor: 'pointer'
              }}>{p.cta} →</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FAQ
// ============================================================
function LandingFAQ() {
  const faqs = [
    { q: 'Quelle est la différence entre tournoi public et privé ?', a: 'Un tournoi public est visible et inscriptible par tous via un lien partageable. Un tournoi privé est réservé à ton club ou ta communauté — visible uniquement par les membres invités.' },
    { q: 'Qui peut saisir les scores des matchs ?', a: 'Selon ta configuration : les joueurs eux-mêmes (avec preuve obligatoire validée par l\'adversaire), les capitaines de club, ou un arbitre désigné. Tous les cas sont supportés.' },
    { q: 'Comment fonctionne la validation par preuve ?', a: 'Le joueur soumet score + capture d\'écran. L\'adversaire reçoit une notification et valide ou conteste en 24h. En cas de litige, un arbitre tranche en regardant les deux preuves.' },
    { q: 'Puis-je migrer mes données depuis Toornament / Challonge ?', a: 'Oui. Import CSV ou via notre API. Notre équipe peut t\'aider gratuitement pour la migration des tournois importants.' },
    { q: 'Le multi-stream marche-t-il vraiment sur toutes les plateformes ?', a: 'Oui — Twitch, YouTube Live, Kick, Discord Stage, X Live, TikTok Live, Instagram Live, Facebook Gaming. Une seule source de streaming, plusieurs destinations.' },
    { q: 'Vous prenez une commission sur les dotations ?', a: 'Non. 0% de commission. Les dotations passent directement entre toi et tes joueurs. Notre seul revenu est l\'abonnement mensuel.' },
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <section id="faq" style={{ padding: '100px 60px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
            QUESTIONS
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(36px, 4vw, 56px)', letterSpacing: '-0.04em' }}>
            On répond avant que tu demandes.
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden'
            }}>
              <button onClick={() => setOpen(open === i ? -1 : i)} style={{
                width: '100%', padding: 20, background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', textAlign: 'left'
              }}>
                {f.q}
                <span style={{
                  width: 32, height: 32, borderRadius: 16, background: open === i ? 'var(--accent)' : 'var(--mute-bg)',
                  color: open === i ? '#fff' : 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, flexShrink: 0
                }}>{open === i ? '–' : '+'}</span>
              </button>
              {open === i && (
                <div style={{ padding: '0 20px 20px', fontSize: 15, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// CTA
// ============================================================
function LandingCTA({ navTo }) {
  return (
    <section style={{ padding: '100px 60px', background: 'var(--accent)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 32px)'
      }} />
      <div style={{ position: 'relative', maxWidth: 920, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(48px, 6vw, 96px)', letterSpacing: '-0.05em', lineHeight: 0.92 }}>
          Le coup d'envoi,<br/>c'est maintenant.
        </h2>
        <p style={{ marginTop: 24, fontSize: 19, opacity: 0.9, maxWidth: 560, margin: '24px auto 0' }}>
          Crée ton premier tournoi en 5 minutes. Gratuit, sans carte bancaire. Ton club, ta ligue, ton événement — démarre maintenant.
        </p>
        <div style={{ marginTop: 36, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn variant="accent" size="lg" style={{ background: '#fff', color: 'var(--accent)' }} onClick={() => navTo('wizard')}>
            Créer mon tournoi →
          </Btn>
          <Btn variant="ghost" size="lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => navTo('event')}>
            Voir un tournoi live
          </Btn>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================
function LandingFooter() {
  return (
    <footer style={{ background: '#0a0a0a', color: '#fff', padding: '60px 60px 32px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
          <div>
            <RedakLogo size={24} />
            <p style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 280 }}>
              Le système d'exploitation de l'esport. Conçu à Paris pour les organisateurs, les clubs et les joueurs.
            </p>
            <div style={{ marginTop: 20 }}>
              <SocialBar items={[
                { kind: 'twitch' }, { kind: 'youtube' }, { kind: 'discord' },
                { kind: 'x' }, { kind: 'instagram' }, { kind: 'tiktok' }
              ]} />
            </div>
          </div>
          {[
            { title: 'Produit', links: ['Fonctionnalités', 'Formats', 'Tarifs', 'Roadmap', 'Changelog'] },
            { title: 'Pour qui', links: ['Organisateurs', 'Clubs pro', 'Casters', 'Joueurs', 'Sponsors'] },
            { title: 'Ressources', links: ['Documentation', 'API', 'Tutoriels', 'Statut', 'Blog'] },
            { title: 'Entreprise', links: ['À propos', 'Carrières', 'Presse', 'Contact', 'CGU'] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 16 }}>
                {col.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(l => (
                  <a key={l} href="#" onClick={e => e.preventDefault()} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          fontSize: 12, color: 'rgba(255,255,255,0.5)'
        }}>
          <span>© 2026 Redak Esports · Tous droits réservés</span>
          <span>Paris · Made by gamers, for gamers 🎮</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { ScreenLanding });
