import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useShoppingList } from '../context/ShoppingListContext'
import { PricingApiError } from '../pricing/api.ts'
import { CHAINS, chainLabel } from '../pricing/chains.ts'
import { formatPrice } from '../pricing/format.ts'
import { addFavoriteStore, listFavoriteStores, listStoreProducts, removeFavoriteStore } from '../pricing/storesApi.ts'
import type { FavoriteStore, StoreProduct } from '../pricing/types.ts'
import './ShoppingList.css'
import '../pricing/PricingTable.css'
import './FavoriteStores.css'

function errorText(err: unknown, fallback: string): string {
  return err instanceof PricingApiError ? err.message : fallback
}

function favoriteLabel(favorite: FavoriteStore): string {
  return favorite.storeId ? `${chainLabel(favorite.chainId)} · ${favorite.storeId}` : chainLabel(favorite.chainId)
}

/** Pricing searches on the name, so keep the pack size in it when the product name leaves it out. */
function listName(product: StoreProduct): string {
  const size = product.packSize
  return size && !product.name.toLowerCase().includes(size.toLowerCase()) ? `${product.name} ${size}` : product.name
}

function FavoriteStores() {
  const { accessToken } = useAuth()
  // Read the token from a ref so a silent refresh does not refetch the pages' data.
  const tokenRef = useRef(accessToken)
  useLayoutEffect(() => {
    tokenRef.current = accessToken
  })
  const signedIn = accessToken !== null
  const { items, addItem } = useShoppingList()
  const [favorites, setFavorites] = useState<FavoriteStore[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chainToAdd, setChainToAdd] = useState('')
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selected = favorites.find((favorite) => favorite.id === selectedId) ?? null
  const unsavedChains = CHAINS.filter(
    (chain) => !favorites.some((favorite) => favorite.chainId.toUpperCase() === chain.id && favorite.storeId === null),
  )

  useEffect(() => {
    const controller = new AbortController()
    listFavoriteStores(tokenRef.current, controller.signal)
      .then((saved) => {
        setFavorites(saved)
        setSelectedId((current) => current ?? saved[0]?.id ?? null)
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(errorText(err, 'Could not load your favorite stores.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingFavorites(false)
      })
    return () => controller.abort()
  }, [signedIn])

  const selectedChainId = selected?.chainId ?? null
  useEffect(() => {
    if (selectedChainId === null) return
    const controller = new AbortController()
    setLoadingProducts(true)
    setError(null)
    listStoreProducts(selectedChainId, appliedQuery, tokenRef.current, controller.signal)
      .then(setProducts)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setProducts([])
        setError(errorText(err, 'Could not load this store’s products.'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingProducts(false)
      })
    return () => controller.abort()
  }, [selectedChainId, appliedQuery])

  async function handleAddFavorite() {
    if (!chainToAdd) return
    setError(null)
    try {
      const saved = await addFavoriteStore(chainToAdd.toLowerCase(), null, accessToken)
      setFavorites((current) => (current.some((f) => f.id === saved.id) ? current : [...current, saved]))
      setSelectedId(saved.id)
      setChainToAdd('')
    } catch (err) {
      setError(errorText(err, 'Could not save this store.'))
    }
  }

  async function handleRemoveFavorite(favorite: FavoriteStore) {
    setError(null)
    try {
      await removeFavoriteStore(favorite.id, accessToken)
      const remaining = favorites.filter((candidate) => candidate.id !== favorite.id)
      setFavorites(remaining)
      if (selectedId === favorite.id) {
        setSelectedId(remaining[0]?.id ?? null)
        setProducts([])
      }
    } catch (err) {
      setError(errorText(err, 'Could not remove this store.'))
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setAppliedQuery(query.trim())
  }

  const onList = (name: string) => items.some((item) => item.name.toLowerCase() === name.toLowerCase())

  return (
    <main className="shopping-page">
      <header className="shopping-header">
        <div>
          <h1>Favorite Stores</h1>
          <p>Save the supermarkets you shop at and browse what they stock.</p>
        </div>

        <div className="shopping-header-actions">
          <select value={chainToAdd} onChange={(event) => setChainToAdd(event.target.value)}>
            <option value="">Choose a supermarket</option>
            {unsavedChains.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleAddFavorite} disabled={!chainToAdd}>
            Save Store
          </button>
        </div>
      </header>

      <div className="favorite-body">
        {error && <p className="pricing-error">{error}</p>}

        {loadingFavorites ? (
          <p className="item-status">Loading your favorite stores…</p>
        ) : favorites.length === 0 ? (
          <p className="empty-list">No favorite stores yet. Save one above to browse its products.</p>
        ) : (
          <ul className="favorite-chips">
            {favorites.map((favorite) => (
              <li key={favorite.id} className={favorite.id === selectedId ? 'favorite-chip active' : 'favorite-chip'}>
                <button type="button" onClick={() => setSelectedId(favorite.id)}>
                  {favoriteLabel(favorite)}
                </button>
                <button
                  type="button"
                  className="favorite-chip-remove"
                  onClick={() => handleRemoveFavorite(favorite)}
                  aria-label={`Remove ${favoriteLabel(favorite)} from favorites`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <section className="favorite-products-card">
            <form className="favorite-search" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder={`Search ${chainLabel(selected.chainId)} products`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>

            {loadingProducts ? (
              <p className="item-status">Loading products…</p>
            ) : products.length === 0 ? (
              <p className="pricing-empty">
                {appliedQuery
                  ? `No stored products match “${appliedQuery}” at ${chainLabel(selected.chainId)}.`
                  : `Nothing stored for ${chainLabel(selected.chainId)} yet, we'll keep looking.`}
              </p>
            ) : (
              <div className="pricing-table-wrap">
                <table className="pricing-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Captured</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.itemId}>
                        <td>
                          {product.name}
                          {product.brand && <div className="pricing-muted">{product.brand}</div>}
                          {product.packSize && <div className="pricing-muted">{product.packSize}</div>}
                        </td>
                        <td>
                          <strong>{formatPrice(product.priceAmount, product.currency)}</strong>
                          {product.promoFlag && <span className="pricing-tag">Promo</span>}
                        </td>
                        <td>{product.capturedAt ? new Date(product.capturedAt).toLocaleDateString() : '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="favorite-add-btn"
                            onClick={() => addItem(listName(product))}
                            disabled={onList(listName(product))}
                          >
                            {onList(listName(product)) ? 'On your list' : 'Add to list'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

export default FavoriteStores
