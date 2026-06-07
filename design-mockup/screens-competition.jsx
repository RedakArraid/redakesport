// screens-competition.jsx — Bracket, Groups, Standings

// =============================================================
// BRACKET (single-elim, with creative variant)
// =============================================================
function ScreenBracket({ creative, density }) {
  const [tab, setTab] = React.useState('mirror');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <SectionTitle kicker="PHASE FINALE" title="Bracket — Redak Cup 2026" size="lg" />
        <div style={{ display: 'flex', gap: 6 }}>
          {[['mirror', 'Symétrique 16'], ['single', 'Élim. simple 8'], ['double', 'Élim. double']].map(([k, l]) => (
            <Btn key={k} size="sm" variant={tab === k ? 'primary' : 'ghost'} onClick={() => setTab(k)}>{l}</Btn>
          ))}
        </div>
      </div>

      {tab === 'mirror' && <BracketMirror />}
      {tab === 'single' && (creative ? <BracketCreative /> : <BracketClassic />)}
      {tab === 'double' && <BracketDouble creative={creative} />}

      <Card>
        <SectionTitle kicker="LÉGENDE" title="Lecture du tableau" size="sm" />
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
          <LegendItem color="var(--accent)" label="Match en cours" />
          <LegendItem color="var(--ink)" label="Match joué" />
          <LegendItem color="var(--border)" label="Match à venir" border />
          <LegendItem color="var(--blue)" label="Vainqueur qualifié" />
        </div>
      </Card>
    </div>
  );
}

function LegendItem({ color, label, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: border ? 'transparent' : color, border: `1px solid ${color}` }} />
      {label}
    </span>
  );
}

