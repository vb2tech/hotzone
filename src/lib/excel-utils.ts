/**
 * Excel Upload/Download Utilities
 *
 * This module contains all the utility functions for processing Excel uploads
 * and downloads, including value normalization, change detection, composite key
 * generation, and duplicate detection.
 */

// ============================================================================
// VALUE NORMALIZATION
// ============================================================================

/**
 * Normalizes a value for comparison purposes.
 * - Converts null, undefined, and empty strings to null
 * - Trims strings and attempts to parse numeric strings
 * - Handles NaN and Infinity as null
 * - Preserves booleans
 */
export const normalizeValue = (value: any): any => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    // Try to parse as number if it looks like one
    const num = parseFloat(trimmed)
    if (!isNaN(num) && isFinite(num) && trimmed === num.toString()) {
      return num
    }
    return trimmed
  }
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value
  }
  if (typeof value === 'boolean') {
    return value
  }
  return value
}

/**
 * Compares two values for equality after normalization.
 * - Handles null comparisons
 * - Uses epsilon comparison for floating point numbers
 */
export const valuesEqual = (a: any, b: any): boolean => {
  const normA = normalizeValue(a)
  const normB = normalizeValue(b)

  if (normA === null && normB === null) return true
  if (normA === null || normB === null) return false

  if (typeof normA === 'number' && typeof normB === 'number') {
    return Math.abs(normA - normB) < 0.0001
  }

  return normA === normB
}

// ============================================================================
// CHANGE DETECTION
// ============================================================================

/**
 * Checks if card data has changes compared to existing data.
 * Compares all relevant card fields.
 */
export const cardHasChanges = (existing: any, newData: any): boolean => {
  return (
    !valuesEqual(existing.container_id, newData.container_id) ||
    !valuesEqual(existing.grade, newData.grade) ||
    !valuesEqual(existing.condition, newData.condition) ||
    !valuesEqual(existing.quantity, newData.quantity) ||
    !valuesEqual(existing.price, newData.price) ||
    !valuesEqual(existing.cost, newData.cost) ||
    !valuesEqual(existing.description, newData.description) ||
    !valuesEqual(existing.player, newData.player) ||
    !valuesEqual(existing.team, newData.team) ||
    !valuesEqual(existing.manufacturer, newData.manufacturer) ||
    !valuesEqual(existing.sport, newData.sport) ||
    !valuesEqual(existing.year, newData.year) ||
    !valuesEqual(existing.number, newData.number) ||
    !valuesEqual(existing.number_out_of, newData.number_out_of) ||
    !valuesEqual(existing.is_rookie, newData.is_rookie)
  )
}

/**
 * Checks if comic data has changes compared to existing data.
 * Compares all relevant comic fields.
 */
export const comicHasChanges = (existing: any, newData: any): boolean => {
  return (
    !valuesEqual(existing.container_id, newData.container_id) ||
    !valuesEqual(existing.grade, newData.grade) ||
    !valuesEqual(existing.condition, newData.condition) ||
    !valuesEqual(existing.quantity, newData.quantity) ||
    !valuesEqual(existing.price, newData.price) ||
    !valuesEqual(existing.cost, newData.cost) ||
    !valuesEqual(existing.description, newData.description) ||
    !valuesEqual(existing.title, newData.title) ||
    !valuesEqual(existing.publisher, newData.publisher) ||
    !valuesEqual(existing.issue, newData.issue) ||
    !valuesEqual(existing.year, newData.year)
  )
}

/**
 * Checks if clothing data has changes compared to existing data.
 * Compares all relevant clothing fields (no grade field for clothing).
 */
export const clothingHasChanges = (existing: any, newData: any): boolean => {
  return (
    !valuesEqual(existing.container_id, newData.container_id) ||
    !valuesEqual(existing.condition, newData.condition) ||
    !valuesEqual(existing.quantity, newData.quantity) ||
    !valuesEqual(existing.price, newData.price) ||
    !valuesEqual(existing.cost, newData.cost) ||
    !valuesEqual(existing.description, newData.description) ||
    !valuesEqual(existing.brand, newData.brand) ||
    !valuesEqual(existing.type, newData.type) ||
    !valuesEqual(existing.size, newData.size) ||
    !valuesEqual(existing.color, newData.color)
  )
}

// ============================================================================
// COMPOSITE KEY GENERATION
// ============================================================================

