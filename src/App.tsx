import { useState } from 'react'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import ShoppingList from './pages/ShoppingList'
import StoreRecommendations from './pages/StoreRecommendations'
import Sidebar from './components/Sidebar'
import './App.css'
import ShoppingRoute from './pages/ShoppingRoute'
import GroceryBudget from './pages/GroceryBudget'
import Pantry from './pages/Pantry'
import Account from './pages/Account'
import { LandingPage } from './landing-page'

function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [selectedOption, setSelectedOption] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [items, setItems] = useState<string[]>([])
  const [weeklyBudget, setWeeklyBudget] = useState(150)
  const [currentPage, setCurrentPage] = useState<
    'dashboard' | 'pantry' | 'shopping-list' | 'store-recommendations' | 'shopping-route' | 'grocery-budget' | 'account'
  >('dashboard')

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

  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />
  }

  if (!isLoggedIn) {
    if (showSignUp) {
      return (
        <SignUp
          onBackToLogin={() => setShowSignUp(false)}
        />
      )
    }

    return (
      <Login
        onLogin={() => setIsLoggedIn(true)}
        onCreateAccount={() => setShowSignUp(true)}
      />
    )
  }

  let pageContent

  if (currentPage === 'pantry') {
  pageContent = (
    <Pantry
      onAddToShoppingList={(item) => {
        setItems((currentItems) => {
          if (currentItems.includes(item)) {
            return currentItems
          }

          return [...currentItems, item]
        })

        setCurrentPage('shopping-list')
      }}
    />
  )
} else if (currentPage === 'shopping-list') {
  pageContent = (
    <ShoppingList
      items={items}
      setItems={setItems}
      weeklyBudget={weeklyBudget}
      onCompareStores={() =>
        setCurrentPage('store-recommendations')
      }
    />
  )
} else if (currentPage === 'store-recommendations') {
    pageContent = (
      <StoreRecommendations
        items={items}
        onBack={() => setCurrentPage('shopping-list')}
        onChooseOption={(option) => {
          setSelectedOption(option)
          setCurrentPage('shopping-route')
        }}
      />
    )
  } else if (currentPage === 'shopping-route') {
    pageContent = (
      <ShoppingRoute
        selectedOption={selectedOption}
        onBack={() => setCurrentPage('store-recommendations')}
      />
    )
  } else if (currentPage === 'grocery-budget') {
  pageContent = <GroceryBudget
  weeklyBudget={weeklyBudget}
  setWeeklyBudget={setWeeklyBudget}
  />
  } else if (currentPage === 'account') {
  pageContent = <Account 
  />
  } else {
    pageContent = (
      <Dashboard
        items={items}
        weeklyBudget={weeklyBudget}
        estimatedCost={estimatedCost}
        onViewPantry={() => setCurrentPage('pantry')}
        onCreateShoppingList={() => setCurrentPage('shopping-list')}
      />
    )
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        weeklyBudget={weeklyBudget}
        estimatedCost={estimatedCost}
        onNavigate={(page) =>
          setCurrentPage(
            page as 'dashboard' | 'pantry' | 'shopping-list' | 'store-recommendations' | 'shopping-route' | 'grocery-budget' | 'account'
          )
        }
      />

      <div className="app-content">
        {pageContent}
      </div>
    </div>
  )
}

export default App