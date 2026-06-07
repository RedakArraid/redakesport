// ui.jsx — shared UI primitives + design tokens for Redak Esports

// ============================================================
// LOGO
// ============================================================
function RedakLogo({ size = 22, mono = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill={mono ? 'currentColor' : 'var(--accent)'} />
        <path d="M7 7h6.5a3.5 3.5 0 0 1 1.8 6.5L17 17h-3.2l-1.4-3H10v3H7V7zm3 4.5h3a1.5 1.5 0 0 0 0-3h-3v3z" fill="#fff" />
      </svg>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.01em',
        fontSize: size * 0.85, color: 'var(--ink)', display: 'inline-flex', alignItems: 'baseline', gap: 4
      }}>
        REDAK<span style={{ color: 'var(--accent)' }}>.</span>
      </span>
    </div>
  );
}

// ============================================================
// GAME ICON (abstract per-game mark)
// ============================================================
function GameIcon({ game, size = 18 }) {
  const map = {
    'EA FC 26': { c: '#0a4f3a', glyph: '⚽' },
    'EA FC': { c: '#0a4f3a', glyph: '⚽' },
    'FIFA': { c: '#0a4f3a', glyph: '⚽' },
    'Call of Duty': { c: '#1a1a1a', glyph: '◉' },
    'Fortnite': { c: '#7c3aed', glyph: '◆' },
    'Rocket League': { c: '#0ea5e9', glyph: '◐' },
  };
  const m = map[game] || { c: '#1a1a1a', glyph: '●' };
  return (
    <span style={{
      width: size, height: size, borderRadius: 6, background: m.c, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.55, fontWeight: 700
    }}>{m.glyph}</span>
  );
}

// ============================================================
// TEAM CHIP / AVATAR
// ============================================================
function TeamMark({ team, size = 32, square = true }) {
  if (!team) {
    return (
      <div style={{
        width: size, height: size, borderRadius: square ? size * 0.22 : '50%',
        background: 'var(--mute-bg)', border: '1px dashed var(--border)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--muted)', fontSize: size * 0.4, fontWeight: 700
      }}>?</div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: square ? size * 0.22 : '50%',
      background: team.color, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.36, fontFamily: 'var(--font-display)',
      letterSpacing: '-0.02em', flexShrink: 0
    }}>{team.tag}</div>
  );
}