export interface CardCompositeKeyData {
  container_id: string
  player: string
  manufacturer: string
  sport: string
  year: number | null
  number: string
  team: string | null
  number_out_of: number | null
  is_rookie: boolean
  grade: number | null
  condition: string | null
  quantity: number
  price: number | null
  cost: number | null
  description: string | null
}

export interface ComicCompositeKeyData {
  container_id: string
  title: string
  publisher: string
  issue: number | null
  year: number | null
  grade: number | null
  condition: string | null
  quantity: number
  price: number | null
  cost: number | null
  description: string | null
}

export interface ClothingCompositeKeyData {
  container_id: string
  brand: string
  type: string
  size: string
  color: string
  condition: string | null
  quantity: number
  price: number | null
  cost: number | null
  description: string | null
}

/**
 * Creates a composite key for card duplicate detection.
 * The key includes all fields that uniquely identify a card entry.
 */
export const createCardCompositeKey = (row: any, containerId: string): string => {
  const keyData: CardCompositeKeyData = {
    container_id: containerId,
    player: row.player?.toString().trim().toLowerCase() || '',
    manufacturer: row.manufacturer?.toString().trim().toLowerCase() || '',
    sport: row.sport?.toString().trim().toLowerCase() || '',
    year: row.year ? parseInt(String(row.year)) : null,
    number: row.number?.toString().trim().toLowerCase() || '',
    team: row.team?.toString().trim().toLowerCase() || null,
    number_out_of: row.number_out_of ? parseInt(String(row.number_out_of)) : null,
    is_rookie: row.is_rookie?.toString().toLowerCase() === 'yes' || row.is_rookie === true || row.is_rookie === 'true',
    grade: row.grade ? parseFloat(String(row.grade)) : null,
    condition: row.condition?.toString().trim().toLowerCase() || null,
    quantity: row.quantity ? parseInt(String(row.quantity)) : 1,
    price: row.price ? parseFloat(String(row.price)) : null,
    cost: row.cost ? parseFloat(String(row.cost)) : null,
    description: row.description?.toString().trim().toLowerCase() || null
  }
  return JSON.stringify(keyData)
}

/**
 * Creates a composite key for comic duplicate detection.
 * The key includes all fields that uniquely identify a comic entry.
 */
export const createComicCompositeKey = (row: any, containerId: string): string => {
  const keyData: ComicCompositeKeyData = {
    container_id: containerId,
    title: row.title?.toString().trim().toLowerCase() || '',
    publisher: row.publisher?.toString().trim().toLowerCase() || '',
    issue: row.issue ? parseInt(String(row.issue)) : null,
    year: row.year ? parseInt(String(row.year)) : null,
    grade: row.grade ? parseFloat(String(row.grade)) : null,
    condition: row.condition?.toString().trim().toLowerCase() || null,
    quantity: row.quantity ? parseInt(String(row.quantity)) : 1,
    price: row.price ? parseFloat(String(row.price)) : null,
    cost: row.cost ? parseFloat(String(row.cost)) : null,
    description: row.description?.toString().trim().toLowerCase() || null
  }
  return JSON.stringify(keyData)
}

/**
 * Creates a composite key for clothing duplicate detection.
 * The key includes all fields that uniquely identify a clothing entry.
 */
export const createClothingCompositeKey = (row: any, containerId: string): string => {
  const keyData: ClothingCompositeKeyData = {
    container_id: containerId,
    brand: row.brand?.toString().trim().toLowerCase() || '',
    type: row.type?.toString().trim().toLowerCase() || '',
    size: row.size?.toString().trim().toLowerCase() || '',
    color: row.color?.toString().trim().toLowerCase() || '',
    condition: row.condition?.toString().trim().toLowerCase() || null,
    quantity: row.quantity ? parseInt(String(row.quantity)) : 1,
    price: row.price ? parseFloat(String(row.price)) : null,
    cost: row.cost ? parseFloat(String(row.cost)) : null,
    description: row.description?.toString().trim().toLowerCase() || null
  }
  return JSON.stringify(keyData)
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

export interface DuplicateCheckResult {
  hasDuplicates: boolean
  duplicates: Array<{ key: string; rows: number[] }>
}

/**
 * Checks for duplicate entries within a list of items using a composite key function.
 * Returns information about which rows are duplicates.
 */
export const checkForDuplicates = (
  items: any[],
  containers: Array<{ id: string; name: string }>,
  createKeyFn: (row: any, containerId: string) => string,
  getContainerName: (row: any) => string | undefined
): DuplicateCheckResult => {
  const keyMap = new Map<string, number[]>()

  for (let i = 0; i < items.length; i++) {
    const row = items[i]
    const rowNumber = i + 2 // Excel rows start at 1, plus header row

    const containerName = getContainerName(row)
    if (!containerName) continue

    const container = containers.find(c => c.name.toLowerCase() === containerName.toLowerCase())
    if (!container) continue

    const key = createKeyFn(row, container.id)
    if (!keyMap.has(key)) {
      keyMap.set(key, [])
    }
    keyMap.get(key)!.push(rowNumber)
  }

  const duplicates: Array<{ key: string; rows: number[] }> = []
  for (const [key, rows] of keyMap.entries()) {
    if (rows.length > 1) {
      duplicates.push({ key, rows })
    }
  }

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates
  }
}

