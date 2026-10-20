export interface PantryExportItem {
  productName: string
  quantity: number
  unit: string
  category: string | null
}

export interface PantryExport {
  format: 'stocker-pantry'
  version: 1
  exportedAt: string
  items: PantryExportItem[]
}

export function parsePantryExport(json: string): PantryExport {
  // convert json string into data
  // JSON.parse throws an error automatically if the json is invalid.
  const parsed: unknown = JSON.parse(json)

  // check that imported data is an object.
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error('Invalid pantry export: expected an object.')
  }

  const data = parsed as Record<string, unknown>

  // check the file format.
  if (data.format !== 'stocker-pantry') {
    throw new Error('Unsupported pantry export format.')
  }

  // check supported version
  if (data.version !== 1) {
    throw new Error('Unsupported pantry export version.')
  }

  // check for valid export date
  if (
    typeof data.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(data.exportedAt))
  ) {
    throw new Error('Invalid pantry export date.')
  }

  // check that items is an array
  if (!Array.isArray(data.items)) {
    throw new Error('Invalid pantry export: items must be an array.')
  }

  // validate each pantry item
  const items: PantryExportItem[] = data.items.map(
    (entry: unknown, index: number): PantryExportItem => {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        Array.isArray(entry)
      ) {
        throw new Error(`Invalid pantry item at index ${index}.`)
      }

      const item = entry as Record<string, unknown>

      if (
        typeof item.productName !== 'string' ||
        item.productName.trim() === ''
      ) {
        throw new Error(
          `Pantry item at index ${index} must have a product name.`,
        )
      }

      // quantity must greater than or equal to zero
      if (
        typeof item.quantity !== 'number' ||
        !Number.isFinite(item.quantity) ||
        item.quantity < 0
      ) {
        throw new Error(
          `Pantry item at index ${index} has an invalid quantity.`,
        )
      }

      // unit must be a string.
      if (typeof item.unit !== 'string') {
        throw new Error(
          `Pantry item at index ${index} has an invalid unit.`,
        )
      }

      // category can be a string or null
      if (
        item.category !== undefined &&
        typeof item.category !== 'string' &&
        item.category !== null
      ) {
        throw new Error(
          `Pantry item at index ${index} has an invalid category.`,
        )
      }

      return {
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        category:
          typeof item.category === 'string' ? item.category : null,
      }
    },
  )

  // return the validated pantry export
  return {
    format: 'stocker-pantry',
    version: 1,
    exportedAt: data.exportedAt,
    items,
  }
}