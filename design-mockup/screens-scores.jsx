// screens-scores.jsx — Score submission flow + validation queue + settings tweaks

// =============================================================
// SCORES SCREEN — soumissions, en attente, litiges, historique
// =============================================================
function ScreenScores({ density, isAdmin }) {
  const [tab, setTab] = React.useState('submit');

  const tabs = [
    { id: 'submit', label: 'Soumettre un score', icon: '+' },
    { id: 'pending', label: 'À valider', icon: '⏳', count: SCORE_QUEUE.pending.length },
    { id: 'disputes', label: 'Litiges', icon: '⚠', count: SCORE_QUEUE.disputes.length, hot: true },
    { id: 'history', label: 'Historique', icon: '✓', count: SCORE_QUEUE.history.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <SectionTitle kicker="VALIDATION DES SCORES" title="Scores avec preuve" size="lg"
        action={<Btn variant="accent" size="md" onClick={() => setTab('submit')}>+ Soumettre un score</Btn>}
      />

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
            color: tab === t.id ? 'var(--ink)' : 'var(--muted)',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap'
          }}>
            <span>{t.icon}</span>
            {t.label}
            {t.count != null && (
              <span style={{
                background: t.hot ? 'var(--accent)' : (tab === t.id ? 'var(--ink)' : 'var(--mute-bg)'),
                color: t.hot || tab === t.id ? '#fff' : 'var(--muted)',
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                fontFamily: 'var(--font-mono)', fontWeight: 800
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'submit' && <ScoreSubmit />}
      {tab === 'pending' && <ScorePending isAdmin={isAdmin} />}
      {tab === 'disputes' && <ScoreDisputes isAdmin={isAdmin} />}
      {tab === 'history' && <ScoreHistory />}
    </div>
  );
}

// ============================================================
// SUBMIT FLOW (3 steps)
// ============================================================
function ScoreSubmit() {
  const [step, setStep] = React.useState(1);
  const [score, setScore] = React.useState({ a: 3, b: 1 });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 22 }}>
      <Card padding={28}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {['Match', 'Score & preuve', 'Confirmation'].map((l, i) => (
            <div key={l} style={{
              flex: 1, padding: '10px 14px', borderRadius: 8,
              background: step === i + 1 ? 'var(--ink)' : step > i + 1 ? 'rgba(22,163,74,0.1)' : 'var(--mute-bg)',
              color: step === i + 1 ? 'var(--card)' : step > i + 1 ? '#16a34a' : 'var(--muted)',
              cursor: 'pointer'
            }} onClick={() => setStep(i + 1)}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>
                Étape {i + 1}{step > i + 1 && ' ✓'}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {step === 1 && <SubmitStep1 onNext={() => setStep(2)} />}
        {step === 2 && <SubmitStep2 score={score} setScore={setScore} onNext={() => setStep(3)} />}
        {step === 3 && <SubmitStep3 score={score} />}
      </Card>

      {/* Sidebar — context */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>
            QUI PEUT SOUMETTRE ?
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.7, color: 'var(--ink)' }}>
            <li>Les <strong>2 joueurs</strong> du match</li>
            <li>Le <strong>capitaine</strong> de chaque club (mode équipe)</li>
            <li>Un <strong>arbitre désigné</strong> par l'organisateur</li>
          </ul>
        </Card>
        <Card style={{ background: 'rgba(255,59,48,0.04)', border: '1px solid var(--accent)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>
            ⚠ PREUVE OBLIGATOIRE
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
            Capture d'écran du score final ou vidéo (max 30 s) requise. Sans preuve, le score sera rejeté automatiquement.
          </div>
        </Card>
        <Card>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>
            DÉLAIS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <Row label="Soumission" value="dans les 30 min" />
            <Row label="Validation adversaire" value="24h" />
            <Row label="Arbitrage (si litige)" value="48h" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SubmitStep1({ onNext }) {
  const matches = [
    { id: 'm1', round: 'QF4', a: 't3', b: 't6', date: 'Aujourd\'hui · 21h', status: 'live' },
    { id: 'm2', round: 'Pro Clubs J19', a: 't1', b: 't2', date: 'Demain · 20h', status: 'upcoming' },
    { id: 'm3', round: 'QF1', a: 't1', b: 't8', date: '11/06 · 17h', status: 'done' },
  ];
  const [sel, setSel] = React.useState('m3');
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 1 / 3" title="De quel match s'agit-il ?" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 20 }}>Sélectionne le match dont tu veux soumettre le score.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {matches.map(m => {
          const a = teamById(m.a), b = teamById(m.b);
          const active = sel === m.id;
          return (
            <div key={m.id} onClick={() => setSel(m.id)} style={{
              border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 12, padding: 14, cursor: 'pointer',
              background: active ? 'rgba(255,59,48,0.04)' : 'var(--card)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 12, border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800
                }}>{active ? '✓' : ''}</span>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '90px 1fr auto 1fr 100px', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.round}</span>
                  <TeamRow team={a} size={26} showCountry={false} />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--muted)' }}>VS</span>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <TeamRow team={b} size={26} showCountry={false} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusPill status={m.status} />
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{m.date}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="accent" onClick={onNext}>Continuer →</Btn>
      </div>
    </div>
  );
}

function SubmitStep2({ score, setScore, onNext }) {
  const [proof, setProof] = React.useState(true);
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 2 / 3" title="Score & preuve" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 24 }}>Saisis le score final et joins une capture d'écran (obligatoire).</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 18, alignItems: 'center', padding: 22, background: 'var(--mute-bg)', borderRadius: 14 }}>
        <ScoreInput team={teamById('t1')} value={score.a} onChange={(v) => setScore({ ...score, a: v })} side="left" />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, color: 'var(--muted)' }}>:</div>
        <ScoreInput team={teamById('t8')} value={score.b} onChange={(v) => setScore({ ...score, b: v })} side="right" />
      </div>

      <div style={{ marginTop: 24 }}>
        <FormField label="Preuve du score" sub="Capture d'écran du tableau final (obligatoire) + vidéo optionnelle.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <ProofSlot label="📸 Capture obligatoire" filled={proof} onClick={() => setProof(!proof)} />
            <ProofSlot label="🎬 Vidéo (optionnel)" filled={false} />
          </div>
        </FormField>
      </div>

      <div style={{ marginTop: 18 }}>
        <FormField label="Commentaire" sub="Optionnel — précise un détail particulier sur le match.">
          <textarea placeholder="Ex : 'Le score s'affiche 3-1, mais EA FC a planté à la fin du match. Reprise immédiate.'" style={{
            width: '100%', minHeight: 90, padding: 12, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--card)',
            fontFamily: 'inherit', fontSize: 14, resize: 'vertical', outline: 'none'
          }} />
        </FormField>
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="accent" onClick={onNext}>Continuer →</Btn>
      </div>
    </div>
  );
}