// ============================
// CLASSIC bracket
// ============================
function BracketClassic() {
  const rounds = BRACKET_SE.rounds;
  const matchHeight = 92;
  const colGap = 60;
  const roundWidth = 240;

  return (
    <Card padding={32} style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: colGap, alignItems: 'center', minWidth: rounds.length * (roundWidth + colGap) }}>
        {rounds.map((round, ri) => {
          const spacing = matchHeight * Math.pow(2, ri);
          return (
            <div key={ri} style={{ display: 'flex', flexDirection: 'column', gap: spacing - matchHeight, minWidth: roundWidth, position: 'relative' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4,
                paddingBottom: 8, borderBottom: '1px solid var(--border)'
              }}>
                {round.name} <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· {round.matches.length} match{round.matches.length > 1 ? 's' : ''}</span>
              </div>
              {round.matches.map((m, mi) => (
                <BracketMatchClassic key={m.id} m={m} isLast={ri === rounds.length - 1}
                  topOffset={ri > 0 ? (spacing / 2 - matchHeight / 2) : 0}
                  connector={ri < rounds.length - 1} />
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BracketMatchClassic({ m, connector, isLast }) {
  const isLive = m.status === 'live';
  const isUpcoming = m.status === 'upcoming';
  const a = teamById(m.a), b = teamById(m.b);
  const winnerA = m.sa != null && m.sb != null && m.sa > m.sb;
  const winnerB = m.sa != null && m.sb != null && m.sb > m.sa;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
        marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase',
        display: 'flex', justifyContent: 'space-between'
      }}>
        <span>{m.id.toUpperCase()}</span><span>{m.date}</span>
      </div>
      <div style={{
        border: `1px solid ${isLive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12, background: 'var(--card)',
        overflow: 'hidden',
        boxShadow: isLive ? '0 0 0 3px rgba(255,59,48,0.12)' : 'none',
        ...(isLast ? { borderColor: 'var(--ink)', boxShadow: '0 0 0 3px rgba(0,0,0,0.08)' } : {})
      }}>
        <BracketSide team={a} score={m.sa} winner={winnerA} isLive={isLive} />
        <div style={{ height: 1, background: 'var(--border)' }} />
        <BracketSide team={b} score={m.sb} winner={winnerB} isLive={isLive} />
      </div>
      {isLive && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          background: 'var(--accent)', color: '#fff', padding: '2px 7px', borderRadius: 4,
          fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', fontWeight: 800
        }}>● LIVE</div>
      )}
      {/* Connector to next round */}
      {connector && (
        <svg width="60" height="2" style={{
          position: 'absolute', right: -60, top: '50%', transform: 'translateY(-50%)'
        }}>
          <line x1="0" y1="1" x2="60" y2="1" stroke="var(--border)" strokeWidth="1.5" />
        </svg>
      )}
    </div>
  );
}

function BracketSide({ team, score, winner, isLive }) {
  const undecided = score == null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: winner ? 'var(--mute-bg)' : 'transparent',
      opacity: undecided && !team ? 0.5 : 1
    }}>
      {team ? <TeamMark team={team} size={28} /> : <TeamMark team={null} size={28} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: winner ? 800 : 600,
          fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>{team ? team.name : 'Vainqueur précédent'}</div>
        {team && <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{team.tag} · {flag(team.country)}</div>}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20,
        color: isLive ? 'var(--accent)' : (winner ? 'var(--ink)' : 'var(--muted)'),
        minWidth: 24, textAlign: 'right'
      }}>{score ?? '–'}</div>
    </div>
  );
}

// ============================
// CREATIVE bracket — circular / radial / unconventional
// ============================
function BracketCreative() {
  // A creative concentric layout: finale at center, semis around, quarters outside
  return (
    <Card padding={32}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, position: 'relative', minHeight: 600 }}>
          <svg viewBox="-300 -300 600 600" style={{ width: '100%', maxWidth: 720, display: 'block', margin: '0 auto' }}>
            {/* Concentric rings */}
            <circle cx="0" cy="0" r="280" fill="none" stroke="var(--border)" strokeDasharray="2 4" />
            <circle cx="0" cy="0" r="180" fill="none" stroke="var(--border)" strokeDasharray="2 4" />
            <circle cx="0" cy="0" r="80" fill="none" stroke="var(--accent)" strokeWidth="2" />

            {/* Quarters — 4 at outer ring */}
            {BRACKET_SE.rounds[0].matches.map((m, i) => {
              const angle = (i / 4) * 2 * Math.PI - Math.PI / 2;
              const x = Math.cos(angle) * 240;
              const y = Math.sin(angle) * 240;
              return <BracketNodeSVG key={m.id} cx={x} cy={y} m={m} label="QF" />;
            })}
            {/* Semis — 2 at mid ring */}
            {BRACKET_SE.rounds[1].matches.map((m, i) => {
              const angle = (i === 0 ? -Math.PI / 2 : Math.PI / 2);
              const x = Math.cos(angle) * 140;
              const y = Math.sin(angle) * 140;
              return <BracketNodeSVG key={m.id} cx={x} cy={y} m={m} label="SF" />;
            })}
            {/* Finale — center */}
            <BracketNodeSVG cx={0} cy={0} m={BRACKET_SE.rounds[2].matches[0]} label="🏆 FINALE" big />

            {/* Connecting lines */}
            {[0, 1, 2, 3].map(i => {
              const angle = (i / 4) * 2 * Math.PI - Math.PI / 2;
              const semiAngle = (i < 2 ? -Math.PI / 2 : Math.PI / 2);
              return (
                <line key={i}
                  x1={Math.cos(angle) * 218}
                  y1={Math.sin(angle) * 218}
                  x2={Math.cos(semiAngle) * 156}
                  y2={Math.sin(semiAngle) * 156}
                  stroke="var(--border)" strokeWidth="1.5" />
              );
            })}
            {[0, 1].map(i => {
              const semiAngle = (i === 0 ? -Math.PI / 2 : Math.PI / 2);
              return (
                <line key={i}
                  x1={Math.cos(semiAngle) * 116}
                  y1={Math.sin(semiAngle) * 116}
                  x2={Math.cos(semiAngle) * 60}
                  y2={Math.sin(semiAngle) * 60}
                  stroke="var(--border)" strokeWidth="1.5" />
              );
            })}
          </svg>
        </div>
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>
            Vue radiale
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--muted)', margin: 0 }}>
            La finale au centre, les demi-finales à mi-rayon, les quarts à la périphérie. La progression converge visuellement vers le trophée.
          </p>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BRACKET_SE.rounds.map(r => (
              <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>{r.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.matches.length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function BracketNodeSVG({ cx, cy, m, label, big }) {
  const a = teamById(m.a), b = teamById(m.b);
  const r = big ? 60 : 44;
  const isLive = m.status === 'live';
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r={r} fill="var(--card)" stroke={isLive ? 'var(--accent)' : 'var(--ink)'} strokeWidth={big ? 2 : 1.5} />
      <text textAnchor="middle" y={-r * 0.55} fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)" letterSpacing="0.1em">
        {label}
      </text>
      <text textAnchor="middle" y={-4} fontSize={big ? 16 : 13} fontFamily="var(--font-display)" fontWeight="800" fill={a ? a.color : 'var(--muted)'}>
        {a ? a.tag : '?'}
      </text>
      <text textAnchor="middle" y={big ? 14 : 10} fontSize="10" fontFamily="var(--font-mono)" fontWeight="700" fill="var(--ink)">
        {m.sa ?? '–'} – {m.sb ?? '–'}
      </text>
      <text textAnchor="middle" y={big ? 30 : 22} fontSize={big ? 16 : 13} fontFamily="var(--font-display)" fontWeight="800" fill={b ? b.color : 'var(--muted)'}>
        {b ? b.tag : '?'}
      </text>
      {isLive && (
        <circle cx={r * 0.7} cy={-r * 0.7} r="6" fill="var(--accent)">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

// ============================
// DOUBLE elimination — upper + lower bracket
// ============================
function BracketDouble({ creative }) {
  return (
    <Card padding={28}>
      <div style={{ display: 'grid', gridTemplateRows: 'auto auto', gap: 32 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
            Upper Bracket — invaincus
          </div>
          <UpperLowerRow rounds={['UB-R1', 'UB-R2', 'UB-Finale']} winners={[3, 2, 1]} accent="var(--accent)" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 12 }}>
            Lower Bracket — repêchage
          </div>
          <UpperLowerRow rounds={['LB-R1', 'LB-R2', 'LB-R3', 'LB-Finale']} winners={[4, 3, 2, 1]} accent="var(--blue)" />
        </div>
        <div style={{
          marginTop: 8, padding: 18, background: 'var(--ink)', color: 'var(--card)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
              GRANDE FINALE
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
              🏆 Vainqueur UB vs Vainqueur LB · BO7
            </div>
          </div>
          <Badge tone="outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--card)' }}>15/06 · 20:00</Badge>
        </div>
      </div>
    </Card>
  );
}

function UpperLowerRow({ rounds, winners, accent }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rounds.length}, 1fr)`, gap: 16 }}>
      {rounds.map((r, i) => (
        <div key={r} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {r} · {winners[i]} match{winners[i] > 1 ? 's' : ''}
          </div>
          {Array.from({ length: Math.min(winners[i], 3) }).map((_, j) => {
            const t1 = TEAMS[(i + j) % TEAMS.length];
            const t2 = TEAMS[(i + j + 8) % TEAMS.length];
            return (
              <div key={j} style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <TeamMark team={t1} size={18} />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t1.tag}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11 }}>2</span>
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <TeamMark team={t2} size={18} />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t2.tag}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, color: 'var(--muted)' }}>1</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// =============================================================
// MIRROR BRACKET — symmetric playoff layout (16 teams, left + right converging to center final)
// =============================================================
function BracketMirror() {
  // 16-team KO ladder, symmetric. Top 8 seeds left, bottom 8 right.
  const left = [
    { r: 'r16', m: [
      { a: 't1', b: 't12', sa: 3, sb: 1, status: 'done' },
      { a: 't4', b: 't5', sa: 1, sb: 2, status: 'done' },
      { a: 't7', b: 't6', sa: 2, sb: 3, status: 'done' },
      { a: 't8', b: 't10', sa: 3, sb: 2, status: 'done' },
    ]},
    { r: 'qf', m: [
      { a: 't1', b: 't5', sa: 2, sb: 1, status: 'done' },
      { a: 't6', b: 't8', sa: null, sb: null, status: 'live' },
    ]},
    { r: 'sf', m: [
      { a: 't1', b: null, sa: null, sb: null, status: 'upcoming' },
    ]}
  ];
  const right = [
    { r: 'r16', m: [
      { a: 't2', b: 't16', sa: 3, sb: 0, status: 'done' },
      { a: 't3', b: 't11', sa: 4, sb: 1, status: 'done' },
      { a: 't9', b: 't15', sa: 2, sb: 1, status: 'done' },
      { a: 't13', b: 't14', sa: 1, sb: 3, status: 'done' },
    ]},
    { r: 'qf', m: [
      { a: 't2', b: 't3', sa: null, sb: null, status: 'upcoming' },
      { a: 't9', b: 't14', sa: null, sb: null, status: 'upcoming' },
    ]},
    { r: 'sf', m: [
      { a: null, b: null, sa: null, sb: null, status: 'upcoming' },
    ]}
  ];

  // Layout constants
  const H = 720;
  const cardW = 134;
  const cardH = 64;
  const colGap = 18;

  // x positions: R16-L, QF-L, SF-L, FINAL, SF-R, QF-R, R16-R
  const totalCols = 7;
  const totalW = totalCols * cardW + (totalCols - 1) * colGap;

  const colX = Array.from({ length: 7 }).map((_, i) => i * (cardW + colGap));

  const counts = [4, 2, 1, 1, 1, 2, 4]; // matches per column

  return (
    <Card padding={24}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
          PLAYOFFS · 16 ÉQUIPES
        </div>
        <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>
          Tableau symétrique
        </h3>
      </div>

      <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 8 }}>
        <div style={{ position: 'relative', width: totalW, height: H, margin: '0 auto', minWidth: totalW }}>

          {/* Round headers */}
          {[
            { x: colX[0], label: '1/8 de finale' },
            { x: colX[1], label: 'Quarts' },
            { x: colX[2], label: 'Demis' },
            { x: colX[3], label: '🏆 Finale' },
            { x: colX[4], label: 'Demis' },
            { x: colX[5], label: 'Quarts' },
            { x: colX[6], label: '1/8 de finale' },
          ].map((h, i) => (
            <div key={i} style={{
              position: 'absolute', left: h.x, top: -2, width: cardW,
              textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: i === 3 ? 'var(--accent)' : 'var(--muted)',
              fontWeight: 700
            }}>{h.label}</div>
          ))}

          {/* CENTER TROPHY — between SF-L and FINAL columns, behind everything */}
          <div style={{
            position: 'absolute', left: colX[3] - 4, top: H * 0.5,
            transform: 'translateY(-50%)',
            width: cardW + 8, textAlign: 'center', pointerEvents: 'none', zIndex: 0
          }}>
            <div style={{
              fontSize: 64, lineHeight: 1, marginBottom: -8, opacity: 0.06
            }}>🏆</div>
          </div>

          {/* SVG connectors */}
          <svg width={totalW} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <Connectors counts={counts} colX={colX} cardW={cardW} cardH={cardH} H={H} />
          </svg>

          {/* LEFT SIDE — render columns 0,1,2 */}
          {left.map((col, ci) => (
            <RenderColumn key={`l${ci}`} matches={col.m} round={col.r} side="left"
              x={colX[ci]} count={counts[ci]} cardW={cardW} cardH={cardH} H={H} />
          ))}

          {/* FINAL — column 3 */}
          <FinalCard x={colX[3]} cardW={cardW} cardH={cardH} top={H / 2} />

          {/* RIGHT SIDE — columns 4,5,6 (SF, QF, R16) */}
          {right.map((col, ci) => {
            const colIndex = 6 - ci; // SF→4, QF→5, R16→6
            return (
              <RenderColumn key={`r${ci}`} matches={col.m} round={col.r} side="right"
                x={colX[colIndex]} count={counts[colIndex]} cardW={cardW} cardH={cardH} H={H} />
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MirrorLegend label="16 équipes" sub="Top 8 vs Bottom 8 seeds" />
        <MirrorLegend label="BO3 jusqu'à la demi" sub="Finale en BO7" />
        <MirrorLegend label="11 / 15 matchs joués" sub="QF en cours" tone="live" />
        <MirrorLegend label="Finale le 14/06" sub="20h00 · La Défense Arena" />
      </div>
    </Card>
  );
}

function MirrorLegend({ label, sub, tone }) {
  return (
    <div style={{ padding: 14, borderRadius: 12, background: tone === 'live' ? 'rgba(255,59,48,0.08)' : 'var(--mute-bg)', border: tone === 'live' ? '1px solid var(--accent)' : '1px solid transparent' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, letterSpacing: '-0.005em' }}>
        {tone === 'live' && <span style={{ color: 'var(--accent)' }}>● </span>}{label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function RenderColumn({ matches, round, side, x, count, cardW, cardH, H }) {
  return (
    <>
      {matches.map((m, i) => {
        const cy = ((i + 0.5) / count) * H;
        const top = cy - cardH / 2;
        return (
          <MirrorMatch key={i} m={m} x={x} top={top} cardW={cardW} cardH={cardH} round={round} side={side} />
        );
      })}
    </>
  );
}

function MirrorMatch({ m, x, top, cardW, cardH, round, side }) {
  const a = teamById(m.a), b = teamById(m.b);
  const isLive = m.status === 'live';
  const isDone = m.status === 'done';
  const winnerA = isDone && m.sa > m.sb;
  const winnerB = isDone && m.sb > m.sa;
  return (
    <div style={{
      position: 'absolute', left: x, top, width: cardW, height: cardH,
      background: 'var(--card)',
      border: `1.5px solid ${isLive ? 'var(--accent)' : 'var(--ink)'}`,
      borderRadius: 8, overflow: 'hidden', zIndex: 2,
      boxShadow: isLive ? '0 0 0 3px rgba(255,59,48,0.15)' : 'none',
    }}>
      <MirrorSide team={a} score={m.sa} winner={winnerA} live={isLive} />
      <div style={{ height: 1, background: 'var(--border)' }} />
      <MirrorSide team={b} score={m.sb} winner={winnerB} live={isLive} />
      {isLive && (
        <div style={{
          position: 'absolute', top: -8, right: 6,
          background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: 3,
          fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', fontWeight: 800
        }}>● LIVE</div>
      )}
    </div>
  );
}

function MirrorSide({ team, score, winner, live }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px',
      height: '50%',
      background: winner ? 'var(--mute-bg)' : 'transparent',
      opacity: team ? 1 : 0.5
    }}>
      {team ? <TeamMark team={team} size={20} /> : (
        <div style={{ width: 20, height: 20, borderRadius: 4, border: '1px dashed var(--border)' }} />
      )}
      <span style={{
        flex: 1, fontFamily: 'var(--font-display)', fontWeight: winner ? 800 : 600,
        fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        letterSpacing: '-0.005em'
      }}>{team ? team.tag : '—'}</span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13,
        color: live ? 'var(--accent)' : (winner ? 'var(--ink)' : 'var(--muted)'),
        minWidth: 14, textAlign: 'right'
      }}>{score ?? '–'}</span>
    </div>
  );
}

function FinalCard({ x, cardW, cardH, top }) {
  const finalH = 96;
  return (
    <div style={{
      position: 'absolute', left: x, top: top - finalH / 2,
      width: cardW, height: finalH, zIndex: 3,
      background: 'var(--ink)', color: 'var(--card)',
      borderRadius: 10, border: '2px solid var(--accent)',
      boxShadow: '0 8px 24px rgba(255,59,48,0.25)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 8
    }}>
      <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 4 }}>🏆</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 800
      }}>GRANDE FINALE</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13,
        letterSpacing: '-0.01em', textAlign: 'center', marginTop: 2
      }}>14/06 · 20h00</div>
      <div style={{ fontSize: 9, opacity: 0.6, fontFamily: 'var(--font-mono)', marginTop: 2 }}>BO7</div>
    </div>
  );
}

// Connector lines between bracket cards
function Connectors({ counts, colX, cardW, cardH, H }) {
  const lines = [];
  const stroke = 'var(--ink)';
  const strokeW = 1.5;

  // For each round transition (left side: 0→1, 1→2; right side: 6→5, 5→4)
  // a pair of matches in column N merge into 1 match in column N+1 (or N-1 for right)

  function pushPairConnector(fromCount, toCount, fromX, toX, fromSide) {
    // fromCount > toCount, each toMatch i merges fromMatches 2i & 2i+1
    for (let i = 0; i < toCount; i++) {
      const aIdx = 2 * i, bIdx = 2 * i + 1;
      const aY = ((aIdx + 0.5) / fromCount) * H;
      const bY = ((bIdx + 0.5) / fromCount) * H;
      const targetY = ((i + 0.5) / toCount) * H;

      // For left side (fromSide=L): line goes from right edge of From card → midpoint → into From of To card (Right side)
      if (fromSide === 'L') {
        const fromRight = fromX + cardW;
        const midX = (fromRight + toX) / 2;
        // horizontal from each card right edge to midX
        lines.push(<line key={`l-${i}-a`} x1={fromRight} y1={aY} x2={midX} y2={aY} stroke={stroke} strokeWidth={strokeW} />);
        lines.push(<line key={`l-${i}-b`} x1={fromRight} y1={bY} x2={midX} y2={bY} stroke={stroke} strokeWidth={strokeW} />);
        // vertical joining them
        lines.push(<line key={`v-${i}`} x1={midX} y1={aY} x2={midX} y2={bY} stroke={stroke} strokeWidth={strokeW} />);
        // horizontal from midX center to next card left edge
        lines.push(<line key={`h-${i}`} x1={midX} y1={targetY} x2={toX} y2={targetY} stroke={stroke} strokeWidth={strokeW} />);
      } else {
        // right side mirrored
        const fromLeft = fromX;
        const toRight = toX + cardW;
        const midX = (fromLeft + toRight) / 2;
        lines.push(<line key={`r-${i}-a`} x1={fromLeft} y1={aY} x2={midX} y2={aY} stroke={stroke} strokeWidth={strokeW} />);
        lines.push(<line key={`r-${i}-b`} x1={fromLeft} y1={bY} x2={midX} y2={bY} stroke={stroke} strokeWidth={strokeW} />);
        lines.push(<line key={`rv-${i}`} x1={midX} y1={aY} x2={midX} y2={bY} stroke={stroke} strokeWidth={strokeW} />);
        lines.push(<line key={`rh-${i}`} x1={midX} y1={targetY} x2={toRight} y2={targetY} stroke={stroke} strokeWidth={strokeW} />);
      }
    }
  }

  // Left: col 0 (4) → col 1 (2)
  pushPairConnector(4, 2, colX[0], colX[1], 'L');
  // Left: col 1 (2) → col 2 (1)
  pushPairConnector(2, 1, colX[1], colX[2], 'L');
  // Left: col 2 (1) → final col 3
  const sfLY = ((0 + 0.5) / 1) * H;
  lines.push(<line key="ltf-h" x1={colX[2] + cardW} y1={sfLY} x2={colX[3]} y2={sfLY} stroke={stroke} strokeWidth={strokeW} />);

  // Right: col 6 (4) → col 5 (2)
  pushPairConnector(4, 2, colX[6], colX[5], 'R');
  // Right: col 5 (2) → col 4 (1)
  pushPairConnector(2, 1, colX[5], colX[4], 'R');
  // Right: col 4 (1) → final col 3
  const sfRY = ((0 + 0.5) / 1) * H;
  lines.push(<line key="rtf-h" x1={colX[4]} y1={sfRY} x2={colX[3] + cardW} y2={sfRY} stroke={stroke} strokeWidth={strokeW} />);

  return <g>{lines}</g>;
}

// =============================================================
// GROUPS / POULES
// =============================================================
function ScreenGroups({ density }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <SectionTitle kicker="PHASE DE GROUPES" title="Poules — Redak Cup 2026" size="lg"
        action={<div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" size="sm">Exporter CSV</Btn>
          <Btn variant="primary" size="sm">Voir bracket →</Btn>
        </div>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
        {GROUPS.map(g => <GroupCard key={g.name} group={g} density={density} />)}
      </div>

      <Card>
        <SectionTitle kicker="VISUALISATION" title="Matrice des confrontations" size="sm" />
        <p style={{ color: 'var(--muted)', marginTop: -10, marginBottom: 16, fontSize: 13 }}>
          Vue d'ensemble des résultats poule par poule. Cliquez sur une case pour le détail.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {GROUPS.map(g => <ConfrontationMatrix key={g.name} group={g} />)}
        </div>
      </Card>
    </div>
  );
}

function GroupCard({ group, density }) {
  return (
    <Card padding={density === 'compact' ? 16 : 22}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
          {group.name}
        </h3>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {group.rows.reduce((s, r) => s + r.mp, 0) / 2}/6 matchs · Round-robin
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr 28px 28px 28px 28px 38px 44px',
        gap: 4, fontSize: 11, fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)',
        paddingBottom: 8, borderBottom: '1px solid var(--border)'
      }}>
        <span>#</span><span>Équipe</span><span style={{ textAlign: 'center' }}>MJ</span>
        <span style={{ textAlign: 'center' }}>V</span><span style={{ textAlign: 'center' }}>N</span>
        <span style={{ textAlign: 'center' }}>D</span><span style={{ textAlign: 'center' }}>+/–</span>
        <span style={{ textAlign: 'right' }}>Pts</span>
      </div>
      {group.rows.map((row, i) => {
        const t = teamById(row.team);
        const qualified = i < 2;
        return (
          <div key={row.team} style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr 28px 28px 28px 28px 38px 44px',
            gap: 4, alignItems: 'center', padding: '10px 0',
            borderBottom: i < group.rows.length - 1 ? '1px solid var(--border)' : 'none',
            position: 'relative'
          }}>
            {qualified && <div style={{ position: 'absolute', left: -22, top: 14, width: 4, height: 18, borderRadius: 2, background: 'var(--accent)' }} />}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: qualified ? 'var(--accent)' : 'var(--muted)' }}>{i + 1}</span>
            <TeamRow team={t} size={26} showCountry={false} />
            <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{row.mp}</span>
            <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{row.w}</span>
            <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>{row.d}</span>
            <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>{row.l}</span>
            <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              <span style={{ color: 'var(--ink)' }}>{row.gf}</span>
              <span style={{ color: 'var(--muted)' }}>:</span>
              <span style={{ color: 'var(--muted)' }}>{row.ga}</span>
            </span>
            <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{row.pts}</span>
          </div>
        );
      })}
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 12, background: 'var(--accent)', borderRadius: 2 }} />
        Qualifié pour les quarts de finale
      </div>
    </Card>
  );
}

