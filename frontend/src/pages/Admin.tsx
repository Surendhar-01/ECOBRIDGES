import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { fetchAllLots, fetchMetrics, fetchProfiles } from '../lib/data'
import type { Lot, Profile } from '../lib/types'

export default function Admin() {
  const a = useAuth()
  const [m, setM] = useState<any>(null)
  const [collectors, setCollectors] = useState<Profile[]>([])
  const [recyclers, setRecyclers] = useState<Profile[]>([])
  const [lots, setLots] = useState<Lot[]>([])

  useEffect(() => {
    void (async () => {
      setM(await fetchMetrics())
      setCollectors(await fetchProfiles('informal_collector'))
      setRecyclers(await fetchProfiles('formal_recycler'))
      setLots(await fetchAllLots())
    })()
  }, [])

  const lotsOf = (authId: string | null) => lots.filter((l) => l.collector_user_id === authId)
  const routedTo = (p: Profile) => lots.filter((l) =>
    (l.matched_recycler_id && l.matched_recycler_id === p.statutory_identifier) ||
    (l.matched_recycler_name && (l.matched_recycler_name === p.display_name || l.matched_recycler_name === p.entity_name)))

  return (
    <div className="page">
      <header className="topbar row"><div className="brand sm">🏛️ Admin Oversight</div><button className="link" onClick={() => a.signOut()}>Sign out</button></header>
      <div className="cards">
        <div className="card row"><span>Collectors</span><strong>{m?.collector_count ?? '—'}</strong></div>
        <div className="card row"><span>Recyclers</span><strong>{m?.recycler_count ?? '—'}</strong></div>
        <div className="card row"><span>Lots</span><strong>{m?.lot_count ?? '—'}</strong></div>
        <div className="card row"><span>Traceable weight</span><strong>{Math.round(m?.total_weight_kg || 0)} kg</strong></div>
      </div>
      <h2>Informal Collectors ({collectors.length} live)</h2>
      <div className="cards">
        {collectors.map((c) => {
          const ls = lotsOf(c.auth_user_id)
          return (
            <div key={c.auth_user_id} className="card">
              <strong>{c.display_name}</strong> <span className="pill">{ls.length} lots</span>
              <div className="muted">{c.phone_number} • {c.account_status} • {c.statutory_identifier}</div>
              {ls.map((l) => <div key={l.lot_id} className="muted">• {l.lot_id} — {l.category_name} {l.weight_kg}kg ₹{Math.round(l.estimated_value_inr || 0)} {l.recycler_confirmed ? '✅' : '⏳'}</div>)}
            </div>
          )
        })}
        {collectors.length === 0 && <div className="card muted">No collector profiles visible — sign in with the admin email account.</div>}
      </div>
      <h2>Formal Recyclers ({recyclers.length} live)</h2>
      <div className="cards">
        {recyclers.map((r) => {
          const ls = routedTo(r)
          return (
            <div key={r.auth_user_id} className="card">
              <strong>{r.display_name}</strong> <span className="pill">{ls.length} lots</span>
              <div className="muted">{r.statutory_identifier} • {r.account_status}</div>
              {ls.map((l) => <div key={l.lot_id} className="muted">• {l.lot_id} — {l.category_name} {l.weight_kg}kg</div>)}
            </div>
          )
        })}
        {recyclers.length === 0 && <div className="card muted">No recycler profiles visible — sign in with the admin email account.</div>}
      </div>
      <h2>All Lots ({lots.length})</h2>
      <div className="cards">
        {lots.map((l) => (
          <div key={l.lot_id} className="card">
            <strong>{l.lot_id}</strong>
            <div className="muted">{l.category_name} • {l.weight_kg} kg • ₹{Math.round(l.estimated_value_inr || 0)} • {l.recycler_confirmed ? '✅ Paid' : '⏳ Pending'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