function TeamRow({ team, size = 32, showCountry = true, showRecord = false, bold = false }) {
  if (!team) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)' }}>
      <TeamMark team={null} size={size} />
      <span style={{ fontStyle: 'italic' }}>À déterminer</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <TeamMark team={team} size={size} />
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: bold ? 800 : 700,
          fontSize: size * 0.5, color: 'var(--ink)', letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {team.name}
        </div>
        {(showCountry || showRecord) && (
          <div style={{ fontSize: size * 0.36, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
            {showCountry && <span>{flag(team.country)} {team.country}</span>}
            {showRecord && <span style={{ fontFamily: 'var(--font-mono)' }}>{team.wins}W–{team.losses}L</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// BADGES & STATUS
// ============================================================
function Badge({ children, tone = 'neutral', solid = false, mono = false }) {
  const tones = {
    live: { bg: '#ff3b30', fg: '#fff', dot: '#fff' },
    upcoming: { bg: 'var(--mute-bg)', fg: 'var(--ink)', dot: 'var(--ink)' },
    done: { bg: '#0f172a', fg: '#fff', dot: '#a7f3d0' },
    neutral: { bg: 'var(--mute-bg)', fg: 'var(--ink)' },
    accent: { bg: 'var(--accent)', fg: '#fff' },
    blue: { bg: 'var(--blue)', fg: '#fff' },
    warning: { bg: '#facc15', fg: '#0a0a0a' },
    success: { bg: '#16a34a', fg: '#fff' },
    outline: { bg: 'transparent', fg: 'var(--ink)', border: '1px solid var(--border)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px', borderRadius: 6,
      background: solid ? t.bg : (tone === 'outline' ? 'transparent' : t.bg),
      color: t.fg, border: t.border,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)', whiteSpace: 'nowrap'
    }}>
      {tone === 'live' && <span style={{
        width: 6, height: 6, borderRadius: 3, background: t.dot,
        animation: 'pulse 1.2s infinite'
      }} />}
      {children}
    </span>
  );
}

function StatusPill({ status }) {
  if (status === 'live') return <Badge tone="live">● LIVE</Badge>;
  if (status === 'done') return <Badge tone="done">Terminé</Badge>;
  if (status === 'upcoming') return <Badge tone="outline">À venir</Badge>;
  return <Badge>{status}</Badge>;
}

// ============================================================
// CARDS
// ============================================================
function Card({ children, style = {}, padding = 20, accent = false, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 16, padding,
      boxShadow: accent ? '0 1px 0 var(--border), 0 0 0 2px var(--accent) inset' : '0 1px 0 var(--border)',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}>{children}</div>
  );
}

function SectionTitle({ kicker, title, action, size = 'md' }) {
  const sizes = { sm: 18, md: 22, lg: 30, xl: 42 };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
      <div>
        {kicker && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600, marginBottom: 6
          }}>{kicker}</div>
        )}
        <h2 style={{
          margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: sizes[size], letterSpacing: '-0.02em', color: 'var(--ink)',
          lineHeight: 1.05
        }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ============================================================
// STAT TILES
// ============================================================
function StatTile({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      background: accent ? 'var(--ink)' : 'var(--card)',
      color: accent ? 'var(--card)' : 'var(--ink)',
      border: accent ? 'none' : '1px solid var(--border)',
      borderRadius: 16, padding: 18,
      display: 'flex', flexDirection: 'column', gap: 6, minHeight: 110, position: 'relative'
    }}>
      <div style={{
        fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
        textTransform: 'uppercase', opacity: 0.65, display: 'flex', alignItems: 'center', gap: 6
      }}>
        {icon} {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: 38, lineHeight: 1, letterSpacing: '-0.03em', marginTop: 'auto'
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

// ============================================================
// BUTTONS
// ============================================================
function Btn({ children, variant = 'primary', size = 'md', onClick, icon, style = {} }) {
  const variants = {
    primary: { bg: 'var(--ink)', fg: 'var(--card)', border: 'transparent' },
    accent: { bg: 'var(--accent)', fg: '#fff', border: 'transparent' },
    ghost: { bg: 'transparent', fg: 'var(--ink)', border: '1px solid var(--border)' },
    soft: { bg: 'var(--mute-bg)', fg: 'var(--ink)', border: 'transparent' },
  };
  const sizes = {
    sm: { pad: '6px 10px', fs: 12, gap: 6 },
    md: { pad: '10px 16px', fs: 13, gap: 8 },
    lg: { pad: '14px 22px', fs: 15, gap: 10 },
  };
  const v = variants[variant]; const s = sizes[size];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: s.gap,
      padding: s.pad, borderRadius: 999,
      background: v.bg, color: v.fg, border: v.border,
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: s.fs,
      letterSpacing: '-0.005em', cursor: 'pointer', whiteSpace: 'nowrap',
      ...style
    }}>
      {icon}{children}
    </button>
  );
}

// ============================================================
// SOCIAL ICONS (inline svg, simple geometric)
// ============================================================
function SocialIcon({ kind, size = 18 }) {
  const s = size;
  const stroke = { stroke: 'currentColor', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (kind) {
    case 'twitch': return <svg width={s} height={s} viewBox="0 0 24 24"><path d="M3 5 4 2h17v13l-5 5h-4l-3 3H7v-3H3V5z" {...stroke}/><path d="M10 8v5M15 8v5" {...stroke}/></svg>;
    case 'youtube': return <svg width={s} height={s} viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3" {...stroke}/><path d="m10 9 6 3-6 3z" fill="currentColor"/></svg>;
    case 'discord': return <svg width={s} height={s} viewBox="0 0 24 24"><path d="M6 8c2-1 4-1.5 6-1.5S16 7 18 8l1 3v6l-3 1-1-2c-1 .5-2 .75-3 .75s-2-.25-3-.75l-1 2-3-1V11z" {...stroke}/><circle cx="9.5" cy="13" r="1" fill="currentColor"/><circle cx="14.5" cy="13" r="1" fill="currentColor"/></svg>;
    case 'x': return <svg width={s} height={s} viewBox="0 0 24 24"><path d="m4 4 7 8.5L4 20h2l6-7 5 7h3l-7-9 6.5-7h-2L13 10.5 8 4z" fill="currentColor"/></svg>;
    case 'instagram': return <svg width={s} height={s} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" {...stroke}/><circle cx="12" cy="12" r="4" {...stroke}/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>;
    case 'tiktok': return <svg width={s} height={s} viewBox="0 0 24 24"><path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5" {...stroke}/><path d="M14 4c.5 2 2 3.5 4.5 3.5" {...stroke}/></svg>;
    case 'facebook': return <svg width={s} height={s} viewBox="0 0 24 24"><path d="M14 21v-8h3l.5-3.5H14V7c0-1 .5-1.5 1.5-1.5H18V2h-3c-2.5 0-4 1.5-4 4v3H8v3.5h3V21z" fill="currentColor"/></svg>;
    case 'snapchat': return <svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 3c3.5 0 5 2.5 5 5.5v3l2 2-2 1c-.5 2-1.5 3-3 3.5l-.5 1c-1 0-1.5.5-3 .5s-2-.5-3-.5l-.5-1c-1.5-.5-2.5-1.5-3-3.5l-2-1 2-2v-3C7 5.5 8.5 3 12 3z" {...stroke}/></svg>;
    case 'kick': return <svg width={s} height={s} viewBox="0 0 24 24"><path d="M4 4h4v6l4-6h5l-5 8 5 8h-5l-4-6v6H4z" fill="currentColor"/></svg>;
    default: return null;
  }
}

function SocialBar({ items, size = 'md' }) {
  const sz = size === 'sm' ? 32 : size === 'lg' ? 44 : 38;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {items.map(it => (
        <a key={it.kind} href="#" onClick={e => e.preventDefault()} title={it.kind} style={{
          width: sz, height: sz, borderRadius: sz / 2,
          background: 'var(--mute-bg)', color: 'var(--ink)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none', border: '1px solid var(--border)'
        }}>
          <SocialIcon kind={it.kind} size={sz * 0.48} />
        </a>
      ))}
    </div>
  );
}

