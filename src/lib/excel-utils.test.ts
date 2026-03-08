import { describe, it, expect } from 'vitest'
import {
  normalizeValue,
  valuesEqual,
  cardHasChanges,
  comicHasChanges,
  clothingHasChanges,
  createCardCompositeKey,
  createComicCompositeKey,
  createClothingCompositeKey,
  checkForDuplicates,
  formatCardForExport,
  formatComicForExport,
  formatClothingForExport,
  parseCardRow,
  parseComicRow,
  parseClothingRow,
  validateCardRow,
  validateComicRow,
  validateClothingRow
} from './excel-utils'

// ============================================================================
// normalizeValue Tests
// ============================================================================

describe('normalizeValue', () => {
  describe('null/undefined/empty handling', () => {
    it('should return null for null', () => {
      expect(normalizeValue(null)).toBe(null)
    })

    it('should return null for undefined', () => {
      expect(normalizeValue(undefined)).toBe(null)
    })

    it('should return null for empty string', () => {
      expect(normalizeValue('')).toBe(null)
    })

    it('should return null for whitespace-only string', () => {
      expect(normalizeValue('   ')).toBe(null)
      expect(normalizeValue('\t\n')).toBe(null)
    })
  })

  describe('string handling', () => {
    it('should trim strings', () => {
      expect(normalizeValue('  hello  ')).toBe('hello')
    })

    it('should preserve non-numeric strings', () => {
      expect(normalizeValue('hello')).toBe('hello')
      expect(normalizeValue('abc123def')).toBe('abc123def')
    })

    it('should convert numeric strings to numbers', () => {
      expect(normalizeValue('42')).toBe(42)
      expect(normalizeValue('3.14')).toBe(3.14)
      expect(normalizeValue('-10')).toBe(-10)
    })

    it('should not convert strings that look like numbers but are not exact', () => {
      expect(normalizeValue('42.0')).toBe('42.0') // "42.0" !== "42"
      expect(normalizeValue('007')).toBe('007')   // "007" !== "7"
    })
  })

  describe('number handling', () => {
    it('should preserve valid numbers', () => {
      expect(normalizeValue(42)).toBe(42)
      expect(normalizeValue(3.14)).toBe(3.14)
      expect(normalizeValue(-10)).toBe(-10)
      expect(normalizeValue(0)).toBe(0)
    })

    it('should return null for NaN', () => {
      expect(normalizeValue(NaN)).toBe(null)
    })

    it('should return null for Infinity', () => {
      expect(normalizeValue(Infinity)).toBe(null)
      expect(normalizeValue(-Infinity)).toBe(null)
    })
  })

  describe('boolean handling', () => {
    it('should preserve booleans', () => {
      expect(normalizeValue(true)).toBe(true)
      expect(normalizeValue(false)).toBe(false)
    })
  })
})

// ============================================================================
// valuesEqual Tests
// ============================================================================

describe('valuesEqual', () => {
  describe('null comparisons', () => {
    it('should return true for null === null', () => {
      expect(valuesEqual(null, null)).toBe(true)
    })

    it('should return true for undefined === undefined', () => {
      expect(valuesEqual(undefined, undefined)).toBe(true)
    })

    it('should return true for empty === empty', () => {
      expect(valuesEqual('', '')).toBe(true)
    })

    it('should return true for null/undefined/empty combinations', () => {
      expect(valuesEqual(null, undefined)).toBe(true)
      expect(valuesEqual(null, '')).toBe(true)
      expect(valuesEqual(undefined, '')).toBe(true)
    })

    it('should return false for null vs value', () => {
      expect(valuesEqual(null, 'hello')).toBe(false)
      expect(valuesEqual('hello', null)).toBe(false)
      expect(valuesEqual(null, 42)).toBe(false)
    })
  })

  describe('string comparisons', () => {
    it('should compare strings correctly', () => {
      expect(valuesEqual('hello', 'hello')).toBe(true)
      expect(valuesEqual('hello', 'world')).toBe(false)
    })

    it('should handle trimming in comparisons', () => {
      expect(valuesEqual('  hello  ', 'hello')).toBe(true)
      expect(valuesEqual('hello', '  hello  ')).toBe(true)
    })
  })

  describe('number comparisons', () => {
    it('should compare integers correctly', () => {
      expect(valuesEqual(42, 42)).toBe(true)
      expect(valuesEqual(42, 43)).toBe(false)
    })

    it('should compare floats with epsilon tolerance', () => {
      expect(valuesEqual(3.14159, 3.14159)).toBe(true)
      expect(valuesEqual(3.14159, 3.14160)).toBe(true) // within 0.0001
      expect(valuesEqual(3.14159, 3.15)).toBe(false)   // not within 0.0001
    })

    it('should compare numeric strings with numbers', () => {
      expect(valuesEqual('42', 42)).toBe(true)
      expect(valuesEqual(42, '42')).toBe(true)
    })
  })

  describe('boolean comparisons', () => {
    it('should compare booleans correctly', () => {
      expect(valuesEqual(true, true)).toBe(true)
      expect(valuesEqual(false, false)).toBe(true)
      expect(valuesEqual(true, false)).toBe(false)
    })
  })
})