function ProofSlot({ label, filled, onClick }) {
  return (
    <div onClick={onClick} style={{
      border: `2px dashed ${filled ? '#16a34a' : 'var(--border)'}`,
      background: filled ? 'rgba(22,163,74,0.05)' : 'var(--card)',
      borderRadius: 12, padding: 18, textAlign: 'center', cursor: 'pointer', minHeight: 140,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8
    }}>
      {filled ? (
        <>
          <MediaPlaceholder label="match-end.png · 2.4 Mo" tone="cream" height={80} type="photo" rounded={8} />
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginTop: 6 }}>✓ Preuve attachée</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 28 }}>📁</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Glisser-déposer ou cliquer</div>
        </>
      )}
    </div>
  );
}

function ScoreInput({ team, value, onChange, side }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
        <TeamMark team={team} size={32} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{team.name}</span>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--card)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} style={{
          width: 36, height: 36, borderRadius: 8, border: 'none', background: 'var(--mute-bg)',
          fontSize: 18, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-display)'
        }}>–</button>
        <div style={{
          width: 80, textAlign: 'center', fontFamily: 'var(--font-display)',
          fontWeight: 800, fontSize: 44, letterSpacing: '-0.04em', color: 'var(--accent)'
        }}>{value}</div>
        <button onClick={() => onChange(value + 1)} style={{
          width: 36, height: 36, borderRadius: 8, border: 'none', background: 'var(--accent)',
          color: '#fff', fontSize: 18, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-display)'
        }}>+</button>
      </div>
    </div>
  );
}