// ============================================================
// MEDIA PLACEHOLDER (striped, with monospace label)
// ============================================================
function MediaPlaceholder({ label, tone = 'red', height = 180, aspect, type = 'photo', duration, rounded = 12 }) {
  const tones = {
    red: { a: '#ffe2df', b: '#ffd0cc', text: '#7a1c14' },
    blue: { a: '#dee6ff', b: '#c5d3ff', text: '#16236b' },
    cream: { a: '#f3eedf', b: '#e8e0c8', text: '#534822' },
    dark: { a: '#1a1a1a', b: '#2a2a2a', text: '#fff' },
  };
  const c = tones[tone] || tones.red;
  return (
    <div style={{
      position: 'relative', width: '100%', height: aspect ? undefined : height,
      aspectRatio: aspect, borderRadius: rounded, overflow: 'hidden',
      background: `repeating-linear-gradient(135deg, ${c.a} 0 14px, ${c.b} 14px 28px)`,
      display: 'flex', alignItems: 'flex-end', padding: 12, color: c.text
    }}>
      {type === 'video' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: 27, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff"/></svg>
          </div>
        </div>
      )}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em',
        textTransform: 'uppercase', maxWidth: '85%'
      }}>{label}</div>
      {duration && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '3px 7px',
          borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11
        }}>{duration}</span>
      )}
    </div>
  );
}

// ============================================================
// SCORE
// ============================================================
function ScoreBig({ a, b, size = 48 }) {
  return (
    <div style={{
      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size,
      letterSpacing: '-0.04em', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: size * 0.2
    }}>
      <span>{a ?? '–'}</span>
      <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: size * 0.6 }}>:</span>
      <span>{b ?? '–'}</span>
    </div>
  );
}

// Bar comparator (for match stats)
function StatBar({ label, a, b, unit = '', isPercent = false }) {
  const total = isPercent ? 100 : (a + b);
  const aPct = total === 0 ? 50 : (a / total) * 100;
  const aWin = a >= b;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em'
      }}>
        <span style={{ color: aWin ? 'var(--ink)' : 'var(--muted)', fontWeight: aWin ? 700 : 500 }}>{a}{unit}</span>
        <span>{label}</span>
        <span style={{ color: !aWin ? 'var(--ink)' : 'var(--muted)', fontWeight: !aWin ? 700 : 500 }}>{b}{unit}</span>
      </div>
      <div style={{ display: 'flex', height: 6, background: 'var(--mute-bg)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${aPct}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
        <div style={{ width: `${100 - aPct}%`, background: 'var(--blue)' }} />
      </div>
    </div>
  );
}

Object.assign(window, {
  RedakLogo, GameIcon, TeamMark, TeamRow, Badge, StatusPill,
  Card, SectionTitle, StatTile, Btn, SocialIcon, SocialBar,
  MediaPlaceholder, ScoreBig, StatBar
});
