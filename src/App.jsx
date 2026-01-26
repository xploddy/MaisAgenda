import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Shopping from './pages/Shopping'
import Planning from './pages/Planning'
import Finance from './pages/Finance'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/shopping" element={<Shopping />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/finance" element={<Finance />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