// ============================================================================
// cardHasChanges Tests
// ============================================================================

describe('cardHasChanges', () => {
  const baseCard = {
    container_id: 'container-1',
    grade: 9.5,
    condition: 'Mint',
    quantity: 1,
    price: 100.00,
    cost: 50.00,
    description: 'Test card',
    player: 'Michael Jordan',
    team: 'Chicago Bulls',
    manufacturer: 'Upper Deck',
    sport: 'Basketball',
    year: 1991,
    number: '1',
    number_out_of: 100,
    is_rookie: true
  }

  it('should return false when all values are equal', () => {
    expect(cardHasChanges(baseCard, { ...baseCard })).toBe(false)
  })

  it('should detect container_id change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, container_id: 'container-2' })).toBe(true)
  })

  it('should detect grade change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, grade: 10 })).toBe(true)
  })

  it('should detect condition change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, condition: 'Near Mint' })).toBe(true)
  })

  it('should detect quantity change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, quantity: 2 })).toBe(true)
  })

  it('should detect price change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, price: 150.00 })).toBe(true)
  })

  it('should detect cost change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, cost: 75.00 })).toBe(true)
  })

  it('should detect description change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, description: 'Updated description' })).toBe(true)
  })

  it('should detect player change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, player: 'LeBron James' })).toBe(true)
  })

  it('should detect team change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, team: 'Los Angeles Lakers' })).toBe(true)
  })

  it('should detect manufacturer change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, manufacturer: 'Topps' })).toBe(true)
  })

  it('should detect sport change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, sport: 'Football' })).toBe(true)
  })

  it('should detect year change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, year: 1992 })).toBe(true)
  })

  it('should detect number change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, number: '2' })).toBe(true)
  })

  it('should detect number_out_of change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, number_out_of: 200 })).toBe(true)
  })

  it('should detect is_rookie change', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, is_rookie: false })).toBe(true)
  })

  it('should handle null to value changes', () => {
    const cardWithNulls = { ...baseCard, grade: null, description: null }
    expect(cardHasChanges(cardWithNulls, { ...cardWithNulls, grade: 9.5 })).toBe(true)
    expect(cardHasChanges(cardWithNulls, { ...cardWithNulls, description: 'New description' })).toBe(true)
  })

  it('should handle value to null changes', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, grade: null })).toBe(true)
    expect(cardHasChanges(baseCard, { ...baseCard, description: null })).toBe(true)
  })

  it('should treat whitespace differences as equal after normalization', () => {
    expect(cardHasChanges(baseCard, { ...baseCard, player: '  Michael Jordan  ' })).toBe(false)
  })
})

// ============================================================================
// comicHasChanges Tests
// ============================================================================

describe('comicHasChanges', () => {
  const baseComic = {
    container_id: 'container-1',
    grade: 9.8,
    condition: 'Near Mint',
    quantity: 1,
    price: 500.00,
    cost: 200.00,
    description: 'First appearance',
    title: 'Amazing Spider-Man',
    publisher: 'Marvel',
    issue: 129,
    year: 1974
  }

  it('should return false when all values are equal', () => {
    expect(comicHasChanges(baseComic, { ...baseComic })).toBe(false)
  })

  it('should detect container_id change', () => {
    expect(comicHasChanges(baseComic, { ...baseComic, container_id: 'container-2' })).toBe(true)
  })

  it('should detect grade change', () => {
    expect(comicHasChanges(baseComic, { ...baseComic, grade: 9.0 })).toBe(true)
  })

  it('should detect title change', () => {
    expect(comicHasChanges(baseComic, { ...baseComic, title: 'X-Men' })).toBe(true)
  })

  it('should detect publisher change', () => {
    expect(comicHasChanges(baseComic, { ...baseComic, publisher: 'DC' })).toBe(true)
  })

  it('should detect issue change', () => {
    expect(comicHasChanges(baseComic, { ...baseComic, issue: 130 })).toBe(true)
  })

  it('should detect year change', () => {
    expect(comicHasChanges(baseComic, { ...baseComic, year: 1975 })).toBe(true)
  })

  it('should handle null values correctly', () => {
    const comicWithNulls = { ...baseComic, grade: null }
    expect(comicHasChanges(comicWithNulls, { ...comicWithNulls })).toBe(false)
    expect(comicHasChanges(comicWithNulls, { ...comicWithNulls, grade: 9.0 })).toBe(true)
  })
})

// ============================================================================
// clothingHasChanges Tests
// ============================================================================

