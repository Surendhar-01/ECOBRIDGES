import { useState } from 'react'
import { AuthProvider, useAuth } from './auth'
import type { Role } from './lib/types'
import Intro from './pages/Intro'
import Auth from './pages/Auth'
import Collector from './pages/Collector'
import Recycler from './pages/Recycler'
import Admin from './pages/Admin'
import './styles.css'

function Shell() {
  const a = useAuth()
  const [role, setRole] = useState<Role | null>(null)

  if (!a.session || !a.profile) {
    if (!role) return <Intro onPick={setRole} />
    return <Auth role={role} onBack={() => setRole(null)} />
  }
  const r = (a.profile.role || '') as Role
  if (r === 'informal_collector') return <Collector />
  if (r === 'formal_recycler') return <Recycler />
  return <Admin />
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>
}
