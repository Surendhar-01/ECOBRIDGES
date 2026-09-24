import type { Role } from '../lib/types'
import { roleTitle } from '../lib/types'

const ROLES: { role: Role; emoji: string; desc: string }[] = [
  { role: 'informal_collector', emoji: '♻️', desc: 'Scrap collection & aggregation' },
  { role: 'formal_recycler', emoji: '🏭', desc: 'Authorized Recycling Center' },
  { role: 'government_admin', emoji: '🏛️', desc: 'Government Monitoring' },
]

export default function Intro({ onPick }: { onPick: (r: Role) => void }) {
  return (
    <div className="page">
      <header className="topbar"><div className="brand">♻️ ECOBRIDGES</div><div className="sub">India Clean Eco Portal</div></header>
      <div className="hero"><h1>Welcome</h1><p>Choose how you want to continue.</p></div>
      <div className="cards">
        {ROLES.map((r) => (
          <button key={r.role} className="rolecard" onClick={() => onPick(r.role)}>
            <span className="emoji">{r.emoji}</span>
            <span className="rtext"><strong>{roleTitle(r.role)}</strong><small>{r.desc}</small></span>
            <span className="arrow">→</span>
          </button>
        ))}
      </div>
      <footer className="foot">CPCB / MoEFCC • SIH 2026 • PS 26229</footer>
    </div>
  )
}
