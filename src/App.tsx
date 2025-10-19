import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Navigation } from './components/Navigation'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'
import { ZonesPage } from './pages/ZonesPage'
import { ZoneForm } from './pages/ZoneForm'
import { ZoneHeatMap } from './components/ZoneHeatMap'
import { ContainerHeatMap } from './components/ContainerHeatMap'
import { ContainersPage } from './pages/ContainersPage'
import { ContainerForm } from './pages/ContainerForm'
import { ContainerViewPage } from './pages/ContainerViewPage'
import { ItemsPage } from './pages/ItemsPage'
import { ItemForm } from './pages/ItemForm'


const AppContent: React.FC = () => {
  const { user } = useAuth()

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/zones" element={<ZonesPage />} />
          <Route path="/zones/new" element={<ZoneForm />} />
          <Route path="/zones/:id/edit" element={<ZoneForm />} />
          <Route path="/zones/heatmap" element={<ZoneHeatMap />} />
          <Route path="/containers" element={<ContainersPage />} />
          <Route path="/containers/new" element={<ContainerForm />} />
          <Route path="/containers/:id" element={<ContainerViewPage />} />
          <Route path="/containers/:id/edit" element={<ContainerForm />} />
          <Route path="/containers/heatmap" element={<ContainerHeatMap />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/items/new" element={<ItemForm />} />
          <Route path="/items/:id/edit" element={<ItemForm />} />
        </Routes>
      </main>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