function SubmitStep3({ score }) {
  return (
    <div>
      <SectionTitle kicker="ÉTAPE 3 / 3" title="Vérification finale" size="md" />
      <p style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 22 }}>
        Vérifie tout avant d'envoyer. L'adversaire sera notifié et aura 24h pour valider ou contester.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 18, padding: 24, background: 'var(--ink)', color: '#fff', borderRadius: 16, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <TeamMark team={teamById('t1')} size={56} />
          <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{teamById('t1').name}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', textAlign: 'center' }}>
          {score.a} <span style={{ color: 'var(--accent)' }}>:</span> {score.b}
        </div>
        <div style={{ textAlign: 'center' }}>
          <TeamMark team={teamById('t8')} size={56} />
          <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{teamById('t8').name}</div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <SmallStat label="Vainqueur" value={score.a > score.b ? teamById('t1').tag : teamById('t8').tag} tone="red" />
        <SmallStat label="Preuve" value="✓ Jointe" />
        <SmallStat label="Signataire" value="Le0n" sub="Capitaine NVX" />
      </div>

      <div style={{ marginTop: 24, padding: 18, background: 'var(--mute-bg)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <input type="checkbox" defaultChecked style={{ marginTop: 4 }} />
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            Je certifie que le score est exact et que la capture d'écran est authentique. Toute fausse soumission peut entraîner une exclusion du tournoi.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <Btn variant="ghost">Brouillon</Btn>
        <Btn variant="accent" size="lg">✓ Soumettre le score</Btn>
      </div>
    </div>
  );
}

// ============================================================
// PENDING / DISPUTES / HISTORY
// ============================================================
function ScorePending({ isAdmin }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid #facc15' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⏳</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
              {SCORE_QUEUE.pending.length} scores en attente de ta validation
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Tu as 24h pour valider ou contester chaque score.</div>
          </div>
        </div>
      </Card>
      {SCORE_QUEUE.pending.map(s => <ScoreRow key={s.id} score={s} mode="pending" />)}
    </div>
  );
}

function ScoreDisputes({ isAdmin }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
              {SCORE_QUEUE.disputes.length} litige{SCORE_QUEUE.disputes.length > 1 ? 's' : ''} en cours
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>L'arbitre doit comparer les preuves et trancher.</div>
          </div>
        </div>
      </Card>
      {SCORE_QUEUE.disputes.map(s => <ScoreRow key={s.id} score={s} mode="dispute" isAdmin={isAdmin} />)}
    </div>
  );
}

function ScoreHistory() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {SCORE_QUEUE.history.map(s => <ScoreRow key={s.id} score={s} mode="history" />)}
    </div>
  );
}

