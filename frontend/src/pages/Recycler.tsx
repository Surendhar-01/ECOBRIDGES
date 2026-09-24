import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { confirmHandoverPaid, fetchAllLots } from '../lib/data'
import type { Lot } from '../lib/types'

export default function Recycler() {
  const a = useAuth()
  const [lots, setLots] = useState<Lot[]>([])
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => setLots((await fetchAllLots()).filter((l) => !l.recycler_confirmed))
  useEffect(() => { void load() }, [])

  const scanPay = async () => {
    try {
      const target = lots.find((l) => (l.handover_receipt_number || '').toLowerCase() === code.trim().toLowerCase() || l.lot_id.toLowerCase() === code.trim().toLowerCase())
      if (!target) { setMsg('No lot matches that handover code.'); return }
      await confirmHandoverPaid(target.lot_id)
      setMsg(`Payment completed: ${target.lot_id} verified & settled. Collector receives ₹${Math.round((target.weight_kg || 0) * (target.quoted_rate_per_kg || 0))}.`)
      setCode('')
      await load()
    } catch (e) { setMsg('Failed: ' + (e as Error).message) }
  }

  return (
    <div className="page">
      <header className="topbar row"><div className="brand sm">🏭 Recycler Portal</div><button className="link" onClick={() => a.signOut()}>Sign out</button></header>
      <div className="card">
        <h3>📷 Scan Collector Handover QR</h3>
        <p className="muted">Enter the handover code from the collector's receipt. Scanning completes payment directly.</p>
        <input placeholder="Handover code (e.g. RC-LOT-...)" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn" onClick={scanPay}>Scan & Pay</button>
        {msg && <div className="info">{msg}</div>}
      </div>
      <h2>Awaiting Weigh-In ({lots.length})</h2>
      <div className="cards">
        {lots.map((l) => (
          <div key={l.lot_id} className="card">
            <strong>{l.lot_id}</strong>
            <div className="muted">{l.category_name} • {l.weight_kg} kg • ₹{Math.round(l.estimated_value_inr || 0)}</div>
            <div className="muted">Code: {l.handover_receipt_number}</div>
          </div>
        ))}
        {lots.length === 0 && <div className="card muted">No pending lots.</div>}
      </div>
    </div>
  )
}
