import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Shopping from './pages/Shopping'
import Planning from './pages/Planning'
import Finance from './pages/Finance'
import Login from './pages/Login'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>
  }

  return (
    <BrowserRouter>
      {!session ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/shopping" element={<Shopping />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </BrowserRouter>
  )
}

export default App