describe('clothingHasChanges', () => {
  const baseClothing = {
    container_id: 'container-1',
    condition: 'New',
    quantity: 5,
    price: 29.99,
    cost: 15.00,
    description: 'Cotton t-shirt',
    brand: 'Nike',
    type: 'T-Shirt',
    size: 'M',
    color: 'Black'
  }

  it('should return false when all values are equal', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing })).toBe(false)
  })

  it('should detect container_id change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, container_id: 'container-2' })).toBe(true)
  })

  it('should detect condition change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, condition: 'Used' })).toBe(true)
  })

  it('should detect quantity change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, quantity: 10 })).toBe(true)
  })

  it('should detect brand change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, brand: 'Adidas' })).toBe(true)
  })

  it('should detect type change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, type: 'Hoodie' })).toBe(true)
  })

  it('should detect size change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, size: 'L' })).toBe(true)
  })

  it('should detect color change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, color: 'White' })).toBe(true)
  })

  it('should detect price change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, price: 39.99 })).toBe(true)
  })

  it('should detect cost change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, cost: 20.00 })).toBe(true)
  })

  it('should detect description change', () => {
    expect(clothingHasChanges(baseClothing, { ...baseClothing, description: 'Polyester blend' })).toBe(true)
  })

  it('should NOT check grade (clothing has no grade)', () => {
    // Clothing doesn't have a grade field, so adding one shouldn't matter
    const clothingWithGrade = { ...baseClothing, grade: 9.5 }
    expect(clothingHasChanges(clothingWithGrade, { ...clothingWithGrade, grade: 10 })).toBe(false)
  })
})

// ============================================================================
// Composite Key Generation Tests
// ============================================================================

describe('createCardCompositeKey', () => {
  it('should create consistent keys for same data', () => {
    const row = {
      player: 'Michael Jordan',
      manufacturer: 'Upper Deck',
      sport: 'Basketball',
      year: 1991,
      number: '1',
      team: 'Bulls',
      number_out_of: 100,
      is_rookie: 'Yes',
      grade: 9.5,
      condition: 'Mint',
      quantity: 1,
      price: 100,
      cost: 50,
      description: 'Test'
    }
    const key1 = createCardCompositeKey(row, 'container-1')
    const key2 = createCardCompositeKey(row, 'container-1')
    expect(key1).toBe(key2)
  })

  it('should create different keys for different containers', () => {
    const row = { player: 'Michael Jordan', manufacturer: 'Upper Deck', sport: 'Basketball', year: 1991, number: '1' }
    const key1 = createCardCompositeKey(row, 'container-1')
    const key2 = createCardCompositeKey(row, 'container-2')
    expect(key1).not.toBe(key2)
  })

  it('should normalize case to lowercase', () => {
    const row1 = { player: 'MICHAEL JORDAN', manufacturer: 'UPPER DECK', sport: 'BASKETBALL' }
    const row2 = { player: 'michael jordan', manufacturer: 'upper deck', sport: 'basketball' }
    const key1 = createCardCompositeKey(row1, 'container-1')
    const key2 = createCardCompositeKey(row2, 'container-1')
    expect(key1).toBe(key2)
  })

  it('should trim whitespace', () => {
    const row1 = { player: '  Michael Jordan  ', manufacturer: 'Upper Deck', sport: 'Basketball' }
    const row2 = { player: 'Michael Jordan', manufacturer: 'Upper Deck', sport: 'Basketball' }
    const key1 = createCardCompositeKey(row1, 'container-1')
    const key2 = createCardCompositeKey(row2, 'container-1')
    expect(key1).toBe(key2)
  })

  it('should handle is_rookie variations', () => {
    const rowYes = { player: 'Test', is_rookie: 'Yes' }
    const rowTrue = { player: 'Test', is_rookie: true }
    const rowTrueString = { player: 'Test', is_rookie: 'true' }
    const rowNo = { player: 'Test', is_rookie: 'No' }
    const rowFalse = { player: 'Test', is_rookie: false }

    const keyYes = createCardCompositeKey(rowYes, 'c1')
    const keyTrue = createCardCompositeKey(rowTrue, 'c1')
    const keyTrueString = createCardCompositeKey(rowTrueString, 'c1')
    const keyNo = createCardCompositeKey(rowNo, 'c1')
    const keyFalse = createCardCompositeKey(rowFalse, 'c1')

    expect(keyYes).toBe(keyTrue)
    expect(keyYes).toBe(keyTrueString)
    expect(keyNo).toBe(keyFalse)
    expect(keyYes).not.toBe(keyNo)
  })

  it('should handle null/undefined/empty values', () => {
    const row1 = { player: 'Test', team: null }
    const row2 = { player: 'Test', team: undefined }
    const row3 = { player: 'Test', team: '' }
    const row4 = { player: 'Test' } // team not present

    // All should produce same key for the team field (null)
    const key1 = createCardCompositeKey(row1, 'c1')
    const key2 = createCardCompositeKey(row2, 'c1')
    const key3 = createCardCompositeKey(row3, 'c1')
    const key4 = createCardCompositeKey(row4, 'c1')

    expect(key1).toBe(key2)
    expect(key2).toBe(key3)
    expect(key3).toBe(key4)
  })

  it('should parse numeric strings to numbers', () => {
    const row1 = { player: 'Test', year: '1991', quantity: '2', price: '99.99' }
    const row2 = { player: 'Test', year: 1991, quantity: 2, price: 99.99 }
    const key1 = createCardCompositeKey(row1, 'c1')
    const key2 = createCardCompositeKey(row2, 'c1')
    expect(key1).toBe(key2)
  })

  it('should default quantity to 1', () => {
    const rowWithoutQuantity = { player: 'Test' }
    const rowWithQuantity1 = { player: 'Test', quantity: 1 }
    const key1 = createCardCompositeKey(rowWithoutQuantity, 'c1')
    const key2 = createCardCompositeKey(rowWithQuantity1, 'c1')
    expect(key1).toBe(key2)
  })
})

