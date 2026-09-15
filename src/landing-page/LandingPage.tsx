import React from 'react'
import './LandingPage.css'

interface Feature {
  id: string
  title: string
  description: string
  tag: string
}

interface Offering {
  tier: string
  badge?: string
  audience: string
  highlights: string[]
  actionText: string
}

const VALUES = [
  {
    title: 'Save Money',
    description:
      'Compare supermarket options and find the combination of stores that can reduce the total cost of your shopping.',
  },
  {
    title: 'Stay Organised',
    description:
      'Keep track of what is already in your pantry and build a shopping list around what you actually need.',
  },
  {
    title: 'Shop Efficiently',
    description:
      'Balance grocery prices with travel, delivery, and collection options to choose a shopping plan that works for you.',
  },
]

const FEATURES: Feature[] = [
  {
    id: 'pantry',
    tag: 'Pantry',
    title: 'Pantry Management',
    description:
      'Keep track of the groceries you already have at home and quickly add low-stock items to your shopping list.',
  },
  {
    id: 'shopping-list',
    tag: 'Planning',
    title: 'Smart Shopping Lists',
    description:
      'Create and manage your grocery list, mark items as completed, and keep your shopping organised from start to finish.',
  },
  {
    id: 'price-comparison',
    tag: 'Savings',
    title: 'Supermarket Price Comparison',
    description:
      'Compare the cost of your shopping list across supermarkets and see which option gives you the best overall value.',
  },
  {
    id: 'multi-store',
    tag: 'Optimisation',
    title: 'Multi-Store Recommendations',
    description:
      'See when splitting your shopping across multiple stores could save money, with each item assigned to the best place to buy it.',
  },
  {
    id: 'budget',
    tag: 'Budgeting',
    title: 'Grocery Budget Tracking',
    description:
      'Set a grocery budget, monitor your estimated spending, and see how much of your budget remains before you shop.',
  },
  {
    id: 'route',
    tag: 'Travel',
    title: 'Shopping Route Planning',
    description:
      'Plan your trip between stores and compare in-store, click-and-collect, and delivery options before choosing how to shop.',
  },
]

const OFFERINGS: Offering[] = [
  {
    tier: 'Plan Your Shop',
    audience: 'For organising what you need before you leave home',
    highlights: [
      'Manage pantry items and track what you already have',
      'Build and update your shopping list',
      'Mark items as completed while shopping',
      'Keep everything in one organised place',
    ],
    actionText: 'Start Planning',
  },
  {
    tier: 'Save More',
    badge: 'Popular',
    audience: 'For comparing prices and getting the best value',
    highlights: [
      'Compare your shopping list across supermarkets',
      'See when multiple stores can reduce the total cost',
      'Compare in-store, delivery, and click-and-collect options',
      'Track your estimated spend against your grocery budget',
    ],
    actionText: 'Compare Options',
  },
  {
    tier: 'Shop Smarter',
    audience: 'For turning your plan into an efficient shopping trip',
    highlights: [
      'Choose the shopping option that works best for you',
      'See which store each item should be purchased from',
      'Plan your route between multiple supermarkets',
      'Balance savings with travel and collection costs',
    ],
    actionText: 'Plan Your Route',
  },
]

interface LandingPageProps {
  onGetStarted: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <header className="landing-header">
        <div className="landing-brand">
          <span className="brand-dot" />
          <span className="brand-name">Stocker</span>
          <span className="brand-tag">Smart Grocery Shopping</span>
        </div>
        <nav className="landing-nav" aria-label="Main Navigation">
          <a href="#who-we-are" className="nav-link">
            Who We Are
          </a>
          <a href="#mission" className="nav-link">
            Our Purpose
          </a>
          <a href="#features" className="nav-link">
            Features
          </a>
          <a href="#offerings" className="nav-link">
            Offerings
          </a>
        </nav>
        <div className="landing-header-cta">
          <button
            type="button"
            className="cta-btn primary-btn sm"
            onClick={onGetStarted}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">Smarter Grocery Planning & Price Comparison</div>
        <h1 className="hero-title">
          Spend Less. Shop Smarter. <span className="highlight">Waste Less.</span>
        </h1>
        <p className="hero-subtitle">
            Stocker helps you manage your pantry, build shopping lists, compare supermarket prices,
            stay within budget, and plan the best way to shop across multiple stores.
        </p>
        <div className="hero-actions">
          <a href="#offerings" className="cta-btn primary-btn">
            Explore What We Offer
          </a>
          <a href="#who-we-are" className="cta-btn secondary-btn">
            Learn Who We Are
          </a>
        </div>

