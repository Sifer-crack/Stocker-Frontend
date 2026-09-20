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
    title: 'Precision-first scraping',
    description:
      'Engineered specifically for Canvas LMS hierarchies: modules, quizzes, gradebooks, announcements, and asset trees extracted with zero data loss.',
  },
  {
    title: 'Real-time synchronization',
    description:
      'Scheduled background workers monitor course updates, syllabus alterations, and deadline changes to keep student and faculty tools current.',
  },
  {
    title: 'Developer-grade exports',
    description:
      'Normalized JSON pipelines, SQL adapters, and document bundles optimized for downstream AI assistants, study planners, and LMS migrations.',
  },
]

const FEATURES: Feature[] = [
  {
    id: 'deep-harvest',
    tag: 'Extraction',
    title: 'Deep Course Harvesting',
    description:
      'Parse nested Canvas modules, rich content pages, file attachments, assignment instructions, and embedded media with integrity verification.',
  },
  {
    id: 'smart-sync',
    tag: 'Automation',
    title: 'Automated Delta Syncing',
    description:
      'Only fetch what changed. Delta tokens and hash comparisons ensure minimal API/network footprint while keeping course states fresh.',
  },
  {
    id: 'structured-pipeline',
    tag: 'Transformation',
    title: 'Normalized Data Pipelines',
    description:
      'Transform complex Canvas structures into clean, standardized schemas ready for relational stores, vector embeddings, or offline archives.',
  },
  {
    id: 'security-compliance',
    tag: 'Security',
    title: 'Secure Credential Vaulting',
    description:
      'Encrypted session handling, scoped token storage, and student privacy standard alignment keep credentials and educational records safe.',
  },
  {
    id: 'analytics-insights',
    tag: 'Intelligence',
    title: 'Academic Progress Insights',
    description:
      'Surface submission timelines, grading cadence, and workload heatmaps calculated straight from aggregated course records.',
  },
  {
    id: 'api-integrations',
    tag: 'Ecosystem',
    title: 'Extensible Webhooks & APIs',
    description:
      'Plug scraped educational events into Discord, Slack, calendar feeds, Notion workspaces, or custom self-hosted dashboards.',
  },
]

const OFFERINGS: Offering[] = [
  {
    tier: 'Learner & Researcher',
    audience: 'Students, TAs, and independent educational researchers',
    highlights: [
      'Complete offline backup of enrolled courses',
      'Unified deadline calendar & file exporter',
      'Markdown & JSON formatted notes exporter',
      'Local-first storage with zero telemetry',
    ],
    actionText: 'Explore Student Tools',
  },
  {
    tier: 'Educators & Departments',
    badge: 'Popular',
    audience: 'Faculty, curriculum teams, and academic labs',
    highlights: [
      'Multi-course content synchronization',
      'Automated syllabus audit & broken link checker',
      'Assignment and rubric dataset export for reporting',
      'Self-hosted deployment templates (Docker / Compose)',
    ],
    actionText: 'Request Institution Demo',
  },
  {
    tier: 'Enterprise & Integrators',
    audience: 'EdTech platforms, LMS engineers, and universities',
    highlights: [
      'High-throughput distributed scraping cluster',
      'SLA-backed priority Canvas API adapter maintenance',
      'Custom webhook triggers & cloud storage sync',
      'Role-based access control and audit trails',
    ],
    actionText: 'Contact Engineering',
  },
]

export const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <header className="landing-header">
        <div className="landing-brand">
          <span className="brand-dot" />
          <span className="brand-name">Stocker</span>
          <span className="brand-tag">Canvas Intelligence</span>
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
          <a href="#/pricing" className="nav-link">
            Price Compare
          </a>
        </nav>
        <div className="landing-header-cta">
          <a href="#offerings" className="cta-btn primary-btn sm">
            Get Started
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">Next-Generation Canvas LMS Scraping & Aggregation</div>
        <h1 className="hero-title">
          Turn Canvas LMS Chaos Into <span className="highlight">Structured Intelligence</span>
        </h1>
        <p className="hero-subtitle">
          Stocker bridges Canvas classrooms with developer-grade automation. Extract courseware,
          track deadlines, and power your academic data pipelines with precision.
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
            <span className="metric-number">100%</span>
            <span className="metric-label">Course hierarchy fidelity</span>
          </div>
          <div className="metric-card">
            <span className="metric-number">&lt; 2s</span>
            <span className="metric-label">Incremental sync overhead</span>
          </div>
          <div className="metric-card">
            <span className="metric-number">JSON / SQL</span>
            <span className="metric-label">Ready-to-query formats</span>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section id="who-we-are" className="content-section">
        <div className="section-label">Identity</div>
        <h2 className="section-title">Who We Are</h2>
        <p className="section-lead">
          We are builders, students, and engineers frustrated by walled-garden learning management
          systems.
        </p>
        <div className="who-grid">
          <div className="who-card">
            <h3>Specialized in Academic Data Extraction</h3>
            <p>
              Stocker is crafted by engineers focused on solving the structural quirks and access
              bottlenecks common across Canvas LMS installations worldwide.
            </p>
          </div>
          <div className="who-card">
            <h3>Open & Extensible Architecture</h3>
            <p>
              We believe academic data belongs to learners and instructors. Our tooling provides
              transparent, standardized interfaces to access and query that knowledge.
            </p>
          </div>
          <div className="who-card">
            <h3>Engineered for Reliability</h3>
            <p>
              From authentication flows to dynamic DOM parsing and API rate limiting, we build
              resilient extraction pipelines designed to run reliably under scale.
            </p>
          </div>
        </div>
      </section>

      {/* What We Are Here For (Purpose / Mission) Section */}
      <section id="mission" className="content-section alt-bg">
        <div className="section-label">Purpose & Mission</div>
        <h2 className="section-title">What We Are Here For</h2>
        <p className="section-lead">
          Unlocking academic assets trapped behind complex interfaces so you can study, automate,
          and build without friction.
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
          A comprehensive suite of tools designed to extract, transform, and orchestrate Canvas LMS
          data at any scale.
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
        <h2 className="section-title">Choose Your Tier</h2>
        <p className="section-lead">
          Whether you need personal course archives or institutional infrastructure, Stocker scales
          with your needs.
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
        <h2>Ready to unlock your Canvas data?</h2>
        <p>Get started with Stocker and streamline your academic workflow today.</p>
        <div className="cta-actions">
          <a href="#offerings" className="cta-btn primary-btn">
            Get Started Now
          </a>
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
            <strong>Stocker</strong> Canvas Scraper & Intelligence Suite
          </div>
          <div className="footer-links">
            <a href="#who-we-are">Who We Are</a>
            <a href="#mission">Our Purpose</a>
            <a href="#features">Features</a>
            <a href="#offerings">Offerings</a>
          </div>
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} Stocker Frontend. Engineered for modern education.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