// ============================================================================
// EXPORT DATA FORMATTING
// ============================================================================

export interface CardExportData {
  id: string
  container_name: string
  zone_name: string
  grade: number | string
  condition: string
  quantity: number
  player: string
  team: string
  manufacturer: string
  sport: string
  year: number | string
  number: string
  number_out_of: number | string
  is_rookie: string
  price: number | string
  cost: number | string
  description: string
}

export interface ComicExportData {
  id: string
  container_name: string
  zone_name: string
  grade: number | string
  condition: string
  quantity: number
  title: string
  publisher: string
  issue: number | string
  year: number | string
  price: number | string
  cost: number | string
  description: string
}

export interface ClothingExportData {
  id: string
  container_name: string
  zone_name: string
  condition: string
  quantity: number
  brand: string
  type: string
  size: string
  color: string
  price: number | string
  cost: number | string
  description: string
}

/**
 * Formats a card item for Excel export
 */
export const formatCardForExport = (card: any): CardExportData => ({
  id: card.id,
  container_name: card.container?.name || '',
  zone_name: card.container?.zone?.name || '',
  grade: card.grade ?? '',
  condition: card.condition || '',
  quantity: card.quantity,
  player: card.player || '',
  team: card.team || '',
  manufacturer: card.manufacturer || '',
  sport: card.sport || '',
  year: card.year ?? '',
  number: card.number || '',
  number_out_of: card.number_out_of ?? '',
  is_rookie: card.is_rookie ? 'Yes' : 'No',
  price: card.price ?? '',
  cost: card.cost ?? '',
  description: card.description || ''
})

/**
 * Formats a comic item for Excel export
 */
export const formatComicForExport = (comic: any): ComicExportData => ({
  id: comic.id,
  container_name: comic.container?.name || '',
  zone_name: comic.container?.zone?.name || '',
  grade: comic.grade ?? '',
  condition: comic.condition || '',
  quantity: comic.quantity,
  title: comic.title || '',
  publisher: comic.publisher || '',
  issue: comic.issue ?? '',
  year: comic.year ?? '',
  price: comic.price ?? '',
  cost: comic.cost ?? '',
  description: comic.description || ''
})

/**
 * Formats a clothing item for Excel export
 */
export const formatClothingForExport = (clothing: any): ClothingExportData => ({
  id: clothing.id,
  container_name: clothing.container?.name || '',
  zone_name: clothing.container?.zone?.name || '',
  condition: clothing.condition || '',
  quantity: clothing.quantity,
  brand: clothing.brand || '',
  type: clothing.type || '',
  size: clothing.size || '',
  color: clothing.color || '',
  price: clothing.price ?? '',
  cost: clothing.cost ?? '',
  description: clothing.description || ''
})

// ============================================================================
// IMPORT DATA PARSING
// ============================================================================

/**
 * Parses a row from the Cards Excel sheet into card data
 */
export const parseCardRow = (row: any, containerId: string): any => {
  return {
    container_id: containerId,
    grade: row.grade ? parseFloat(String(row.grade)) : null,
    condition: row.condition?.toString().trim() || null,
    quantity: row.quantity ? parseInt(String(row.quantity)) : 1,
    price: row.price ? parseFloat(String(row.price)) : null,
    cost: row.cost ? parseFloat(String(row.cost)) : null,
    description: row.description?.toString().trim() || null,
    player: row.player?.toString().trim() || '',
    team: row.team?.toString().trim() || null,
    manufacturer: row.manufacturer?.toString().trim() || '',
    sport: row.sport?.toString().trim() || '',
    year: row.year ? parseInt(String(row.year)) : new Date().getFullYear(),
    number: row.number?.toString().trim() || '',
    number_out_of: row.number_out_of ? parseInt(String(row.number_out_of)) : null,
    is_rookie: row.is_rookie?.toString().toLowerCase() === 'yes' || row.is_rookie === true || row.is_rookie === 'true'
  }
}

