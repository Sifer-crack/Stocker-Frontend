import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import OAuthCallback from './pages/OAuthCallback'
import Dashboard from './pages/Dashboard'
import ShoppingList from './pages/ShoppingList'
import ShoppingItemPage from './pages/ShoppingItemPage'
import FavoriteStores from './pages/FavoriteStores'
import Notifications from './pages/Notifications'
import StoreRecommendations from './pages/StoreRecommendations'
import Sidebar from './components/Sidebar'
import Loading from './components/Loading'
import AppTopBar from './components/AppTopBar'
import NotificationToasts from './components/NotificationToasts'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { useShoppingList } from './context/ShoppingListContext'
import './App.css'
import ShoppingRoute from './pages/ShoppingRoute'
import Pantry from './pages/Pantry'
import Account from './pages/Account'
import { LandingPage } from './landing-page'
import { PricingPage } from './pricing'

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [peekOpen, setPeekOpen] = useState(false)
  const [peekClosing, setPeekClosing] = useState(false)
  const hoverTimer = useRef<number | null>(null)
  const closeTimer = useRef<number | null>(null)

  const clearTimers = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  useEffect(() => clearTimers, [])

  const handleToggleSidebar = () => {
    clearTimers()
    setPeekOpen(false)
    setPeekClosing(false)
    setSidebarOpen((previous) => !previous)
  }

  const schedulePeekOpen = () => {
    clearTimers()
    hoverTimer.current = window.setTimeout(() => {
      setPeekOpen(true)
      hoverTimer.current = null
    }, 400)
  }

  const handlePeekMouseLeave = () => {
    if (sidebarOpen) {
      return
    }
    clearTimers()
    setPeekClosing(true)
    closeTimer.current = window.setTimeout(() => {
      setPeekOpen(false)
      setPeekClosing(false)
      closeTimer.current = null
    }, 200)
  }

  const handlePeekMouseEnter = () => {
    clearTimers()
    setPeekClosing(false)
  }

  return (
    <div className="app-layout">
      <AppTopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />
      <div className="app-body">
        {!sidebarOpen && !peekOpen && (
          <div
            className="sidebar-hover-zone"
            aria-hidden="true"
            onMouseEnter={schedulePeekOpen}
            onMouseLeave={clearTimers}
          />
        )}
        <Sidebar isHidden={!sidebarOpen} />
        {!sidebarOpen && peekOpen && (
          <Sidebar
            isPeek
            isClosing={peekClosing}
            onMouseLeave={handlePeekMouseLeave}
            onMouseEnter={handlePeekMouseEnter}
          />
        )}
        <div className="app-content">
          <Outlet />
        </div>
      </div>
      <NotificationToasts />
    </div>
  )
}

function App() {
  const { accessToken, loading } = useAuth()
  const { items, estimatedCost, addItem } = useShoppingList()
  const [selectedOption, setSelectedOption] = useState('')

  const handleChooseOption = (option: string) => {
    setSelectedOption(option)
  }

  if (loading) {
    return <Loading message="Checking your session..." />
  }

  const isLoggedIn = accessToken !== null

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <SignUp />}
      />
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <Dashboard
              items={items}
              estimatedCost={estimatedCost}
            />
          }
        />
        <Route
          path="/pantry"
          element={
            <Pantry onAddToShoppingList={addItem} shoppingListItems={items} />
          }
        />
        <Route
          path="/shopping-list"
          element={<ShoppingList />}
        />
        <Route path="/shopping-list/:itemId" element={<ShoppingItemPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/favorite-stores" element={<FavoriteStores />} />
        <Route
          path="/store-recommendations"
          element={
            <StoreRecommendations items={items} onChooseOption={handleChooseOption} />
          }
        />
        <Route
          path="/shopping-route"
          element={
            selectedOption === '' ? (
              <Navigate to="/store-recommendations" replace />
            ) : (
              <ShoppingRoute selectedOption={selectedOption} />
            )
          }
        />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/account" element={<Account />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
