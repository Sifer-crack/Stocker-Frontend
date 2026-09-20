import { useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import ShoppingList from './pages/ShoppingList'
import StoreRecommendations from './pages/StoreRecommendations'
import Sidebar from './components/Sidebar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import './App.css'
import ShoppingRoute from './pages/ShoppingRoute'
import Pantry from './pages/Pantry'
import Account from './pages/Account'
import { LandingPage } from './landing-page'

function AppLayout({ estimatedCost }: { estimatedCost: number }) {
  return (
    <div className="app-layout">
      <Sidebar estimatedCost={estimatedCost} />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  )
}

function App() {
  const { accessToken, loading } = useAuth()
  const [items, setItems] = useState<string[]>([])
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
    const price = itemPrices[item.toLowerCase()] ?? 5.00
    return total + price
  }, 0)

  const handleAddToShoppingList = (item: string) => {
    setItems((currentItems) => {
      if (currentItems.includes(item)) {
        return currentItems
      }
      return [...currentItems, item]
    })
  }

  const handleChooseOption = (option: string) => {
    setSelectedOption(option)
  }

  if (loading) {
    return <div>Loading...</div>
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
          element={<Pantry onAddToShoppingList={handleAddToShoppingList} />}
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
