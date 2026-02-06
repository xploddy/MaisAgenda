import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
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
      if (session) syncProfileData(session.user.id);
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) syncProfileData(session.user.id);
    })

    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `${theme}-theme`;

    return () => subscription.unsubscribe()
  }, [theme])

  const syncProfileData = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('theme, default_account_id, start_month_day, user_accounts, user_cards')
        .eq('id', userId)
        .single();

      if (data) {
        if (data.theme) {
          setTheme(data.theme);
          localStorage.setItem('theme', data.theme);
          document.documentElement.setAttribute('data-theme', data.theme);
          document.body.className = `${data.theme}-theme`;
        }
        if (data.default_account_id) {
          localStorage.setItem('defaultAccountId', data.default_account_id);
        }
        if (data.start_month_day) {
          localStorage.setItem('startMonthDay', data.start_month_day);
        }
        if (data.user_accounts && data.user_accounts.length > 0) {
          localStorage.setItem('user_accounts', JSON.stringify(data.user_accounts));
        }
        if (data.user_cards && data.user_cards.length > 0) {
          localStorage.setItem('user_cards', JSON.stringify(data.user_cards));
        }
      }
    } catch (error) {
      console.log('Error syncing profile:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)

    if (session?.user?.id) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, theme: newTheme });

      if (error) console.log('Error saving theme:', error);
    }
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
