import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Shopping from './pages/Shopping'
import Planning from './pages/Planning'
import Finance from './pages/Finance'
import Profile from './pages/Profile'
import Login from './pages/Login'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `${theme}-theme`;

    return () => subscription.unsubscribe()
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen font-bold">+Agenda...</div>
  }

  return (
    <BrowserRouter>
      {!session ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <Layout toggleTheme={toggleTheme} currentTheme={theme}>
          <Routes>
            <Route path="/" element={<Dashboard toggleTheme={toggleTheme} currentTheme={theme} />} />
            <Route path="/tasks" element={<Tasks toggleTheme={toggleTheme} currentTheme={theme} />} />
            <Route path="/shopping" element={<Shopping toggleTheme={toggleTheme} currentTheme={theme} />} />
            <Route path="/planning" element={<Planning toggleTheme={toggleTheme} currentTheme={theme} />} />
            <Route path="/finance" element={<Finance toggleTheme={toggleTheme} currentTheme={theme} />} />
            <Route path="/profile" element={<Profile toggleTheme={toggleTheme} currentTheme={theme} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </BrowserRouter>
  )
}

export default App