        <div className="hero-metrics">
          <div className="metric-card">
            <span className="metric-number">3+</span>
            <span className="metric-label">Supermarkets compared</span>
          </div>
          <div className="metric-card">
            <span className="metric-number">1 List</span>
            <span className="metric-label">Across multiple stores</span>
          </div>
          <div className="metric-card">
            <span className="metric-number">Smart</span>
            <span className="metric-label">Budget & route planning</span>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section id="who-we-are" className="content-section">
        <div className="section-label">Identity</div>
        <h2 className="section-title">Who We Are</h2>
        <p className="section-lead">
          We are students and developers building a simpler way to plan groceries,
          compare prices, and make every shopping trip count.        
        </p>
        <div className="who-grid">
        <div className="who-card">
          <h3>Built for Everyday Shoppers</h3>
          <p>
            Stocker brings your pantry, shopping list, grocery budget, and supermarket
            options together in one easy-to-use place.
          </p>
        </div>

        <div className="who-card">
          <h3>Focused on Saving Money</h3>
          <p>
            We help shoppers compare supermarket prices and identify when buying from
            multiple stores could reduce the overall cost of their groceries.
          </p>
        </div>

        <div className="who-card">
          <h3>Smarter Shopping Decisions</h3>
          <p>
            Stocker considers more than item prices by helping users account for their
            budget, shopping options, and the route between stores.
          </p>
        </div>
      </div>
      </section>

      {/* What We Are Here For (Purpose / Mission) Section */}
      <section id="mission" className="content-section alt-bg">
        <div className="section-label">Purpose & Mission</div>
        <h2 className="section-title">What We Are Here For</h2>
        <p className="section-lead">
          Making grocery shopping easier, more affordable, and better organised by giving
          shoppers the information they need to make smarter decisions.
        </p>
        <div className="values-grid">
          {VALUES.map((val) => (
            <div key={val.title} className="value-card">
              <div className="value-check" aria-hidden="true">
                ✓
              </div>
              <div className="value-content">
                <h3>{val.title}</h3>
                <p>{val.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What We Have to Offer (Features & Solutions) */}
      <section id="features" className="content-section">
        <div className="section-label">Capabilities</div>
        <h2 className="section-title">What We Have to Offer</h2>
        <p className="section-lead">
          Everything you need to plan your groceries, compare your options, control your spending,
          and organise a more efficient shopping trip.
        </p>
        <div className="features-grid">
          {FEATURES.map((feature) => (
            <div key={feature.id} className="feature-card">
              <span className="feature-tag">{feature.tag}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Offerings & Editions */}
      <section id="offerings" className="content-section alt-bg">
        <div className="section-label">Tailored Solutions</div>
        <h2 className="section-title">How Stocker Helps You</h2>
        <p className="section-lead">
          From planning your list to comparing supermarkets and organising your route,
          Stocker helps make the whole grocery trip simpler.
        </p>
        <div className="offerings-grid">
          {OFFERINGS.map((offering) => (
            <div
              key={offering.tier}
              className={`offering-card ${offering.badge ? 'featured' : ''}`}
            >
              {offering.badge && <span className="offering-badge">{offering.badge}</span>}
              <h3>{offering.tier}</h3>
              <p className="offering-audience">{offering.audience}</p>
              <ul className="offering-list">
                {offering.highlights.map((item) => (
                  <li key={item}>
                    <span className="bullet">✦</span> {item}
                  </li>
                ))}
              </ul>
              <button type="button" className="cta-btn primary-btn full-width">
                {offering.actionText}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="cta-banner">
          <h2>Ready to shop smarter?</h2>
          <p>
            Get started with Stocker and make your next grocery shop simpler,
            cheaper, and better organised.
          </p>
        <div className="cta-actions">
          <button
            type="button"
            className="cta-btn primary-btn"
            onClick={onGetStarted}
          >
            Get Started Now
          </button>
          <a
            href="https://github.com/Sifer-crack/Stocker-Frontend"
            target="_blank"
            rel="noreferrer"
            className="cta-btn secondary-btn"
          >
            GitHub Repository
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <strong>Stocker</strong> Smart Grocery Shopping
          </div>
          <div className="footer-links">
            <a href="#who-we-are">Who We Are</a>
            <a href="#mission">Our Purpose</a>
            <a href="#features">Features</a>
            <a href="#offerings">Offerings</a>
          </div>
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} Stocker. Shop smarter, save more.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
