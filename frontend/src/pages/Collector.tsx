import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { createLot, fetchCollectorLots, fetchPrices, fetchRates, fetchRecyclers } from '../lib/data'
import type { Lot, Price, Recycler } from '../lib/types'

const CATS = ['PCB_BOARDS', 'CABLES_WIRES', 'BATTERIES', 'CRTS_MONITORS', 'LCD_PANELS', 'MOTORS_MAGNETS', 'MIXED_PLASTICS']

export default function Collector() {
  const a = useAuth()
  const uid = a.session?.userId || ''
  const [lots, setLots] = useState<Lot[]>([])
  const [recyclers, setRecyclers] = useState<Recycler[]>([])
  const [rates, setRates] = useState<Record<string, Record<string, number>>>({})
  const [prices, setPrices] = useState<Price[]>([])
  const [mat, setMat] = useState<string | null>(null)
  const [pickupOnly, setPickupOnly] = useState(false)
  const [byRate, setByRate] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [cat, setCat] = useState(CATS[0])
  const [wt, setWt] = useState('1.5')
  const [rec, setRec] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLots(await fetchCollectorLots(uid))
    const r = await fetchRecyclers()
    setRecyclers(r)
    const rs = await fetchRates()
    const m: Record<string, Record<string, number>> = {}
    rs.forEach((x) => { (m[x.recycler_id] = m[x.recycler_id] || {})[x.category_name] = x.rate_per_kg })
    setRates(m)
    setPrices(await fetchPrices())
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => {
    return recyclers
      .filter((r) => (!mat || (r.accepted_categories || '').split(',').includes(mat)) && (!pickupOnly || r.doorstep_pickup))
      .sort((x, y) => byRate
        ? (Math.max(...Object.values(rates[y.recycler_id] || { z: 0 })) - Math.max(...Object.values(rates[x.recycler_id] || { z: 0 })))
        : (x.distance_km || 0) - (y.distance_km || 0))
  }, [recyclers, mat, pickupOnly, byRate, rates])

  const submitLot = async () => {
    try {
      const rate = (rates[rec]?.[cat]) || 0
      const sel = recyclers.find((r) => r.recycler_id === rec)
      await createLot(uid, { category_name: cat, weight_kg: parseFloat(wt) || 0, quoted_rate_per_kg: rate, matched_recycler_id: rec || null, matched_recycler_name: sel?.name || null })
      setMsg('Lot created.')
      setShowForm(false)
      await load()
    } catch (e) { setMsg('Failed: ' + (e as Error).message) }
  }

  return (
    <div className="page">
      <header className="topbar row"><div className="brand sm">♻️ Collector Hub</div><button className="link" onClick={() => a.signOut()}>Sign out</button></header>
      <h2>My Lots ({lots.length})</h2>
      {msg && <div className="info">{msg}</div>}
      <div className="cards">
        {lots.map((l) => (
          <div key={l.lot_id} className="card">
            <strong>{l.lot_id}</strong>
            <div className="muted">{l.category_name} • {l.weight_kg} kg • ₹{Math.round(l.estimated_value_inr || 0)}</div>
            <div className="muted">{l.matched_recycler_name || 'No recycler yet'} • {l.recycler_confirmed ? '✅ Verified & Paid' : '⏳ Awaiting weigh-in'}</div>
          </div>
        ))}
        {lots.length === 0 && <div className="card muted">No lots yet — create your first one below.</div>}
      </div>
      <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : '+ New E-Waste Lot'}</button>
      {showForm && (
        <div className="card">
          <label>Material</label>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <label>Weight (kg)</label>
          <input inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
          <label>Recycler (optional)</label>
          <select value={rec} onChange={(e) => setRec(e.target.value)}>
            <option value="">— choose later —</option>
            {visible.map((r) => <option key={r.recycler_id} value={r.recycler_id}>{r.name}</option>)}
          </select>
          <button className="btn" onClick={submitLot}>Create Lot</button>
        </div>
      )}
      <h2>Verified Recyclers ({visible.length})</h2>
      <div className="chips">
        <button className={!mat ? 'chip on' : 'chip'} onClick={() => setMat(null)}>All</button>
        {CATS.map((c) => <button key={c} className={mat === c ? 'chip on' : 'chip'} onClick={() => setMat(mat === c ? null : c)}>{c.split('_')[0]}</button>)}
        <button className={pickupOnly ? 'chip on' : 'chip'} onClick={() => setPickupOnly(!pickupOnly)}>🚚 Pickup</button>
        <button className={byRate ? 'chip on' : 'chip'} onClick={() => setByRate(!byRate)}>{byRate ? 'Top rate' : 'Nearest'}</button>
      </div>
      <div className="cards">
        {visible.map((r) => (
          <div key={r.recycler_id} className="card">
            <strong>{r.name}</strong> <span className="pill">✓ Authorized • Active</span>
            <div className="muted">{r.cpcb_reg_no} • {r.authorization_validity}</div>
            <div className="muted">📍 {r.facility_location} ({r.distance_km} km) • Serves: {r.service_area || r.city}</div>
            {r.doorstep_pickup && <div className="muted">🚚 Doorstep pickup (min {r.min_weight_for_pickup_kg} kg)</div>}
            <div className="muted">Rates: {Object.entries(rates[r.recycler_id] || {}).map(([k, v]) => `${k.split('_')[0]} ₹${v}`).join(' • ') || '—'}</div>
            <div className="muted">📞 {r.phone}</div>
          </div>
        ))}
      </div>
      <h2>Price Board</h2>
      <div className="cards">
        {prices.map((p) => (
          <div key={p.price_id} className="card row"><span>{p.category_name}</span><strong>₹{p.prevailing_buy_rate}/kg {p.trend === 'UP' ? '📈' : '➖'}</strong></div>
        ))}
      </div>
    </div>
  )
}