function ConfrontationMatrix({ group }) {
  const teams = group.teams.map(teamById);
  // synthesize 6 results (round-robin 4 teams)
  const results = {
    '0-1': '3-1', '0-2': '2-0', '0-3': '4-1',
    '1-2': '1-2', '1-3': '2-2',
    '2-3': '3-0'
  };
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{group.name}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(4, 1fr)', gap: 2 }}>
        <div></div>
        {teams.map(t => (
          <div key={t.id} style={{ textAlign: 'center', padding: 4 }}>
            <TeamMark team={t} size={20} />
          </div>
        ))}
        {teams.map((row, i) => (
          <React.Fragment key={row.id}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TeamMark team={row} size={20} />
            </div>
            {teams.map((col, j) => {
              if (i === j) return <div key={j} style={{ background: 'var(--mute-bg)', borderRadius: 4 }} />;
              const key = i < j ? `${i}-${j}` : `${j}-${i}`;
              const score = results[key];
              const display = i < j ? score : score.split('-').reverse().join('-');
              return (
                <div key={j} style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4,
                  padding: 4, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700
                }}>
                  {display}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// =============================================================
// STANDINGS — Pro League season
// =============================================================
function ScreenStandings({ density }) {
  const [sort, setSort] = React.useState('rank');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 18 }}>
        <div>
          <SectionTitle kicker="SAISON 5 · J22/30" title="Classement Pro League" size="lg" />
        </div>
        <StatTile label="Leader" value="Nova Esports" sub="54 pts · 8 victoires d'affilée" icon="🏆" />
        <StatTile label="Buts marqués" value="412" sub="Moyenne 2.6/match" icon="⚽" />
        <StatTile label="Match du jour" value="NVX vs KRA" sub="Ce soir · 21h" icon="🔥" />
      </div>

      <Card padding={0}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: density === 'compact' ? '40px 2fr 60px 60px 60px 60px 100px 100px 80px' : '50px 2fr 60px 60px 60px 60px 110px 130px 90px',
          gap: 12, padding: '14px 22px',
          borderBottom: '1px solid var(--border)',
          fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)'
        }}>
          <span>#</span><span>Équipe</span>
          <span style={{ textAlign: 'center' }}>MJ</span>
          <span style={{ textAlign: 'center' }}>V</span>
          <span style={{ textAlign: 'center' }}>D</span>
          <span style={{ textAlign: 'center' }}>%V</span>
          <span style={{ textAlign: 'center' }}>FORME</span>
          <span style={{ textAlign: 'center' }}>ELO</span>
          <span style={{ textAlign: 'right' }}>POINTS</span>
        </div>
        {STANDINGS.map((row, i) => {
          const t = teamById(row.team);
          const winRate = Math.round(row.w / row.mp * 100);
          const zone = i < 4 ? 'champions' : i < 8 ? 'playoffs' : i < 12 ? 'mid' : 'releg';
          return (
            <div key={row.team} style={{
              display: 'grid',
              gridTemplateColumns: density === 'compact' ? '40px 2fr 60px 60px 60px 60px 100px 100px 80px' : '50px 2fr 60px 60px 60px 60px 110px 130px 90px',
              gap: 12, padding: '14px 22px', alignItems: 'center',
              borderBottom: i < STANDINGS.length - 1 ? '1px solid var(--border)' : 'none',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 4, height: 24, borderRadius: 2,
                  background: zone === 'champions' ? 'var(--accent)' : zone === 'playoffs' ? 'var(--blue)' : zone === 'releg' ? '#94a3b8' : 'transparent'
                }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: i < 3 ? 'var(--accent)' : 'var(--ink)' }}>{row.rank}</span>
              </div>
              <TeamRow team={t} size={32} showCountry />
              <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{row.mp}</span>
              <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{row.w}</span>
              <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>{row.l}</span>
              <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{winRate}%</span>
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                {row.form.map((f, fi) => (
                  <span key={fi} style={{
                    width: 16, height: 16, borderRadius: 4, fontSize: 9, fontWeight: 800,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: f === 'W' ? '#16a34a' : f === 'L' ? '#dc2626' : '#facc15',
                    color: f === 'D' ? '#0a0a0a' : '#fff', fontFamily: 'var(--font-mono)'
                  }}>{f}</span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{t.elo}</span>
                <span style={{ color: row.trend === 'up' ? '#16a34a' : row.trend === 'down' ? '#dc2626' : 'var(--muted)', fontSize: 11 }}>
                  {row.trend === 'up' ? '▲' : row.trend === 'down' ? '▼' : '–'}
                </span>
              </div>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{row.pts}</span>
            </div>
          );
        })}
        <div style={{
          padding: '14px 22px', display: 'flex', gap: 18, fontSize: 11,
          color: 'var(--muted)', fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: '1px solid var(--border)'
        }}>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent)', marginRight: 6, verticalAlign: 'middle' }}></span> Champions Series</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--blue)', marginRight: 6, verticalAlign: 'middle' }}></span> Playoffs</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#94a3b8', marginRight: 6, verticalAlign: 'middle' }}></span> Relégation</span>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenBracket, ScreenGroups, ScreenStandings });
