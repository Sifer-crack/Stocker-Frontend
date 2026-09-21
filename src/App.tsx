import { useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import ShoppingList from './pages/ShoppingList'
import ShoppingItemPage from './pages/ShoppingItemPage'
import StoreRecommendations from './pages/StoreRecommendations'
import Sidebar from './components/Sidebar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { useShoppingList } from './context/ShoppingListContext'
import './App.css'
import ShoppingRoute from './pages/ShoppingRoute'
import Pantry from './pages/Pantry'
import Account from './pages/Account'
import { LandingPage } from './landing-page'
import { PricingPage } from './pricing'

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
  const { items, estimatedCost, addItem } = useShoppingList()
  const itemNames = items.map((item) => item.name)
  const [selectedOption, setSelectedOption] = useState('')

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
              items={itemNames}
              estimatedCost={estimatedCost}
            />
          }
        />
        <Route
          path="/pantry"
          element={<Pantry onAddToShoppingList={addItem} />}
        />
        <Route
          path="/shopping-list"
          element={<ShoppingList />}
        />
        <Route path="/shopping-list/:itemId" element={<ShoppingItemPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route
          path="/store-recommendations"
          element={
            <StoreRecommendations items={itemNames} onChooseOption={handleChooseOption} />
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
