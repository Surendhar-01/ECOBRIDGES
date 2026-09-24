export type Role = 'informal_collector' | 'formal_recycler' | 'government_admin'

export interface Profile {
  id?: string
  auth_user_id: string | null
  role: string | null
  account_status: string | null
  display_name: string | null
  entity_name: string | null
  statutory_identifier: string | null
  phone_number: string | null
  email: string | null
}

export interface Lot {
  lot_id: string
  collector_user_id: string
  category_name: string
  sub_category: string | null
  weight_kg: number | null
  estimated_value_inr: number | null
  quoted_rate_per_kg: number | null
  collection_location: string | null
  matched_recycler_id: string | null
  matched_recycler_name: string | null
  status_name: string | null
  payment_mode: string | null
  handover_receipt_number: string | null
  recycler_confirmed: boolean | null
  epr_certificate_no: string | null
}

export interface Recycler {
  recycler_id: string
  name: string
  facility_location: string | null
  city: string | null
  distance_km: number | null
  cpcb_reg_no: string | null
  authorization_validity: string | null
  authorization_status: string | null
  service_area: string | null
  phone: string | null
  accepted_categories: string | null
  doorstep_pickup: boolean | null
  min_weight_for_pickup_kg: number | null
  rating: number | null
  latitude: number | null
  longitude: number | null
}

export interface OfferedRate {
  rate_id: string
  recycler_id: string
  category_name: string
  rate_per_kg: number
  unit: string | null
}

export interface Price {
  price_id: string
  category_name: string
  sub_category: string | null
  prevailing_buy_rate: number | null
  market_min: number | null
  market_max: number | null
  trend: string | null
  date_updated: string | null
}

export const roleTitle = (r: Role): string =>
  r === 'informal_collector' ? 'Informal Collector' : r === 'formal_recycler' ? 'Formal Recycler' : 'Government Admin'
