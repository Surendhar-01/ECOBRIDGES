import { supabase } from './supabase'
import type { Lot, OfferedRate, Price, Profile, Recycler } from './types'

export async function fetchRecyclers(): Promise<Recycler[]> {
  const { data } = await supabase.from('authorized_recyclers').select('*').order('distance_km')
  return ((data as Recycler[]) ?? []).filter((r) => (r.authorization_status || 'active') === 'active' && (r.cpcb_reg_no || '') !== '')
}

export async function fetchRates(): Promise<OfferedRate[]> {
  const { data } = await supabase.from('recycler_offered_rates').select('*')
  return (data as OfferedRate[]) ?? []
}

export async function fetchPrices(): Promise<Price[]> {
  const { data } = await supabase.from('material_prices').select('*')
  return (data as Price[]) ?? []
}

export async function fetchCollectorLots(userId: string): Promise<Lot[]> {
  const { data } = await supabase.from('collector_lots').select('*').eq('collector_user_id', userId).order('created_at', { ascending: false })
  return (data as Lot[]) ?? []
}

export async function fetchAllLots(): Promise<Lot[]> {
  const { data } = await supabase.from('v_admin_lots').select('*')
  return (data as Lot[]) ?? []
}

export async function fetchProfiles(role: string): Promise<Profile[]> {
  const { data } = await supabase.from('profiles').select('*').eq('role', role)
  return (data as Profile[]) ?? []
}

export async function fetchMetrics() {
  const { data } = await supabase.from('v_admin_metrics').select('*').maybeSingle()
  return data as { collector_count: number; recycler_count: number; admin_count: number; lot_count: number; pending_lot_count: number; confirmed_lot_count: number; total_weight_kg: number; settled_value_inr: number } | null
}

let lotSeq = 0
export async function createLot(userId: string, lot: Partial<Lot>) {
  const id = `LOT-WEB-${Date.now().toString(36).toUpperCase()}-${(lotSeq++).toString().padStart(2, '0')}`
  const { error } = await supabase.from('collector_lots').insert({
    lot_id: id, collector_user_id: userId,
    category_name: lot.category_name, sub_category: lot.sub_category || '',
    weight_kg: lot.weight_kg, condition: 'Scanned - Standard E-Waste',
    estimated_value_inr: (lot.weight_kg || 0) * (lot.quoted_rate_per_kg || 0),
    quoted_rate_per_kg: lot.quoted_rate_per_kg,
    collection_timestamp: Date.now(),
    collection_location: lot.collection_location || 'Web Collection Point',
    gps_coordinates: '', matched_recycler_id: lot.matched_recycler_id || null,
    matched_recycler_name: lot.matched_recycler_name || null,
    status_name: 'HANDOVER_PENDING', payment_mode: lot.payment_mode || 'CASH',
    handover_receipt_number: 'RC-' + id, recycler_confirmed: false,
  })
  if (error) throw new Error(error.message)
  return id
}

export async function confirmHandoverPaid(lotId: string) {
  const { data: lot } = await supabase.from('collector_lots').select('*').eq('lot_id', lotId).maybeSingle()
  if (!lot) throw new Error('Lot not found')
  const w = (lot as Lot).weight_kg || 0
  const rate = (lot as Lot).quoted_rate_per_kg || 0
  const total = w * rate
  const { error } = await supabase.from('collector_lots').update({
    recycler_confirmed: true, status_name: 'PAYMENT_COMPLETED',
    estimated_value_inr: total, weight_kg: w,
    epr_certificate_no: 'EPR-CERT-MoEFCC-' + Math.floor(10000 + Math.random() * 90000),
  }).eq('lot_id', lotId)
  if (error) throw new Error(error.message)
  await supabase.from('collector_transactions').upsert({
    transaction_id: 'TXN-SETTLED-' + lotId, lot_id: lotId,
    collector_user_id: (lot as Lot).collector_user_id,
    category_name: (lot as Lot).category_name, weight_kg: w,
    rate_per_kg: rate, total_amount_inr: total,
    payment_mode: (lot as Lot).payment_mode || 'CASH',
    recycler_name: (lot as Lot).matched_recycler_name || 'Authorized Recycler',
    timestamp: Date.now(), receipt_number: (lot as Lot).handover_receipt_number || ('RC-' + lotId),
    is_settled: true,
  }, { onConflict: 'transaction_id' })
}