describe('createComicCompositeKey', () => {
  it('should create consistent keys for same data', () => {
    const row = { title: 'Amazing Spider-Man', publisher: 'Marvel', issue: 129, year: 1974 }
    const key1 = createComicCompositeKey(row, 'container-1')
    const key2 = createComicCompositeKey(row, 'container-1')
    expect(key1).toBe(key2)
  })

  it('should create different keys for different issues', () => {
    const row1 = { title: 'Amazing Spider-Man', publisher: 'Marvel', issue: 129, year: 1974 }
    const row2 = { title: 'Amazing Spider-Man', publisher: 'Marvel', issue: 130, year: 1974 }
    const key1 = createComicCompositeKey(row1, 'container-1')
    const key2 = createComicCompositeKey(row2, 'container-1')
    expect(key1).not.toBe(key2)
  })

  it('should normalize case to lowercase', () => {
    const row1 = { title: 'AMAZING SPIDER-MAN', publisher: 'MARVEL' }
    const row2 = { title: 'amazing spider-man', publisher: 'marvel' }
    const key1 = createComicCompositeKey(row1, 'c1')
    const key2 = createComicCompositeKey(row2, 'c1')
    expect(key1).toBe(key2)
  })

  it('should handle null issue correctly', () => {
    const row1 = { title: 'Test', publisher: 'Marvel', issue: null }
    const row2 = { title: 'Test', publisher: 'Marvel' }
    const key1 = createComicCompositeKey(row1, 'c1')
    const key2 = createComicCompositeKey(row2, 'c1')
    expect(key1).toBe(key2)
  })
})