/**
 * Parses a row from the Comics Excel sheet into comic data
 */
export const parseComicRow = (row: any, containerId: string): any => {
  return {
    container_id: containerId,
    grade: row.grade ? parseFloat(String(row.grade)) : null,
    condition: row.condition?.toString().trim() || null,
    quantity: row.quantity ? parseInt(String(row.quantity)) : 1,
    price: row.price ? parseFloat(String(row.price)) : null,
    cost: row.cost ? parseFloat(String(row.cost)) : null,
    description: row.description?.toString().trim() || null,
    title: row.title?.toString().trim() || '',
    publisher: row.publisher?.toString().trim() || '',
    issue: row.issue ? parseInt(String(row.issue)) : null,
    year: row.year ? parseInt(String(row.year)) : new Date().getFullYear()
  }
}

/**
 * Parses a row from the Clothing Excel sheet into clothing data
 */
export const parseClothingRow = (row: any, containerId: string): any => {
  return {
    container_id: containerId,
    condition: row.condition?.toString().trim() || null,
    quantity: row.quantity ? parseInt(String(row.quantity)) : 1,
    price: row.price ? parseFloat(String(row.price)) : null,
    cost: row.cost ? parseFloat(String(row.cost)) : null,
    description: row.description?.toString().trim() || null,
    brand: row.brand?.toString().trim() || '',
    type: row.type?.toString().trim() || '',
    size: row.size?.toString().trim() || '',
    color: row.color?.toString().trim() || ''
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  row: number
  type: 'card' | 'comic' | 'clothing'
  message: string
}

/**
 * Validates a card row from Excel
 */
export const validateCardRow = (row: any, rowNumber: number, containers: Array<{ name: string }>): ValidationError | null => {
  const containerName = row.container_name?.toString().trim()
  if (!containerName) {
    return { row: rowNumber, type: 'card', message: 'Missing container_name' }
  }

  const container = containers.find(c => c.name.toLowerCase() === containerName.toLowerCase())
  if (!container) {
    return { row: rowNumber, type: 'card', message: `Container "${containerName}" not found` }
  }

  if (!row.player?.toString().trim()) {
    return { row: rowNumber, type: 'card', message: 'Missing player name' }
  }

  if (!row.manufacturer?.toString().trim()) {
    return { row: rowNumber, type: 'card', message: 'Missing manufacturer' }
  }

  if (!row.sport?.toString().trim()) {
    return { row: rowNumber, type: 'card', message: 'Missing sport' }
  }

  return null
}

/**
 * Validates a comic row from Excel
 */
export const validateComicRow = (row: any, rowNumber: number, containers: Array<{ name: string }>): ValidationError | null => {
  const containerName = row.container_name?.toString().trim()
  if (!containerName) {
    return { row: rowNumber, type: 'comic', message: 'Missing container_name' }
  }

  const container = containers.find(c => c.name.toLowerCase() === containerName.toLowerCase())
  if (!container) {
    return { row: rowNumber, type: 'comic', message: `Container "${containerName}" not found` }
  }

  if (!row.title?.toString().trim()) {
    return { row: rowNumber, type: 'comic', message: 'Missing title' }
  }

  if (!row.publisher?.toString().trim()) {
    return { row: rowNumber, type: 'comic', message: 'Missing publisher' }
  }

  return null
}

/**
 * Validates a clothing row from Excel
 */
export const validateClothingRow = (row: any, rowNumber: number, containers: Array<{ name: string }>): ValidationError | null => {
  const containerName = row.container_name?.toString().trim()
  if (!containerName) {
    return { row: rowNumber, type: 'clothing', message: 'Missing container_name' }
  }

  const container = containers.find(c => c.name.toLowerCase() === containerName.toLowerCase())
  if (!container) {
    return { row: rowNumber, type: 'clothing', message: `Container "${containerName}" not found` }
  }

  if (!row.brand?.toString().trim()) {
    return { row: rowNumber, type: 'clothing', message: 'Missing brand' }
  }

  if (!row.type?.toString().trim()) {
    return { row: rowNumber, type: 'clothing', message: 'Missing type' }
  }

  if (!row.size?.toString().trim()) {
    return { row: rowNumber, type: 'clothing', message: 'Missing size' }
  }

  if (!row.color?.toString().trim()) {
    return { row: rowNumber, type: 'clothing', message: 'Missing color' }
  }

  return null
}
