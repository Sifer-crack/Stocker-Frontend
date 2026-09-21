const FOOD_API_BASE = 'https://api.foodcomposition.co.nz/api'
const COMP_GROUP_ID = 1

export interface FoodSearchResult {
  recordid: string
  foodname: string
  shortname: string
  serving_size_value: number
  serving_size_unit: string
  serving_or_measure_description: string
}

export interface NutritionComponent {
  component_code: string
  component_displayname: string
  value: string
  unit_abbr: string
  amount: string
  num_amount: number
  percent_RDI: string
}

export interface NutritionResult {
  food: FoodSearchResult
  servingAmount: number
  components: NutritionComponent[]
}

function isFoodSearchResult(data: unknown): data is FoodSearchResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    'recordid' in data &&
    typeof data.recordid === 'string' &&
    'serving_size_value' in data &&
    typeof data.serving_size_value === 'number'
  )
}

export async function searchFood(name: string, signal?: AbortSignal): Promise<FoodSearchResult[]> {
  const response = await fetch(`${FOOD_API_BASE}/food?q=${encodeURIComponent(name)}`, {
    signal,
  })
  if (!response.ok) {
    throw new Error(`Food search failed with status ${response.status}`)
  }
  const data: unknown = await response.json()
  if (!Array.isArray(data)) {
    throw new Error('Unexpected food search response from server.')
  }
  return data.filter(isFoodSearchResult)
}

export async function fetchFoodNutrition(
  recordid: string,
  amount: number,
  signal?: AbortSignal,
): Promise<NutritionComponent[]> {
  const response = await fetch(
    `${FOOD_API_BASE}/fiav/food/${encodeURIComponent(recordid)}?amount=${encodeURIComponent(String(amount))}&comp_group_id=${COMP_GROUP_ID}`,
    { signal },
  )
  if (!response.ok) {
    throw new Error(`Nutrition lookup failed with status ${response.status}`)
  }
  const data: unknown = await response.json()
  if (!Array.isArray(data)) {
    throw new Error('Unexpected nutrition response from server.')
  }
  return data as NutritionComponent[]
}

export async function fetchNutritionForFood(
  name: string,
  signal?: AbortSignal,
): Promise<NutritionResult> {
  const results = await searchFood(name, signal)
  if (results.length === 0) {
    throw new Error(`No nutrition data found for "${name}".`)
  }
  const food = results[0]
  const servingAmount = food.serving_size_value
  const components = await fetchFoodNutrition(food.recordid, servingAmount, signal)
  return { food, servingAmount, components }
}