describe('createClothingCompositeKey', () => {
  it('should create consistent keys for same data', () => {
    const row = { brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' }
    const key1 = createClothingCompositeKey(row, 'container-1')
    const key2 = createClothingCompositeKey(row, 'container-1')
    expect(key1).toBe(key2)
  })

  it('should create different keys for different sizes', () => {
    const row1 = { brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' }
    const row2 = { brand: 'Nike', type: 'T-Shirt', size: 'L', color: 'Black' }
    const key1 = createClothingCompositeKey(row1, 'container-1')
    const key2 = createClothingCompositeKey(row2, 'container-1')
    expect(key1).not.toBe(key2)
  })

  it('should create different keys for different colors', () => {
    const row1 = { brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' }
    const row2 = { brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'White' }
    const key1 = createClothingCompositeKey(row1, 'container-1')
    const key2 = createClothingCompositeKey(row2, 'container-1')
    expect(key1).not.toBe(key2)
  })

  it('should normalize case to lowercase', () => {
    const row1 = { brand: 'NIKE', type: 'T-SHIRT', size: 'M', color: 'BLACK' }
    const row2 = { brand: 'nike', type: 't-shirt', size: 'm', color: 'black' }
    const key1 = createClothingCompositeKey(row1, 'c1')
    const key2 = createClothingCompositeKey(row2, 'c1')
    expect(key1).toBe(key2)
  })

  it('should NOT include grade in the key (clothing has no grade)', () => {
    const row1 = { brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black', grade: 9.5 }
    const row2 = { brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' }
    const key1 = createClothingCompositeKey(row1, 'c1')
    const key2 = createClothingCompositeKey(row2, 'c1')
    // The keys should be the same since grade is not part of clothing key
    expect(key1).toBe(key2)
  })
})

// ============================================================================
// Duplicate Detection Tests
// ============================================================================

describe('checkForDuplicates', () => {
  const containers = [
    { id: 'c1', name: 'Box 1' },
    { id: 'c2', name: 'Box 2' }
  ]

  describe('card duplicates', () => {
    it('should detect no duplicates when all items are unique', () => {
      const items = [
        { container_name: 'Box 1', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball', year: 1991, number: '1' },
        { container_name: 'Box 1', player: 'LeBron James', manufacturer: 'UD', sport: 'Basketball', year: 2003, number: '1' }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createCardCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(false)
      expect(result.duplicates).toHaveLength(0)
    })

    it('should detect duplicates with same player/container/etc', () => {
      const items = [
        { container_name: 'Box 1', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball', year: 1991, number: '1' },
        { container_name: 'Box 1', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball', year: 1991, number: '1' }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createCardCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(true)
      expect(result.duplicates).toHaveLength(1)
      expect(result.duplicates[0].rows).toEqual([2, 3]) // rows 2 and 3 (1-indexed + header)
    })

    it('should NOT detect duplicates for same player in different containers', () => {
      const items = [
        { container_name: 'Box 1', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball', year: 1991, number: '1' },
        { container_name: 'Box 2', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball', year: 1991, number: '1' }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createCardCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(false)
    })

    it('should detect duplicates regardless of case', () => {
      const items = [
        { container_name: 'Box 1', player: 'MICHAEL JORDAN', manufacturer: 'UD', sport: 'Basketball' },
        { container_name: 'Box 1', player: 'michael jordan', manufacturer: 'ud', sport: 'basketball' }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createCardCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(true)
    })

    it('should detect multiple sets of duplicates', () => {
      const items = [
        { container_name: 'Box 1', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball' },
        { container_name: 'Box 1', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball' }, // dup of 1
        { container_name: 'Box 1', player: 'LeBron James', manufacturer: 'UD', sport: 'Basketball' },
        { container_name: 'Box 1', player: 'LeBron James', manufacturer: 'UD', sport: 'Basketball' }  // dup of 3
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createCardCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(true)
      expect(result.duplicates).toHaveLength(2)
    })

    it('should skip items with missing container_name', () => {
      const items = [
        { container_name: 'Box 1', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball' },
        { player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball' }, // missing container
        { container_name: '', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball' } // empty container
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createCardCompositeKey,
        (row) => row.container_name?.toString().trim()
      )
      expect(result.hasDuplicates).toBe(false)
    })

    it('should skip items with invalid container_name', () => {
      const items = [
        { container_name: 'Box 1', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball' },
        { container_name: 'Invalid Box', player: 'Michael Jordan', manufacturer: 'UD', sport: 'Basketball' }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createCardCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(false)
    })
  })

  describe('comic duplicates', () => {
    it('should detect comic duplicates with same title/publisher/issue', () => {
      const items = [
        { container_name: 'Box 1', title: 'Amazing Spider-Man', publisher: 'Marvel', issue: 129 },
        { container_name: 'Box 1', title: 'Amazing Spider-Man', publisher: 'Marvel', issue: 129 }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createComicCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(true)
    })

    it('should NOT detect duplicates for different issues', () => {
      const items = [
        { container_name: 'Box 1', title: 'Amazing Spider-Man', publisher: 'Marvel', issue: 129 },
        { container_name: 'Box 1', title: 'Amazing Spider-Man', publisher: 'Marvel', issue: 130 }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createComicCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(false)
    })
  })

  describe('clothing duplicates', () => {
    it('should detect clothing duplicates with same brand/type/size/color', () => {
      const items = [
        { container_name: 'Box 1', brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' },
        { container_name: 'Box 1', brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createClothingCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(true)
    })

    it('should NOT detect duplicates for different sizes', () => {
      const items = [
        { container_name: 'Box 1', brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' },
        { container_name: 'Box 1', brand: 'Nike', type: 'T-Shirt', size: 'L', color: 'Black' }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createClothingCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(false)
    })

    it('should NOT detect duplicates for different colors', () => {
      const items = [
        { container_name: 'Box 1', brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' },
        { container_name: 'Box 1', brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'White' }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createClothingCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(false)
    })

    it('should allow same clothing in different containers', () => {
      const items = [
        { container_name: 'Box 1', brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' },
        { container_name: 'Box 2', brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' }
      ]
      const result = checkForDuplicates(
        items,
        containers,
        createClothingCompositeKey,
        (row) => row.container_name
      )
      expect(result.hasDuplicates).toBe(false)
    })
  })
})

// ============================================================================
// Export Formatting Tests
// ============================================================================

describe('formatCardForExport', () => {
  it('should format all card fields correctly', () => {
    const card = {
      id: 'card-123',
      container: { name: 'Box 1', zone: { name: 'Zone A' } },
      grade: 9.5,
      condition: 'Mint',
      quantity: 1,
      player: 'Michael Jordan',
      team: 'Chicago Bulls',
      manufacturer: 'Upper Deck',
      sport: 'Basketball',
      year: 1991,
      number: '1',
      number_out_of: 100,
      is_rookie: true,
      price: 100.00,
      cost: 50.00,
      description: 'Test card'
    }

    const result = formatCardForExport(card)

    expect(result.id).toBe('card-123')
    expect(result.container_name).toBe('Box 1')
    expect(result.zone_name).toBe('Zone A')
    expect(result.grade).toBe(9.5)
    expect(result.condition).toBe('Mint')
    expect(result.quantity).toBe(1)
    expect(result.player).toBe('Michael Jordan')
    expect(result.team).toBe('Chicago Bulls')
    expect(result.manufacturer).toBe('Upper Deck')
    expect(result.sport).toBe('Basketball')
    expect(result.year).toBe(1991)
    expect(result.number).toBe('1')
    expect(result.number_out_of).toBe(100)
    expect(result.is_rookie).toBe('Yes')
    expect(result.price).toBe(100.00)
    expect(result.cost).toBe(50.00)
    expect(result.description).toBe('Test card')
  })

  it('should handle null values correctly', () => {
    const card = {
      id: 'card-123',
      container: null,
      grade: null,
      condition: null,
      quantity: 1,
      player: null,
      team: null,
      manufacturer: null,
      sport: null,
      year: null,
      number: null,
      number_out_of: null,
      is_rookie: false,
      price: null,
      cost: null,
      description: null
    }

    const result = formatCardForExport(card)

    expect(result.container_name).toBe('')
    expect(result.zone_name).toBe('')
    expect(result.grade).toBe('')
    expect(result.condition).toBe('')
    expect(result.player).toBe('')
    expect(result.is_rookie).toBe('No')
    expect(result.price).toBe('')
    expect(result.description).toBe('')
  })

  it('should handle missing container zone', () => {
    const card = {
      id: 'card-123',
      container: { name: 'Box 1' },
      quantity: 1,
      is_rookie: true
    }

    const result = formatCardForExport(card)

    expect(result.container_name).toBe('Box 1')
    expect(result.zone_name).toBe('')
  })
})

describe('formatComicForExport', () => {
  it('should format all comic fields correctly', () => {
    const comic = {
      id: 'comic-123',
      container: { name: 'Box 1', zone: { name: 'Zone A' } },
      grade: 9.8,
      condition: 'Near Mint',
      quantity: 1,
      title: 'Amazing Spider-Man',
      publisher: 'Marvel',
      issue: 129,
      year: 1974,
      price: 500.00,
      cost: 200.00,
      description: 'First appearance of Punisher'
    }

    const result = formatComicForExport(comic)

    expect(result.id).toBe('comic-123')
    expect(result.container_name).toBe('Box 1')
    expect(result.zone_name).toBe('Zone A')
    expect(result.grade).toBe(9.8)
    expect(result.title).toBe('Amazing Spider-Man')
    expect(result.publisher).toBe('Marvel')
    expect(result.issue).toBe(129)
    expect(result.year).toBe(1974)
  })

  it('should handle null values correctly', () => {
    const comic = {
      id: 'comic-123',
      container: null,
      grade: null,
      quantity: 1,
      title: null,
      publisher: null,
      issue: null,
      year: null
    }

    const result = formatComicForExport(comic)

    expect(result.container_name).toBe('')
    expect(result.grade).toBe('')
    expect(result.title).toBe('')
    expect(result.issue).toBe('')
  })
})

describe('formatClothingForExport', () => {
  it('should format all clothing fields correctly', () => {
    const clothing = {
      id: 'clothing-123',
      container: { name: 'Box 1', zone: { name: 'Zone A' } },
      condition: 'New',
      quantity: 5,
      brand: 'Nike',
      type: 'T-Shirt',
      size: 'M',
      color: 'Black',
      price: 29.99,
      cost: 15.00,
      description: 'Cotton blend'
    }

    const result = formatClothingForExport(clothing)

    expect(result.id).toBe('clothing-123')
    expect(result.container_name).toBe('Box 1')
    expect(result.zone_name).toBe('Zone A')
    expect(result.condition).toBe('New')
    expect(result.quantity).toBe(5)
    expect(result.brand).toBe('Nike')
    expect(result.type).toBe('T-Shirt')
    expect(result.size).toBe('M')
    expect(result.color).toBe('Black')
    expect(result.price).toBe(29.99)
    expect(result.cost).toBe(15.00)
    expect(result.description).toBe('Cotton blend')
  })

  it('should NOT include grade field (clothing has no grade)', () => {
    const clothing = {
      id: 'clothing-123',
      container: { name: 'Box 1' },
      quantity: 1,
      brand: 'Nike',
      type: 'T-Shirt',
      size: 'M',
      color: 'Black'
    }

    const result = formatClothingForExport(clothing)

    // TypeScript should prevent this, but let's verify at runtime
    expect((result as any).grade).toBeUndefined()
  })
})

// ============================================================================
// Import Parsing Tests
// ============================================================================

describe('parseCardRow', () => {
  it('should parse all card fields correctly', () => {
    const row = {
      grade: '9.5',
      condition: 'Mint',
      quantity: '2',
      price: '100.00',
      cost: '50.00',
      description: 'Test card',
      player: 'Michael Jordan',
      team: 'Chicago Bulls',
      manufacturer: 'Upper Deck',
      sport: 'Basketball',
      year: '1991',
      number: '1',
      number_out_of: '100',
      is_rookie: 'Yes'
    }

    const result = parseCardRow(row, 'container-1')

    expect(result.container_id).toBe('container-1')
    expect(result.grade).toBe(9.5)
    expect(result.condition).toBe('Mint')
    expect(result.quantity).toBe(2)
    expect(result.price).toBe(100.00)
    expect(result.cost).toBe(50.00)
    expect(result.description).toBe('Test card')
    expect(result.player).toBe('Michael Jordan')
    expect(result.team).toBe('Chicago Bulls')
    expect(result.manufacturer).toBe('Upper Deck')
    expect(result.sport).toBe('Basketball')
    expect(result.year).toBe(1991)
    expect(result.number).toBe('1')
    expect(result.number_out_of).toBe(100)
    expect(result.is_rookie).toBe(true)
  })

  it('should handle is_rookie variations', () => {
    expect(parseCardRow({ is_rookie: 'Yes' }, 'c1').is_rookie).toBe(true)
    expect(parseCardRow({ is_rookie: 'yes' }, 'c1').is_rookie).toBe(true)
    expect(parseCardRow({ is_rookie: true }, 'c1').is_rookie).toBe(true)
    expect(parseCardRow({ is_rookie: 'true' }, 'c1').is_rookie).toBe(true)
    expect(parseCardRow({ is_rookie: 'No' }, 'c1').is_rookie).toBe(false)
    expect(parseCardRow({ is_rookie: false }, 'c1').is_rookie).toBe(false)
    expect(parseCardRow({ is_rookie: '' }, 'c1').is_rookie).toBe(false)
    expect(parseCardRow({}, 'c1').is_rookie).toBe(false)
  })

  it('should default quantity to 1', () => {
    expect(parseCardRow({}, 'c1').quantity).toBe(1)
    expect(parseCardRow({ quantity: '' }, 'c1').quantity).toBe(1)
    expect(parseCardRow({ quantity: null }, 'c1').quantity).toBe(1)
  })

  it('should handle null/empty values', () => {
    const row = {
      grade: '',
      condition: '',
      team: '',
      number_out_of: '',
      price: '',
      cost: '',
      description: ''
    }

    const result = parseCardRow(row, 'c1')

    expect(result.grade).toBe(null)
    expect(result.condition).toBe(null)
    expect(result.team).toBe(null)
    expect(result.number_out_of).toBe(null)
    expect(result.price).toBe(null)
    expect(result.cost).toBe(null)
    expect(result.description).toBe(null)
  })

  it('should trim whitespace from strings', () => {
    const row = {
      player: '  Michael Jordan  ',
      team: '  Bulls  ',
      description: '  Test  '
    }

    const result = parseCardRow(row, 'c1')

    expect(result.player).toBe('Michael Jordan')
    expect(result.team).toBe('Bulls')
    expect(result.description).toBe('Test')
  })
})

describe('parseComicRow', () => {
  it('should parse all comic fields correctly', () => {
    const row = {
      grade: '9.8',
      condition: 'Near Mint',
      quantity: '1',
      price: '500.00',
      cost: '200.00',
      description: 'First appearance',
      title: 'Amazing Spider-Man',
      publisher: 'Marvel',
      issue: '129',
      year: '1974'
    }

    const result = parseComicRow(row, 'container-1')

    expect(result.container_id).toBe('container-1')
    expect(result.grade).toBe(9.8)
    expect(result.condition).toBe('Near Mint')
    expect(result.quantity).toBe(1)
    expect(result.title).toBe('Amazing Spider-Man')
    expect(result.publisher).toBe('Marvel')
    expect(result.issue).toBe(129)
    expect(result.year).toBe(1974)
  })

  it('should handle null issue', () => {
    const row = { title: 'Test', publisher: 'Marvel', issue: '' }
    const result = parseComicRow(row, 'c1')
    expect(result.issue).toBe(null)
  })
})

describe('parseClothingRow', () => {
  it('should parse all clothing fields correctly', () => {
    const row = {
      condition: 'New',
      quantity: '5',
      price: '29.99',
      cost: '15.00',
      description: 'Cotton blend',
      brand: 'Nike',
      type: 'T-Shirt',
      size: 'M',
      color: 'Black'
    }

    const result = parseClothingRow(row, 'container-1')

    expect(result.container_id).toBe('container-1')
    expect(result.condition).toBe('New')
    expect(result.quantity).toBe(5)
    expect(result.brand).toBe('Nike')
    expect(result.type).toBe('T-Shirt')
    expect(result.size).toBe('M')
    expect(result.color).toBe('Black')
    expect(result.price).toBe(29.99)
    expect(result.cost).toBe(15.00)
    expect(result.description).toBe('Cotton blend')
  })

  it('should NOT include grade field (clothing has no grade)', () => {
    const row = { brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black', grade: '9.5' }
    const result = parseClothingRow(row, 'c1')
    expect(result.grade).toBeUndefined()
  })

  it('should default quantity to 1', () => {
    expect(parseClothingRow({}, 'c1').quantity).toBe(1)
  })
})

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateCardRow', () => {
  const containers = [{ name: 'Box 1' }, { name: 'Box 2' }]

  it('should return null for valid card', () => {
    const row = {
      container_name: 'Box 1',
      player: 'Michael Jordan',
      manufacturer: 'Upper Deck',
      sport: 'Basketball'
    }
    const result = validateCardRow(row, 2, containers)
    expect(result).toBe(null)
  })

  it('should return error for missing container_name', () => {
    const row = { player: 'Michael Jordan', manufacturer: 'Upper Deck', sport: 'Basketball' }
    const result = validateCardRow(row, 2, containers)
    expect(result).not.toBe(null)
    expect(result?.message).toBe('Missing container_name')
    expect(result?.row).toBe(2)
    expect(result?.type).toBe('card')
  })

  it('should return error for invalid container', () => {
    const row = {
      container_name: 'Invalid Box',
      player: 'Michael Jordan',
      manufacturer: 'Upper Deck',
      sport: 'Basketball'
    }
    const result = validateCardRow(row, 2, containers)
    expect(result).not.toBe(null)
    expect(result?.message).toContain('not found')
  })

  it('should return error for missing player', () => {
    const row = {
      container_name: 'Box 1',
      manufacturer: 'Upper Deck',
      sport: 'Basketball'
    }
    const result = validateCardRow(row, 2, containers)
    expect(result?.message).toBe('Missing player name')
  })

  it('should return error for missing manufacturer', () => {
    const row = {
      container_name: 'Box 1',
      player: 'Michael Jordan',
      sport: 'Basketball'
    }
    const result = validateCardRow(row, 2, containers)
    expect(result?.message).toBe('Missing manufacturer')
  })

  it('should return error for missing sport', () => {
    const row = {
      container_name: 'Box 1',
      player: 'Michael Jordan',
      manufacturer: 'Upper Deck'
    }
    const result = validateCardRow(row, 2, containers)
    expect(result?.message).toBe('Missing sport')
  })

  it('should match container case-insensitively', () => {
    const row = {
      container_name: 'BOX 1',
      player: 'Michael Jordan',
      manufacturer: 'Upper Deck',
      sport: 'Basketball'
    }
    const result = validateCardRow(row, 2, containers)
    expect(result).toBe(null)
  })
})

describe('validateComicRow', () => {
  const containers = [{ name: 'Box 1' }]

  it('should return null for valid comic', () => {
    const row = {
      container_name: 'Box 1',
      title: 'Amazing Spider-Man',
      publisher: 'Marvel'
    }
    const result = validateComicRow(row, 2, containers)
    expect(result).toBe(null)
  })

  it('should return error for missing container_name', () => {
    const row = { title: 'Amazing Spider-Man', publisher: 'Marvel' }
    const result = validateComicRow(row, 2, containers)
    expect(result?.message).toBe('Missing container_name')
  })

  it('should return error for missing title', () => {
    const row = { container_name: 'Box 1', publisher: 'Marvel' }
    const result = validateComicRow(row, 2, containers)
    expect(result?.message).toBe('Missing title')
  })

  it('should return error for missing publisher', () => {
    const row = { container_name: 'Box 1', title: 'Amazing Spider-Man' }
    const result = validateComicRow(row, 2, containers)
    expect(result?.message).toBe('Missing publisher')
  })
})

describe('validateClothingRow', () => {
  const containers = [{ name: 'Box 1' }]

  it('should return null for valid clothing', () => {
    const row = {
      container_name: 'Box 1',
      brand: 'Nike',
      type: 'T-Shirt',
      size: 'M',
      color: 'Black'
    }
    const result = validateClothingRow(row, 2, containers)
    expect(result).toBe(null)
  })

  it('should return error for missing container_name', () => {
    const row = { brand: 'Nike', type: 'T-Shirt', size: 'M', color: 'Black' }
    const result = validateClothingRow(row, 2, containers)
    expect(result?.message).toBe('Missing container_name')
  })

  it('should return error for missing brand', () => {
    const row = { container_name: 'Box 1', type: 'T-Shirt', size: 'M', color: 'Black' }
    const result = validateClothingRow(row, 2, containers)
    expect(result?.message).toBe('Missing brand')
  })

  it('should return error for missing type', () => {
    const row = { container_name: 'Box 1', brand: 'Nike', size: 'M', color: 'Black' }
    const result = validateClothingRow(row, 2, containers)
    expect(result?.message).toBe('Missing type')
  })

  it('should return error for missing size', () => {
    const row = { container_name: 'Box 1', brand: 'Nike', type: 'T-Shirt', color: 'Black' }
    const result = validateClothingRow(row, 2, containers)
    expect(result?.message).toBe('Missing size')
  })

  it('should return error for missing color', () => {
    const row = { container_name: 'Box 1', brand: 'Nike', type: 'T-Shirt', size: 'M' }
    const result = validateClothingRow(row, 2, containers)
    expect(result?.message).toBe('Missing color')
  })
})

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('numeric edge cases', () => {
    it('should handle zero values', () => {
      expect(normalizeValue(0)).toBe(0)
      expect(valuesEqual(0, 0)).toBe(true)
      expect(valuesEqual(0, null)).toBe(false)
    })

    it('should handle negative numbers', () => {
      expect(normalizeValue(-100)).toBe(-100)
      expect(valuesEqual(-100, -100)).toBe(true)
    })

    it('should handle very small floats', () => {
      expect(valuesEqual(0.00001, 0.00002)).toBe(true) // within epsilon
      expect(valuesEqual(0.0001, 0.0002)).toBe(false)  // not within epsilon
    })
  })

  describe('string edge cases', () => {
    it('should handle special characters', () => {
      expect(normalizeValue('O\'Brien')).toBe('O\'Brien')
      expect(valuesEqual('O\'Brien', 'O\'Brien')).toBe(true)
    })

    it('should handle unicode characters', () => {
      expect(normalizeValue('José')).toBe('José')
      expect(valuesEqual('José', 'José')).toBe(true)
    })

    it('should handle newlines and tabs', () => {
      expect(normalizeValue('hello\nworld')).toBe('hello\nworld')
      expect(normalizeValue('\t\n')).toBe(null) // all whitespace
    })
  })

  describe('composite key robustness', () => {
    it('should produce valid JSON', () => {
      const row = { player: 'Test', manufacturer: 'Test', sport: 'Test' }
      const key = createCardCompositeKey(row, 'c1')
      expect(() => JSON.parse(key)).not.toThrow()
    })

    it('should handle special characters in values', () => {
      const row = { player: 'Test "Special" Player', manufacturer: 'O\'Reilly', sport: 'Test' }
      const key = createCardCompositeKey(row, 'c1')
      expect(() => JSON.parse(key)).not.toThrow()
    })
  })
})
