import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './StoreRecommendations.css'

interface StoreRecommendationsProps {
  items: string[]
  onChooseOption: (option: string) => void
}

function StoreRecommendations({
  items,
  onChooseOption,
}: StoreRecommendationsProps) {
  const navigate = useNavigate()
  const handleBack = () => navigate('/shopping-list')
  const handleChooseOption = (option: string) => {
    onChooseOption(option)
    navigate('/shopping-route')
  }
  const [shoppingMode, setShoppingMode] = useState<
  'in-store' | 'click-collect' | 'delivery'
>('in-store')
const [testScenario, setTestScenario] = useState<
  'single-store' | 'multi-store' | 'travel-override'
>('multi-store')
const scenarioData = {
  'single-store': {
    paknsave: {
      groceries: 80.00,
      travel: 4.00,
    },
    woolworths: {
      groceries: 86.00,
      travel: 3.00,
    },
    multiStore: {
      groceries: 78.00,
      travel: 12.00,
    },
  },

  'multi-store': {
    paknsave: {
      groceries: 86.40,
      travel: 3.20,
    },
    woolworths: {
      groceries: 89.90,
      travel: 3.50,
    },
    multiStore: {
      groceries: 74.30,
      travel: 7.50,
    },
  },

  'travel-override': {
    paknsave: {
      groceries: 82.00,
      travel: 3.00,
    },
    woolworths: {
      groceries: 87.00,
      travel: 4.00,
    },
    multiStore: {
      groceries: 76.00,
      travel: 12.00,
    },
  },
}

const scenario = scenarioData[testScenario]
const paknsaveTotal =
  scenario.paknsave.groceries + scenario.paknsave.travel
const woolworthsTotal =
  scenario.woolworths.groceries + scenario.woolworths.travel
const multiStoreTotal =
  scenario.multiStore.groceries + scenario.multiStore.travel

const rankedInStoreOptions = [
  {
    type: 'paknsave',
    title: "PAK'nSAVE only",
    groceries: scenario.paknsave.groceries,
    travel: scenario.paknsave.travel,
    total: paknsaveTotal,
  },
  {
    type: 'woolworths',
    title: 'Woolworths only',
    groceries: scenario.woolworths.groceries,
    travel: scenario.woolworths.travel,
    total: woolworthsTotal,
  },
  {
    type: 'multi-store',
    title: "PAK'nSAVE + Woolworths",
    groceries: scenario.multiStore.groceries,
    travel: scenario.multiStore.travel,
    total: multiStoreTotal,
  },
].sort((a, b) => a.total - b.total)

const secondInStoreOption = rankedInStoreOptions[1]
const thirdInStoreOption = rankedInStoreOptions[2]
const cheapestTotal = Math.min(
  paknsaveTotal,
  woolworthsTotal,
  multiStoreTotal
)

const multiStoreIsBest = multiStoreTotal === cheapestTotal
const paknsaveIsBest = paknsaveTotal === cheapestTotal

const inStoreRecommendation = multiStoreIsBest
  ? {
      title: "PAK'nSAVE + Woolworths",
      groceries: scenario.multiStore.groceries,
      travel: scenario.multiStore.travel,
      total: multiStoreTotal,
      tags: [
        `PAK'nSAVE · ${Math.max(items.length - 1, 0)} items`,
        'Woolworths · 1 item',
      ],
      storeItems: [
        {
          store: "PAK'nSAVE",
          items: items.slice(0, -1),
        },
        {
          store: 'Woolworths',
          items: items.slice(-1),
        },
      ],
    }
  : paknsaveIsBest
    ? {
        title: "PAK'nSAVE only",
        groceries: scenario.paknsave.groceries,
        travel: scenario.paknsave.travel,
        total: paknsaveTotal,
        tags: [`PAK'nSAVE · ${items.length} items`],
        storeItems: [
          {
            store: "PAK'nSAVE",
            items: items,
          },
        ],
      }
    : {
        title: 'Woolworths only',
        groceries: scenario.woolworths.groceries,
        travel: scenario.woolworths.travel,
        total: woolworthsTotal,
        tags: [`Woolworths · ${items.length} items`],
        storeItems: [
          {
            store: 'Woolworths',
            items: items,
          },
        ],
      }

  const modeData = {
    'in-store': {
    bestTitle: inStoreRecommendation.title,

    bestGroceries: `$${inStoreRecommendation.groceries.toFixed(2)}`,

    bestExtraLabel: 'Travel',

    bestExtra: `$${inStoreRecommendation.travel.toFixed(2)}`,

    bestTotal: `$${inStoreRecommendation.total.toFixed(2)}`,

    bestSavings: `$${(
      Math.max(paknsaveTotal, woolworthsTotal, multiStoreTotal) -
      inStoreRecommendation.total
    ).toFixed(2)}`,

    secondTitle: secondInStoreOption.title,
    secondGroceries: `$${secondInStoreOption.groceries.toFixed(2)}`,
    secondExtraLabel: 'Travel',
    secondExtra: `$${secondInStoreOption.travel.toFixed(2)}`,
    secondTotal: `$${secondInStoreOption.total.toFixed(2)}`,
    secondSavings: `$${(
      thirdInStoreOption.total - secondInStoreOption.total
    ).toFixed(2)}`,

    thirdTitle: thirdInStoreOption.title,
    thirdGroceries: `$${thirdInStoreOption.groceries.toFixed(2)}`,
    thirdExtraLabel: 'Travel',
    thirdExtra: `$${thirdInStoreOption.travel.toFixed(2)}`,
    thirdTotal: `$${thirdInStoreOption.total.toFixed(2)}`,

    bestTags: inStoreRecommendation.tags,

    bestStoreItems: inStoreRecommendation.storeItems,

    secondTags:
      secondInStoreOption.type === 'multi-store'
        ? [
            `PAK'nSAVE · ${Math.max(items.length - 1, 0)} items`,
            'Woolworths · 1 item',
          ]
        : [
            `${secondInStoreOption.title.replace(' only', '')} · ${items.length} items`,
          ],
    thirdTags:
      thirdInStoreOption.type === 'multi-store'
        ? [
            `PAK'nSAVE · ${Math.max(items.length - 1, 0)} items`,
            'Woolworths · 1 item',
          ]
        : [
            `${thirdInStoreOption.title.replace(' only', '')} · ${items.length} items`,
          ],
    },

    'click-collect': {
      bestTitle: "PAK'nSAVE Click & Collect",
      bestGroceries: '$84.40',
      bestExtraLabel: 'Collection fee',
      bestExtra: '$4.00',
      bestTotal: '$88.40',
      bestSavings: '$6.90',

      secondTitle: 'Woolworths Click & Collect',
      secondGroceries: '$89.90',
      secondExtraLabel: 'Collection fee',
      secondExtra: '$0.00',
      secondTotal: '$89.90',
      secondSavings: '$5.40',

      thirdTitle: 'New World Click & Collect',
      thirdGroceries: '$91.50',
      thirdExtraLabel: 'Collection fee',
      thirdExtra: '$3.00',
      thirdTotal: '$94.50',

      bestTags: [
        `PAK'nSAVE · ${items.length} items`,
        'Click & Collect',
      ],
      bestStoreItems: [
        {
          store: "PAK'nSAVE",
          items: items,
        },
      ],
      secondTags: [
        `Woolworths · ${items.length} items`,
        'Click & Collect',
      ],
      thirdTags: [
        `New World · ${items.length} items`,
        'Click & Collect',
      ],
    },

    delivery: {
      bestTitle: 'New World Delivery',
      bestGroceries: '$91.50',
      bestExtraLabel: 'Delivery fee',
      bestExtra: '$9.50',
      bestTotal: '$101.00',
      bestSavings: '$2.40',

      secondTitle: 'Woolworths Delivery',
      secondGroceries: '$89.90',
      secondExtraLabel: 'Delivery fee',
      secondExtra: '$12.00',
      secondTotal: '$101.90',
      secondSavings: '$1.50',

      thirdTitle: "PAK'nSAVE Delivery",
      thirdGroceries: '$86.40',
      thirdExtraLabel: 'Delivery fee',
      thirdExtra: '$16.00',
      thirdTotal: '$102.40',

      bestTags: [
        `New World · ${items.length} items`,
        'Delivery',
      ],
      bestStoreItems: [
        {
          store: 'New World',
          items: items,
        },
      ],
      secondTags: [
        `Woolworths · ${items.length} items`,
        'Delivery',
      ],
      thirdTags: [
        `PAK'nSAVE · ${items.length} items`,
        'Delivery',
      ],
    },
  }

  const currentMode = modeData[shoppingMode]

    return (
    <main className="options-page">
      <header className="options-header">
        <div>
          <h1>Shopping Options</h1>
          <p>Choose the best way to buy your list.</p>
        </div>

        <div className="options-header-actions">
          <input type="text" placeholder="Search products" />

          <button type="button">
            Compare Stores
          </button>
        </div>
      </header>

      <div className="options-content">
        <div className="scenario-selector">
          <strong>Test Scenario:</strong>

          <button
            type="button"
            onClick={() => setTestScenario('single-store')}
            disabled={testScenario === 'single-store'}
          >
            Single Store Cheapest
          </button>

          <button
            type="button"
            onClick={() => setTestScenario('multi-store')}
            disabled={testScenario === 'multi-store'}
          >
            Multi-Store Cheapest
          </button>

          <button
            type="button"
            onClick={() => setTestScenario('travel-override')}
            disabled={testScenario === 'travel-override'}
          >
            Travel Cost Override
          </button>
        </div>
        <div className="option-tabs">
          <button
            type="button"
            className={shoppingMode === 'in-store' ? 'active' : ''}
            onClick={() => setShoppingMode('in-store')}
          >
            In Store
          </button>

          <button
            type="button"
            className={shoppingMode === 'click-collect' ? 'active' : ''}
            onClick={() => setShoppingMode('click-collect')}
          >
            Click & Collect
          </button>

          <button
            type="button"
            className={shoppingMode === 'delivery' ? 'active' : ''}
            onClick={() => setShoppingMode('delivery')}
          >
            Delivery
          </button>
        </div>

        {items.length === 0 ? (
          <section className="options-empty">
            <h2>No shopping list yet</h2>
            <p>Add some items before comparing stores.</p>

            <button type="button" onClick={handleBack}>
              Back to Shopping List
            </button>
          </section>
        ) : (
          <div className="options-grid">
            <article className="option-card best-option">
              <div className="option-card-top">
                <span className="option-label">BEST VALUE</span>
                <strong>Saves {currentMode.bestSavings}</strong>
              </div>

              <h2>{currentMode.bestTitle}</h2>

              <div className="store-tags">
                {currentMode.bestTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              
              <div className="store-item-breakdown">
                {currentMode.bestStoreItems.map((storeGroup) => (
                  <div key={storeGroup.store} className="store-item-group">
                    <strong>{storeGroup.store}</strong>

                    {storeGroup.items.length > 0 ? (
                      <ul>
                        {storeGroup.items.map((item, index) => (
                          <li key={`${storeGroup.store}-${item}-${index}`}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No items</p>
                    )}
                  </div>
                ))}
              </div>

              <p className="lowest-cost">Lowest overall cost</p>

              <div className="price-row">
                <span>Groceries</span>
                <strong>{currentMode.bestGroceries}</strong>
              </div>

              <div className="price-row">
                <span>{currentMode.bestExtraLabel}</span>
                <strong>{currentMode.bestExtra}</strong>
              </div>

              <hr />

              <div className="total-row">
                <span>TOTAL</span>
                <strong>{currentMode.bestTotal}</strong>
              </div>

              <button
                type="button"
                onClick={() => handleChooseOption(currentMode.bestTitle)}
              >
                Choose this option
              </button>
            </article>

            <article className="option-card">
              <div className="option-card-top">
                <span className="option-label">OPTION 2</span>
                <strong>Saves {currentMode.secondSavings}</strong>
              </div>

              <h2>{currentMode.secondTitle}</h2>

              <div className="store-tags">
                {currentMode.secondTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div className="price-row">
                <span>Groceries</span>
                <strong>{currentMode.secondGroceries}</strong>
              </div>

              <div className="price-row">
                <span>{currentMode.secondExtraLabel}</span>
                <strong>{currentMode.secondExtra}</strong>
              </div>

              <hr />

              <div className="total-row">
                <span>TOTAL</span>
                <strong>{currentMode.secondTotal}</strong>
              </div>

              <button
                type="button"
                onClick={() => handleChooseOption(currentMode.secondTitle)}
              >
                Choose
              </button>
            </article>

            <article className="option-card">
              <div className="option-card-top">
                <span className="option-label">OPTION 3</span>
              </div>

              <h2>{currentMode.thirdTitle}</h2>

              <div className="store-tags">
                {currentMode.thirdTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div className="price-row">
                <span>Groceries</span>
                <strong>{currentMode.thirdGroceries}</strong>
              </div>

              <div className="price-row">
                <span>{currentMode.thirdExtraLabel}</span>
                <strong>{currentMode.thirdExtra}</strong>
              </div>

              <hr />

              <div className="total-row">
               <span>TOTAL</span>
                <strong>{currentMode.thirdTotal}</strong>
              </div>

              <button
                type="button"
                onClick={() => handleChooseOption(currentMode.thirdTitle)}
              >
                Choose
              </button>
            </article>
          </div>
        )}
      </div>
    </main>
  )
}

export default StoreRecommendations