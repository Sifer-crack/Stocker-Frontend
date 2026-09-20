import { useEffect, useState } from 'react'
import { LandingPage } from './landing-page/index.ts'
import { PricingPage } from './pricing/index.ts'

function App() {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return hash === '#/pricing' ? <PricingPage /> : <LandingPage />
}

export default App
