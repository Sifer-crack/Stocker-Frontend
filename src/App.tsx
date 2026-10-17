import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import ShoppingList from './pages/ShoppingList'
import StoreRecommendations from './pages/StoreRecommendations'
import Sidebar from './components/Sidebar'
import Loading from './components/Loading'
import AppTopBar from './components/AppTopBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import './App.css'
import ShoppingRoute from './pages/ShoppingRoute'
import Pantry from './pages/Pantry'
import Account from './pages/Account'
import { LandingPage } from './landing-page'

export interface ShoppingItem {
  name: string
  productId?: string
}

function AppLayout({ estimatedCost }: { estimatedCost: number }) {
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
        <Sidebar
          estimatedCost={estimatedCost}
          isHidden={!sidebarOpen}
        />
        {!sidebarOpen && peekOpen && (
          <Sidebar
            estimatedCost={estimatedCost}
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
    </div>
  )
}

function App() {
  const { accessToken, loading } = useAuth()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [selectedOption, setSelectedOption] = useState('')

  const itemPrices: Record<string, number> = {
    milk: 4.80,
    bread: 3.50,
    egg: 6.20,
    eggs: 6.20,
    cheese: 8.90,
    butter: 6.50,
    chicken: 12.40,
    rice: 4.30,
    pasta: 3.20,
    apples: 5.60,
  }
  const estimatedCost = items.reduce((total, item) => {
    const price = itemPrices[item.name.toLowerCase()] ?? 5.00
    return total + price
  }, 0)

  const handleAddToShoppingList = (
    name: string,
    productId?: string
  ) => {
    setItems((currentItems) => {
      if (currentItems.some((item) => item.name === name)) {
        return currentItems
      }

      return [
        ...currentItems,
        {
          name,
          productId,
        },
      ]
    })
  }

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

      <Route
        element={
          <ProtectedRoute>
            <AppLayout estimatedCost={estimatedCost} />
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
            <Pantry
              onAddToShoppingList={handleAddToShoppingList}
              shoppingListItems={items}
            />
          }
        />
        <Route
          path="/shopping-list"
          element={
            <ShoppingList
              items={items}
              setItems={setItems}
            />
          }
        />
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
        <Route path="/account" element={<Account />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
