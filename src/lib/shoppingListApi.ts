import type { ShoppingItem } from '../App'

const SHOPPING_API = 'http://localhost:8083'
const CATALOG_API = 'http://localhost:8082'

interface ShoppingListApiItem {
    shoppingListId: string
    productId: string
    quantity: number
    shoppingListItemId: string
    status: string
}

interface ProductApiItem {
    productId: string
    productName: string
    groceryType: string | null
    sellingWeightKg: number | null
    sellingVolumeL: number | null
}

interface ShoppingListResponse {
    value?: ShoppingListApiItem[]
    items?: ShoppingListApiItem[]
}

function getShoppingListItemsFromResponse(
    data: ShoppingListApiItem[] | ShoppingListResponse,
    ): ShoppingListApiItem[] {
    if (Array.isArray(data)) {
        return data
    }
    return data.value ?? data.items ?? []
}

// load user's shopping list and resolve product names via catalog service
export async function fetchShoppingList(
    userId: string,
    signal?: AbortSignal,
): Promise<ShoppingItem[]> {
    const response = await fetch(
        `${SHOPPING_API}/shopping-lists?userId=${encodeURIComponent(userId)}`,
        { signal },
    )
    if (!response.ok) {
        throw new Error('Unable to load your shopping list.')
    }

    const data = await response.json()
    const apiItems = getShoppingListItemsFromResponse(data)

    return Promise.all(
        apiItems.map(async (item) => {
            const productResponse = await fetch(
                `${CATALOG_API}/products/${encodeURIComponent(item.productId)}`,
                { signal },
            )

            if (!productResponse.ok) {
                throw new Error(`Unable to load product ${item.productId}`,
                )
            }

            const product: ProductApiItem = await productResponse.json()

            return {
                name: product.productName,
                productId: item.productId,
                shoppingListItemId: item.shoppingListItemId,
                quantity: item.quantity,
                status: item.status,
            }
        }),
    )
}

// add a product to the users shopping list
export async function addShoppingListItem(
    userId: string,
    productId: string,
    quantity = 1,
): Promise<void> {
    const params = new URLSearchParams({
        userId,
        productId,
        quantity: String(quantity),
    })

    const response = await fetch(
        `${SHOPPING_API}/shopping-lists/items?${params.toString()}`,
        {
            method: 'POST'
        },
    )

    if (!response.ok) {
        throw new Error('Unable to add the product to your shopping list.')
    }
}

// remove an item using shopping-list-item uuid
export async function deleteShoppingListItem(
    userId: string,
    shoppingListItemId: string,
) : Promise<void> {
    const params = new URLSearchParams({ userId })

    const response = await fetch(
        `${SHOPPING_API}/shopping-lists/items/${encodeURIComponent(shoppingListItemId)}?${params.toString()}`,
        {
            method: 'DELETE',
        },
    )

    if (!response.ok) {
        throw new Error('Unable to remove the shopping list item.')
    }
}