function ScoreRow({ score, mode, isAdmin }) {
  const a = teamById(score.a), b = teamById(score.b);
  return (
    <Card padding={0}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 0 }}>
        <div style={{ padding: 20, borderRight: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Badge tone="outline">{score.round}</Badge>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Soumis par {score.submittedBy} · {score.submittedAt}</span>
            <span style={{ flex: 1 }} />
            {mode === 'pending' && <Badge tone="warning">En attente</Badge>}
            {mode === 'dispute' && <Badge tone="live">⚠ LITIGE</Badge>}
            {mode === 'history' && <Badge solid tone="success">✓ Validé</Badge>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TeamMark team={a} size={40} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{score.declaredBy?.a || 'Joueur A'}</div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ScoreBig a={score.sa} b={score.sb} size={36} />
              {mode === 'dispute' && score.altScore && (
                <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                  vs revendiqué {score.altScore.a}:{score.altScore.b}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{score.declaredBy?.b || 'Joueur B'}</div>
              </div>
              <TeamMark team={b} size={40} />
            </div>
          </div>
          {score.comment && (
            <div style={{ marginTop: 14, padding: 12, background: 'var(--mute-bg)', borderRadius: 10, fontSize: 13, color: 'var(--ink)' }}>
              💬 « {score.comment} »
            </div>
          )}
          {mode === 'dispute' && score.disputeReason && (
            <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,59,48,0.06)', borderRadius: 10, fontSize: 13, color: 'var(--ink)', border: '1px solid var(--accent)' }}>
              <strong style={{ color: 'var(--accent)' }}>Contestation :</strong> {score.disputeReason}
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {mode === 'pending' && (
              <>
                <Btn variant="accent" size="sm">✓ Valider le score</Btn>
                <Btn variant="ghost" size="sm">⚠ Contester</Btn>
                <Btn variant="ghost" size="sm">📷 Voir la preuve</Btn>
              </>
            )}
            {mode === 'dispute' && isAdmin && (
              <>
                <Btn variant="accent" size="sm">Trancher en faveur de {a.tag}</Btn>
                <Btn variant="primary" size="sm">Trancher en faveur de {b.tag}</Btn>
                <Btn variant="ghost" size="sm">Demander à rejouer</Btn>
              </>
            )}
            {mode === 'history' && (
              <Btn variant="ghost" size="sm">📷 Voir la preuve</Btn>
            )}
          </div>
        </div>
        <div style={{ padding: 18, background: 'var(--mute-bg)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>
            PREUVES
          </div>
          <MediaPlaceholder label="📸 Capture · soumise" tone="cream" height={120} type="photo" rounded={10} />
          {mode === 'dispute' && (
            <div style={{ marginTop: 8 }}>
              <MediaPlaceholder label="📸 Capture · contre-preuve" tone="red" height={120} type="photo" rounded={10} />
            </div>
          )}
          {mode !== 'dispute' && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              Soumise il y a {score.submittedAt}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Mock data for the score queue
const SCORE_QUEUE = {
  pending: [
    { id: 'sc1', round: 'Pro Clubs J18', a: 't4', b: 't13', sa: 3, sb: 0, submittedBy: 'Yu7o (capitaine PXL)', submittedAt: '14 min', declaredBy: { a: 'Yu7o', b: 'Luca' }, comment: 'Match propre, RAS.' },
    { id: 'sc2', round: 'QF1 — Tournoi Local', a: 't9', b: 't15', sa: 2, sb: 1, submittedBy: 'Pau (Solar Riot)', submittedAt: '47 min', declaredBy: { a: 'Pau', b: 'Kuba' } },
    { id: 'sc3', round: 'Poule B', a: 't7', b: 't10', sa: 4, sb: 2, submittedBy: 'Theo (AZR)', submittedAt: '1h22', declaredBy: { a: 'Theo', b: 'Boon' }, comment: 'Reprise après déconnexion à la 38\'.' },
  ],
  disputes: [
    {
      id: 'sc4', round: 'QF3', a: 't2', b: 't7', sa: 3, sb: 0,
      submittedBy: 'Bj0rn (KRA)', submittedAt: 'il y a 5h',
      declaredBy: { a: 'Bj0rn', b: 'Theo' },
      disputeReason: 'Theo (AZR) revendique un score de 3-2 et conteste l\'invalidation d\'un but à la 89e minute.',
      altScore: { a: 3, b: 2 }
    },
  ],
  history: [
    { id: 'sc5', round: 'QF2', a: 't4', b: 't5', sa: 2, sb: 3, submittedBy: 'Yuto', submittedAt: '11/06', declaredBy: { a: 'Yuto', b: 'Lukas' } },
    { id: 'sc6', round: 'QF1', a: 't1', b: 't8', sa: 3, sb: 1, submittedBy: 'Le0n', submittedAt: '11/06', declaredBy: { a: 'Le0n', b: 'Owen' } },
    { id: 'sc7', round: 'Pro Clubs J17', a: 't1', b: 't6', sa: 3, sb: 1, submittedBy: 'Le0n', submittedAt: '04/06', declaredBy: { a: 'Le0n', b: 'Jin' } },
    { id: 'sc8', round: 'Pro Clubs J16', a: 't2', b: 't3', sa: 2, sb: 2, submittedBy: 'Bj0rn', submittedAt: '01/06', declaredBy: { a: 'Bj0rn', b: 'Ravi' } },
  ]
};

Object.assign(window, { ScreenScores, SCORE_QUEUE });
