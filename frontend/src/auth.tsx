import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, NESTJS_URL } from './lib/supabase'
import type { Profile, Role } from './lib/types'

interface Session {
  userId: string
  email: string | null
}

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signInEmail: (email: string, password: string, role: Role) => Promise<boolean>
  signUp: (args: { name: string; phone: string; email: string; password: string; role: Role; entity?: string; statutory?: string; area?: string }) => Promise<boolean>
  verifyDemoOtp: (code: string, phone: string, role: Role) => Promise<boolean>
  requestDemoOtp: (phone: string) => string
  signOut: () => Promise<void>
  clearError: () => void
  pendingOtp: string | null
}

const Ctx = createContext<AuthState | null>(null)
export const useAuth = () => useContext(Ctx) as AuthState

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('auth_user_id', userId).maybeSingle()
  return (data as Profile) ?? null
}

async function lookupRole(phone: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, '').slice(-10)
  if (digits.length !== 10) return null
  for (const host of [`${window.location.hostname === 'localhost' ? 'http://localhost:3000' : NESTJS_URL}`, NESTJS_URL, 'http://10.0.2.2:3000']) {
    try {
      const r = await fetch(`${host}/api/auth/role-lookup?identifier=${digits}`, { signal: AbortSignal.timeout(2500) })
      if (r.ok) {
        const j = await r.json()
        return (j.registeredRole as string) || null
      }
    } catch { /* try next */ }
  }
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingOtp, setPendingOtp] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user
      if (u) {
        setSession({ userId: u.id, email: u.email ?? null })
        setProfile(await fetchProfile(u.id))
      }
    })
  }, [])

  const signInEmail = async (email: string, password: string, role: Role) => {
    setLoading(true); setError(null)
    try {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (e) { setError(e.message); return false }
      const uid = data.user?.id
      if (!uid) { setError('Sign-in failed.'); return false }
      const p = await fetchProfile(uid)
      if (!p) { setError('No profile found. Contact helpdesk.'); await supabase.auth.signOut(); return false }
      if ((p.role || '') !== role) {
        setError(`Access Denied: this account is registered as ${p.role}. You cannot log in to this portal.`)
        await supabase.auth.signOut(); return false
      }
      if ((p.account_status || 'active') !== 'active') { setError(`Account status: ${p.account_status}.`); await supabase.auth.signOut(); return false }
      setSession({ userId: uid, email: data.user?.email ?? null })
      setProfile(p)
      return true
    } finally { setLoading(false) }
  }

  const signUp: AuthState['signUp'] = async (a) => {
    setLoading(true); setError(null)
    try {
      if (a.role === 'government_admin') { setError('Admin accounts are created centrally by CPCB.'); return false }
      const { data, error: e } = await supabase.auth.signUp({
        email: a.email.trim().toLowerCase(), password: a.password,
        options: { data: { display_name: a.name, phone_number: a.phone, role: a.role, entity_name: a.entity || '', statutory_identifier: a.statutory || '' } },
      })
      if (e) { setError(e.message); return false }
      if (!data.session) { setError('Account created. Confirm your email inbox, then sign in. (Or turn OFF "Confirm email" in Supabase Auth settings.)'); return false }
      const p = await fetchProfile(data.user!.id)
      await supabase.auth.signOut()
      setSession(null); setProfile(null)
      if (!p) { setError('Account created but profile missing. Contact helpdesk.'); return false }
      return true
    } finally { setLoading(false) }
  }

  const requestDemoOtp = (phone: string) => {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    sessionStorage.setItem('demo_otp_' + phone.replace(/\D/g, '').slice(-10), code)
    setPendingOtp(code)
    return code
  }

  const verifyDemoOtp = async (code: string, phone: string, role: Role) => {
    setLoading(true); setError(null)
    try {
      const digits = phone.replace(/\D/g, '').slice(-10)
      const expected = sessionStorage.getItem('demo_otp_' + digits)
      if (!expected || code.trim() !== expected) { setError('Incorrect code.'); return false }
      const slug = await lookupRole(digits)
      if (slug && slug !== role) {
        setError(`Access Denied: this number is registered as ${slug}. You cannot log in to this portal.`)
        return false
      }
      sessionStorage.removeItem('demo_otp_' + digits)
      setPendingOtp(null)
      const demoProfile: Profile = {
        auth_user_id: 'demo-' + digits, role, account_status: 'active',
        display_name: role === 'informal_collector' ? 'Demo Collector' : role === 'formal_recycler' ? 'Demo Recycler' : 'Demo Admin',
        entity_name: '', statutory_identifier: '', phone_number: '+91 ' + digits, email: digits + '@ecobridges.demo',
      }
      setSession({ userId: 'demo-' + digits, email: demoProfile.email })
      setProfile(demoProfile)
      return true
    } finally { setLoading(false) }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null); setProfile(null); setPendingOtp(null); setError(null)
  }

  return <Ctx.Provider value={{ session, profile, loading, error, signInEmail, signUp, verifyDemoOtp, requestDemoOtp, signOut, clearError: () => setError(null), pendingOtp }}>{children}</Ctx.Provider>
}
