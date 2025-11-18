import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Container, Zone } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Layers, Plus, Save, X, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Filter, X as XIcon, Download, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

type ViewSize = 'small' | 'medium' | 'large'

interface ItemWithDetails {
  id: string
  user_id: string
  container_id: string
  created_at: string
  updated_at: string
  grade: number | null
  condition: string | null
  quantity: number
  item_type: 'card' | 'comic'
  description: string | null
  container: (Container & {
    zone: Zone | null
  }) | null
  // Card fields
  player?: string
  team: string | null
  manufacturer?: string
  sport?: string
  year?: number
  number?: string
  number_out_of?: number | null
  is_rookie?: boolean
  // Comic fields
  title?: string
  publisher?: string
  issue?: number
  // Common fields
  price?: number | null
  cost?: number | null
  // For tracking cloned/editing items
  isNew?: boolean
  isEditing?: boolean
}

interface ContainerWithZone extends Container {
  zone: Zone | null
}

export const ItemsPage: React.FC = () => {
  const [items, setItems] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'card' | 'comic' | 'graded-card' | 'graded-comic'>('all')
  const [containers, setContainers] = useState<ContainerWithZone[]>([])
  const [editingItems, setEditingItems] = useState<Map<string, ItemWithDetails>>(new Map())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    const saved = localStorage.getItem('items-per-page')
    return saved ? parseInt(saved, 10) : 25
  })
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [viewSize, setViewSize] = useState<ViewSize>(() => {
    const saved = localStorage.getItem('items-view-size')
    return (saved as ViewSize) || 'medium'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadResults, setUploadResults] = useState<{
    success: boolean
    partial: boolean
    cardsCreated: number
    cardsUpdated: number
    comicsCreated: number
    comicsUpdated: number
    errors: Array<{ row: number; type: 'card' | 'comic'; message: string }>
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [filters, setFilters] = useState({
    type: '' as '' | 'card' | 'comic',
    name: '',
    manufacturer: '',
    sport: '',
    publisher: '',
    team: '',
    cardNumber: '',
    container: '',
    zone: '',
    yearMin: '',
    yearMax: '',
    quantityMin: '',
    quantityMax: '',
    gradeMin: '',
    gradeMax: '',
    priceMin: '',
    priceMax: '',
    costMin: '',
    costMax: '',
    condition: '',
    description: '',
    isRookie: ''
  })

  const changeViewSize = (size: ViewSize) => {
    setViewSize(size)
    localStorage.setItem('items-view-size', size)
  }

  const getTextSizeClasses = () => {
    switch (viewSize) {
      case 'small':
        return { heading: 'text-sm', subtext: 'text-xs' }
      case 'large':
        return { heading: 'text-xl', subtext: 'text-base' }
      default:
        return { heading: 'text-lg', subtext: 'text-sm' }
    }
  }

  const textSizes = getTextSizeClasses()

  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    fetchItems()
    fetchContainers()
  }, [user])

  const fetchContainers = async () => {
    try {
      if (!user) return

      const { data, error } = await supabase
        .from('containers')
        .select(`
          *,
          zones (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      
      const containersWithZones = data?.map(container => ({
        ...container,
        zone: container.zones || null
      })) || []
      
      setContainers(containersWithZones)
    } catch (error) {
      console.error('Error fetching containers:', error)
    }
  }

  const fetchItems = async () => {
    try {
      if (!user) return

      // Fetch cards and comics separately for current user only
      const [cardsResult, comicsResult] = await Promise.all([
        supabase
          .from('cards')
          .select(`
            *,
            containers (
              id,
              name,
              zones (
                id,
                name
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('comics')
          .select(`
            *,
            containers (
              id,
              name,
              zones (
                id,
                name
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ])

      if (cardsResult.error) throw cardsResult.error
      if (comicsResult.error) throw comicsResult.error

      // Combine and format the data, gracefully handling null containers/zones
      const cards = cardsResult.data?.map(card => ({
        ...card,
        item_type: 'card' as const,
        container: card.containers ? {
          ...card.containers,
          zone: card.containers.zones || null
        } : null
      })) || []

      const comics = comicsResult.data?.map(comic => ({
        ...comic,
        item_type: 'comic' as const,
        container: comic.containers ? {
          ...comic.containers,
          zone: comic.containers.zones || null
        } : null
      })) || []

      // Combine and sort by creation date
      const allItems = [...cards, ...comics].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setItems(allItems)
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      // If it's a new unsaved item, just remove it from the list
      const item = items.find(i => i.id === id)
      if (item?.isNew) {
        setItems(items.filter(i => i.id !== id))
        setEditingItems(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        return
      }

      // Try to delete from cards table first
      const { error: cardError } = await supabase.from('cards').delete().eq('id', id)
      
      if (cardError) {
        // If card deletion failed, try comics table
        const { error: comicError } = await supabase.from('comics').delete().eq('id', id)
        if (comicError) throw comicError
      }
      
      fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const cloneItem = (item: ItemWithDetails) => {
    // Generate a temporary ID for the new item
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Create a copy of the item with a new ID
    const clonedItem: ItemWithDetails = {
      ...item,
      id: tempId,
      isNew: true,
      isEditing: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add to items list and editing map
    setItems(prev => [clonedItem, ...prev])
    setEditingItems(prev => {
      const next = new Map(prev)
      next.set(tempId, clonedItem)
      return next
    })
  }

  const updateEditingItem = (id: string, field: string, value: any) => {
    setEditingItems(prev => {
      const next = new Map(prev)
      const item = next.get(id)
      if (item) {
        const updatedItem = { ...item, [field]: value }
        // If updating container_id, also update the container reference
        if (field === 'container_id') {
          const newContainer = containers.find(c => c.id === value)
          updatedItem.container = newContainer || null
        }
        next.set(id, updatedItem)
      }
      return next
    })

    // Also update in items list
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        // If updating container_id, also update the container reference
        if (field === 'container_id') {
          const newContainer = containers.find(c => c.id === value)
          updated.container = newContainer || null
        }
        return updated
      }
      return item
    }))
  }

  const saveItem = async (id: string) => {
    const editingItem = editingItems.get(id)
    if (!editingItem) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const baseData = {
        container_id: editingItem.container_id,
        grade: editingItem.grade,
        condition: editingItem.condition,
        quantity: editingItem.quantity,
        price: editingItem.price,
        cost: editingItem.cost,
        description: editingItem.description || null
      }

      if (editingItem.item_type === 'card') {
        const cardData = {
          ...baseData,
          player: editingItem.player!,
          team: editingItem.team || null,
          manufacturer: editingItem.manufacturer!,
          sport: editingItem.sport!,
          year: editingItem.year!,
          number: editingItem.number || '',
          number_out_of: editingItem.number_out_of || null,
          is_rookie: editingItem.is_rookie || false
        }

        const { data, error } = await supabase
          .from('cards')
          .insert([cardData])
          .select(`
            *,
            containers (
              id,
              name,
              zones (
                id,
                name
              )
            )
          `)
          .single()

        if (error) throw error

        // Replace the temporary item with the saved one
        const savedItem: ItemWithDetails = {
          ...data,
          item_type: 'card' as const,
          container: data.containers ? {
            ...data.containers,
            zone: data.containers.zones || null
          } : null
        }

        setItems(prev => prev.map(item => item.id === id ? savedItem : item))
        setEditingItems(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
      } else {
        // Validate required comic fields
        if (!editingItem.title || !editingItem.publisher || !editingItem.issue || !editingItem.year) {
          alert('Please fill in all required comic fields: Title, Publisher, Issue, and Year')
          return
        }

        const comicData = {
          ...baseData,
          title: editingItem.title,
          publisher: editingItem.publisher,
          issue: editingItem.issue,
          year: editingItem.year
        }

        const { data, error } = await supabase
          .from('comics')
          .insert([comicData])
          .select(`
            *,
            containers (
              id,
              name,
              zones (
                id,
                name
              )
            )
          `)
          .single()

        if (error) throw error

        // Replace the temporary item with the saved one
        const savedItem: ItemWithDetails = {
          ...data,
          item_type: 'comic' as const,
          container: data.containers ? {
            ...data.containers,
            zone: data.containers.zones || null
          } : null
        }

        setItems(prev => prev.map(item => item.id === id ? savedItem : item))
        setEditingItems(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
      }
    } catch (error) {
      console.error('Error saving item:', error)
      alert(`Failed to save item: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const cancelEdit = (id: string) => {
    const item = items.find(i => i.id === id)
    if (item?.isNew) {
      // Remove unsaved items
      setItems(prev => prev.filter(i => i.id !== id))
    }
    setEditingItems(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    // Refresh items to get original state
    fetchItems()
  }

  const filteredItems = items.filter(item => {
    // Apply tab filter first
    if (filter === 'all') {
      // Continue to column filters
    } else if (filter === 'card') {
      if (item.item_type !== 'card') return false
    } else if (filter === 'comic') {
      if (item.item_type !== 'comic') return false
    } else if (filter === 'graded-card') {
      // Only show cards where grade is a valid number (not null, not undefined, not empty string)
      if (item.item_type !== 'card' || item.grade == null || (typeof item.grade === 'string' && item.grade === '')) return false
    } else if (filter === 'graded-comic') {
      // Only show comics where grade is a valid number (not null, not undefined, not empty string)
      if (item.item_type !== 'comic' || item.grade == null || (typeof item.grade === 'string' && item.grade === '')) return false
    } else {
      return false
    }

    // Apply column filters
    if (filters.type && item.item_type !== filters.type) return false
    
    if (filters.name) {
      const name = item.item_type === 'card' ? item.player : item.title
      if (!name?.toLowerCase().includes(filters.name.toLowerCase())) return false
    }
    
    if (filters.manufacturer && item.item_type === 'card') {
      if (!item.manufacturer?.toLowerCase().includes(filters.manufacturer.toLowerCase())) return false
    }
    
    if (filters.sport && item.item_type === 'card') {
      if (!item.sport?.toLowerCase().includes(filters.sport.toLowerCase())) return false
    }
    
    if (filters.publisher && item.item_type === 'comic') {
      if (!item.publisher?.toLowerCase().includes(filters.publisher.toLowerCase())) return false
    }
    
    if (filters.team && item.item_type === 'card') {
      if (!item.team?.toLowerCase().includes(filters.team.toLowerCase())) return false
    }
    
    if (filters.cardNumber && item.item_type === 'card') {
      if (!item.number?.toLowerCase().includes(filters.cardNumber.toLowerCase())) return false
    }
    
    if (filters.container) {
      if (item.container?.id !== filters.container) return false
    }
    
    if (filters.zone) {
      if (item.container?.zone?.id !== filters.zone) return false
    }
    
    if (filters.yearMin && item.year != null) {
      if (item.year < parseInt(filters.yearMin)) return false
    }
    
    if (filters.yearMax && item.year != null) {
      if (item.year > parseInt(filters.yearMax)) return false
    }
    
    if (filters.quantityMin) {
      if (item.quantity < parseInt(filters.quantityMin)) return false
    }
    
    if (filters.quantityMax) {
      if (item.quantity > parseInt(filters.quantityMax)) return false
    }
    
    if (filters.gradeMin && item.grade != null) {
      if (item.grade < parseFloat(filters.gradeMin)) return false
    }
    
    if (filters.gradeMax && item.grade != null) {
      if (item.grade > parseFloat(filters.gradeMax)) return false
    }
    
    if (filters.priceMin && item.price != null) {
      if (item.price < parseFloat(filters.priceMin)) return false
    }
    
    if (filters.priceMax && item.price != null) {
      if (item.price > parseFloat(filters.priceMax)) return false
    }
    
    if (filters.costMin && item.cost != null) {
      if (item.cost < parseFloat(filters.costMin)) return false
    }
    
    if (filters.costMax && item.cost != null) {
      if (item.cost > parseFloat(filters.costMax)) return false
    }
    
    if (filters.condition) {
      if (!item.condition?.toLowerCase().includes(filters.condition.toLowerCase())) return false
    }
    
    if (filters.description) {
      if (!item.description?.toLowerCase().includes(filters.description.toLowerCase())) return false
    }
    
    if (filters.isRookie && item.item_type === 'card') {
      const isRookie = item.is_rookie || false
      if (filters.isRookie === 'yes' && !isRookie) return false
      if (filters.isRookie === 'no' && isRookie) return false
    }
    
    return true
  })

  // Sorting function
  const sortItems = (items: ItemWithDetails[], column: string, direction: 'asc' | 'desc'): ItemWithDetails[] => {
    return [...items].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (column) {
        case 'type':
          aValue = a.item_type
          bValue = b.item_type
          break
        case 'name':
          aValue = a.item_type === 'card' ? a.player : a.title
          bValue = b.item_type === 'card' ? b.player : b.title
          break
        case 'details':
          if (a.item_type === 'card') {
            aValue = `${a.manufacturer || ''} ${a.sport || ''} ${a.year || ''}`
          } else {
            aValue = `${a.publisher || ''} #${a.issue || ''} (${a.year || ''})`
          }
          if (b.item_type === 'card') {
            bValue = `${b.manufacturer || ''} ${b.sport || ''} ${b.year || ''}`
          } else {
            bValue = `${b.publisher || ''} #${b.issue || ''} (${b.year || ''})`
          }
          break
        case 'cardNumber':
          aValue = a.number || ''
          bValue = b.number || ''
          break
        case 'team':
          aValue = a.team || ''
          bValue = b.team || ''
          break
        case 'container':
          aValue = a.container?.name || ''
          bValue = b.container?.name || ''
          break
        case 'zone':
          aValue = a.container?.zone?.name || ''
          bValue = b.container?.zone?.name || ''
          break
        case 'quantity':
          aValue = a.quantity || 0
          bValue = b.quantity || 0
          break
        case 'grade':
          aValue = a.grade ?? -Infinity
          bValue = b.grade ?? -Infinity
          break
        case 'condition':
          aValue = a.condition || ''
          bValue = b.condition || ''
          break
        case 'isRookie':
          aValue = a.item_type === 'card' ? (a.is_rookie ? 1 : 0) : -1
          bValue = b.item_type === 'card' ? (b.is_rookie ? 1 : 0) : -1
          break
        case 'description':
          aValue = a.description || ''
          bValue = b.description || ''
          break
        case 'price':
          aValue = a.price ?? -Infinity
          bValue = b.price ?? -Infinity
          break
        case 'cost':
          aValue = a.cost ?? -Infinity
          bValue = b.cost ?? -Infinity
          break
        case 'profitLoss':
          // Calculate P/L as (price - cost) * quantity to account for per-item values
          aValue = ((a.price ?? 0) - (a.cost ?? 0)) * (a.quantity ?? 1)
          bValue = ((b.price ?? 0) - (b.cost ?? 0)) * (b.quantity ?? 1)
          break
        default:
          return 0
      }

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return direction === 'asc' ? 1 : -1
      if (bValue == null) return direction === 'asc' ? -1 : 1

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return direction === 'asc' ? comparison : -comparison
      } else {
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        return direction === 'asc' ? comparison : -comparison
      }
    })
  }

  // Apply sorting
  const sortedItems = sortColumn ? sortItems(filteredItems, sortColumn, sortDirection) : filteredItems

  // Pagination calculations
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = sortedItems.slice(startIndex, endIndex)

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column and default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  // Reset to page 1 when filter, itemsPerPage, sort, or column filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, itemsPerPage, sortColumn, sortDirection, filters])

  const clearFilters = () => {
    setFilters({
      type: '',
      name: '',
      manufacturer: '',
      sport: '',
      publisher: '',
      team: '',
      cardNumber: '',
      container: '',
      zone: '',
      yearMin: '',
      yearMax: '',
      quantityMin: '',
      quantityMax: '',
      gradeMin: '',
      gradeMax: '',
      priceMin: '',
      priceMax: '',
      costMin: '',
      costMax: '',
      condition: '',
      description: '',
      isRookie: ''
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')
  
  const exportToExcel = () => {
    try {
      // Use sortedItems which already respects current filters and sorting
      // sortedItems is computed from filteredItems and sortColumn/sortDirection
      const itemsToExport = sortedItems
      
      // Separate cards and comics
      const cards = itemsToExport.filter(item => item.item_type === 'card')
      const comics = itemsToExport.filter(item => item.item_type === 'comic')
      
      // Prepare card data (removed user_id, zone_id, container_id, created_at, updated_at - will be looked up by name on import)
      const cardData = cards.map(card => ({
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
      }))
      
      // Prepare comic data (removed user_id, zone_id, container_id, created_at, updated_at - will be looked up by name on import)
      const comicData = comics.map(comic => ({
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
      }))
      
      // Create workbook
      const workbook = XLSX.utils.book_new()
      
      // Add Cards sheet
      if (cardData.length > 0) {
        const cardSheet = XLSX.utils.json_to_sheet(cardData)
        XLSX.utils.book_append_sheet(workbook, cardSheet, 'Cards')
      }
      
      // Add Comics sheet
      if (comicData.length > 0) {
        const comicSheet = XLSX.utils.json_to_sheet(comicData)
        XLSX.utils.book_append_sheet(workbook, comicSheet, 'Comics')
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `hotzone-items-${timestamp}.xlsx`
      
      // Write and download
      XLSX.writeFile(workbook, filename)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export items. Please try again.')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!user) {
      alert('You must be logged in to upload items')
      return
    }

    setIsUploading(true)
    setShowUploadModal(true)
    setUploadResults(null)

    try {
      // Ensure containers are loaded
      if (containers.length === 0) {
        await fetchContainers()
      }

      // Read the Excel file
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })

      // Get Cards and Comics sheets
      const cardsSheet = workbook.Sheets['Cards']
      const comicsSheet = workbook.Sheets['Comics']

      if (!cardsSheet && !comicsSheet) {
        setUploadResults({
          success: false,
          partial: false,
          cardsCreated: 0,
          cardsUpdated: 0,
          comicsCreated: 0,
          comicsUpdated: 0,
          errors: [{ row: 0, type: 'card', message: 'Excel file must contain "Cards" and/or "Comics" sheets' }]
        })
        setIsUploading(false)
        return
      }

      const errors: Array<{ row: number; type: 'card' | 'comic'; message: string }> = []
      let cardsCreated = 0
      let cardsUpdated = 0
      let comicsCreated = 0
      let comicsUpdated = 0

      // Process Cards sheet
      if (cardsSheet) {
        const cardsData = XLSX.utils.sheet_to_json(cardsSheet) as any[]
        
        for (let i = 0; i < cardsData.length; i++) {
          const row = cardsData[i]
          const rowNumber = i + 2 // Excel rows start at 2 (1 is header)
          
          try {
            // Look up container_id by container_name
            const containerName = row.container_name?.toString().trim()
            if (!containerName) {
              errors.push({ row: rowNumber, type: 'card', message: 'Missing container_name' })
              continue
            }

            const container = containers.find(c => c.name.toLowerCase() === containerName.toLowerCase())
            if (!container) {
              errors.push({ row: rowNumber, type: 'card', message: `Container "${containerName}" not found` })
              continue
            }

            const container_id = container.id

            // Validate required fields
            if (!row.player || !row.manufacturer || !row.sport || !row.year || !row.number) {
              errors.push({ row: rowNumber, type: 'card', message: 'Missing required fields: player, manufacturer, sport, year, or number' })
              continue
            }

            const baseData = {
              container_id,
              grade: row.grade ? parseFloat(row.grade) : null,
              condition: row.condition?.toString().trim() || null,
              quantity: parseInt(row.quantity) || 1,
              price: row.price ? parseFloat(row.price) : null,
              cost: row.cost ? parseFloat(row.cost) : null,
              description: row.description?.toString().trim() || null
            }

            const cardData = {
              ...baseData,
              player: row.player.toString().trim(),
              team: row.team?.toString().trim() || null,
              manufacturer: row.manufacturer.toString().trim(),
              sport: row.sport.toString().trim(),
              year: parseInt(row.year),
              number: row.number.toString().trim(),
              number_out_of: row.number_out_of ? parseInt(row.number_out_of) : null,
              is_rookie: row.is_rookie?.toString().toLowerCase() === 'yes' || row.is_rookie === true
            }

            // Check if this is an update (has id) or create (no id)
            const hasId = row.id !== undefined && row.id !== null && row.id !== '' && String(row.id).trim() !== ''
            
            if (hasId) {
              // Update existing card
              // Ensure id is a string (Excel might read it as a number)
              const itemId = String(row.id).trim()
              
              const { data: updateData, error } = await supabase
                .from('cards')
                .update(cardData)
                .eq('id', itemId)
                .eq('user_id', user!.id)
                .select()

              if (error) {
                errors.push({ row: rowNumber, type: 'card', message: `Update failed: ${error.message}` })
              } else if (!updateData || updateData.length === 0) {
                errors.push({ row: rowNumber, type: 'card', message: `No card found with id: ${itemId} (or it belongs to another user)` })
              } else {
                cardsUpdated++
              }
            } else {
              // Create new card
              const { error } = await supabase
                .from('cards')
                .insert([cardData])

              if (error) {
                if (error.message.includes('duplicate') || error.code === '23505') {
                  errors.push({ row: rowNumber, type: 'card', message: 'Duplicate card (same player, manufacturer, sport, year, number already exists)' })
                } else {
                  errors.push({ row: rowNumber, type: 'card', message: `Create failed: ${error.message}` })
                }
              } else {
                cardsCreated++
              }
            }
          } catch (error: any) {
            errors.push({ row: rowNumber, type: 'card', message: `Error: ${error.message || 'Unknown error'}` })
          }
        }
      }

      // Process Comics sheet
      if (comicsSheet) {
        const comicsData = XLSX.utils.sheet_to_json(comicsSheet) as any[]
        
        for (let i = 0; i < comicsData.length; i++) {
          const row = comicsData[i]
          const rowNumber = i + 2 // Excel rows start at 2 (1 is header)
          
          try {
            // Look up container_id by container_name
            const containerName = row.container_name?.toString().trim()
            if (!containerName) {
              errors.push({ row: rowNumber, type: 'comic', message: 'Missing container_name' })
              continue
            }

            const container = containers.find(c => c.name.toLowerCase() === containerName.toLowerCase())
            if (!container) {
              errors.push({ row: rowNumber, type: 'comic', message: `Container "${containerName}" not found` })
              continue
            }

            const container_id = container.id

            // Validate required fields
            if (!row.title || !row.publisher || !row.issue || !row.year) {
              errors.push({ row: rowNumber, type: 'comic', message: 'Missing required fields: title, publisher, issue, or year' })
              continue
            }

            const baseData = {
              container_id,
              grade: row.grade ? parseFloat(row.grade) : null,
              condition: row.condition?.toString().trim() || null,
              quantity: parseInt(row.quantity) || 1,
              price: row.price ? parseFloat(row.price) : null,
              cost: row.cost ? parseFloat(row.cost) : null,
              description: row.description?.toString().trim() || null
            }

            const comicData = {
              ...baseData,
              title: row.title.toString().trim(),
              publisher: row.publisher.toString().trim(),
              issue: parseInt(row.issue),
              year: parseInt(row.year)
            }

            // Check if this is an update (has id) or create (no id)
            const hasId = row.id !== undefined && row.id !== null && row.id !== '' && String(row.id).trim() !== ''
            
            if (hasId) {
              // Update existing comic
              // Ensure id is a string (Excel might read it as a number)
              const itemId = String(row.id).trim()
              
              const { data: updateData, error } = await supabase
                .from('comics')
                .update(comicData)
                .eq('id', itemId)
                .eq('user_id', user!.id)
                .select()

              if (error) {
                errors.push({ row: rowNumber, type: 'comic', message: `Update failed: ${error.message}` })
              } else if (!updateData || updateData.length === 0) {
                errors.push({ row: rowNumber, type: 'comic', message: `No comic found with id: ${itemId} (or it belongs to another user)` })
              } else {
                comicsUpdated++
              }
            } else {
              // Create new comic
              const { error } = await supabase
                .from('comics')
                .insert([comicData])

              if (error) {
                if (error.message.includes('duplicate') || error.code === '23505') {
                  errors.push({ row: rowNumber, type: 'comic', message: 'Duplicate comic (same title, publisher, issue, year already exists)' })
                } else {
                  errors.push({ row: rowNumber, type: 'comic', message: `Create failed: ${error.message}` })
                }
              } else {
                comicsCreated++
              }
            }
          } catch (error: any) {
            errors.push({ row: rowNumber, type: 'comic', message: `Error: ${error.message || 'Unknown error'}` })
          }
        }
      }

      // Determine result status
      const totalProcessed = cardsCreated + cardsUpdated + comicsCreated + comicsUpdated
      const hasErrors = errors.length > 0
      const success = totalProcessed > 0 && !hasErrors
      const partial = totalProcessed > 0 && hasErrors

      setUploadResults({
        success,
        partial,
        cardsCreated,
        cardsUpdated,
        comicsCreated,
        comicsUpdated,
        errors
      })

      // Refresh items list if any were created/updated
      if (totalProcessed > 0) {
        fetchItems()
      }
    } catch (error: any) {
      setUploadResults({
        success: false,
        partial: false,
        cardsCreated: 0,
        cardsUpdated: 0,
        comicsCreated: 0,
        comicsUpdated: 0,
        errors: [{ row: 0, type: 'card', message: `Failed to process file: ${error.message || 'Unknown error'}` }]
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  // Get unique zones for filter dropdown
  const uniqueZones = Array.from(new Set(
    containers
      .map(c => c.zone)
      .filter((zone): zone is Zone => zone != null)
      .map(z => z.id)
  )).map(zoneId => {
    const zone = containers.find(c => c.zone?.id === zoneId)?.zone
    return zone ? { id: zone.id, name: zone.name } : null
  }).filter((zone): zone is { id: string; name: string } => zone != null)

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    localStorage.setItem('items-per-page', value.toString())
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Items</h1>
          <p className="mt-2 text-gray-600">Manage your inventory items</p>
        </div>
        <div className="flex space-x-3">
          {/* Size Toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => changeViewSize('small')}
              className={`inline-flex items-center px-3 py-2 text-xs font-medium rounded-l-md border ${
                viewSize === 'small'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              S
            </button>
            <button
              type="button"
              onClick={() => changeViewSize('medium')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium border-t border-b ${
                viewSize === 'medium'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              M
            </button>
            <button
              type="button"
              onClick={() => changeViewSize('large')}
              className={`inline-flex items-center px-3 py-2 text-base font-medium rounded-r-md border-t border-r border-b ${
                viewSize === 'large'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              L
            </button>
          </div>
          <button
            onClick={exportToExcel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Link
            to="/items/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Link>
        </div>
      </div>

      {/* Filter Tabs and Items Per Page Selector */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                Active
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50"
            >
              <XIcon className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          )}
        </div>
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Items', count: items.length },
            { key: 'card', label: 'Cards', count: items.filter(i => i.item_type === 'card').length },
            { key: 'graded-card', label: 'Graded Cards', count: items.filter(i => i.item_type === 'card' && i.grade != null && !(typeof i.grade === 'string' && i.grade === '')).length },
            { key: 'comic', label: 'Comics', count: items.filter(i => i.item_type === 'comic').length },
            { key: 'graded-comic', label: 'Graded Comics', count: items.filter(i => i.item_type === 'comic' && i.grade != null && !(typeof i.grade === 'string' && i.grade === '')).length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
        <div className="flex items-center space-x-2">
          <label htmlFor="items-per-page" className="text-sm text-gray-700">
            Items per page:
          </label>
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value, 10))}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as '' | 'card' | 'comic' })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="card">Card</option>
                <option value="comic">Comic</option>
              </select>
            </div>

            {/* Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                placeholder="Player/Title"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Manufacturer Filter (Cards) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <input
                type="text"
                value={filters.manufacturer}
                onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value })}
                placeholder="Topps, Panini..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sport Filter (Cards) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
              <input
                type="text"
                value={filters.sport}
                onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
                placeholder="Basketball, Football..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Publisher Filter (Comics) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
              <input
                type="text"
                value={filters.publisher}
                onChange={(e) => setFilters({ ...filters, publisher: e.target.value })}
                placeholder="Marvel, DC..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Team Filter (Cards) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <input
                type="text"
                value={filters.team}
                onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                placeholder="Team name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Card Number Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card #</label>
              <input
                type="text"
                value={filters.cardNumber}
                onChange={(e) => setFilters({ ...filters, cardNumber: e.target.value })}
                placeholder="Card number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Container Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Container</label>
              <select
                value={filters.container}
                onChange={(e) => setFilters({ ...filters, container: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Containers</option>
                {containers.map(container => (
                  <option key={container.id} value={container.id}>
                    {container.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Zone Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
              <select
                value={filters.zone}
                onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Zones</option>
                {uniqueZones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.yearMin}
                  onChange={(e) => setFilters({ ...filters, yearMin: e.target.value })}
                  placeholder="Min"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={filters.yearMax}
                  onChange={(e) => setFilters({ ...filters, yearMax: e.target.value })}
                  placeholder="Max"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quantity Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.quantityMin}
                  onChange={(e) => setFilters({ ...filters, quantityMin: e.target.value })}
                  placeholder="Min"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={filters.quantityMax}
                  onChange={(e) => setFilters({ ...filters, quantityMax: e.target.value })}
                  placeholder="Max"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Grade Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.1"
                  value={filters.gradeMin}
                  onChange={(e) => setFilters({ ...filters, gradeMin: e.target.value })}
                  placeholder="Min"
                  min="0"
                  max="10"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  step="0.1"
                  value={filters.gradeMax}
                  onChange={(e) => setFilters({ ...filters, gradeMax: e.target.value })}
                  placeholder="Max"
                  min="0"
                  max="10"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Cost Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={filters.costMin}
                  onChange={(e) => setFilters({ ...filters, costMin: e.target.value })}
                  placeholder="Min $"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  step="0.01"
                  value={filters.costMax}
                  onChange={(e) => setFilters({ ...filters, costMax: e.target.value })}
                  placeholder="Max $"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={filters.priceMin}
                  onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                  placeholder="Min $"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  step="0.01"
                  value={filters.priceMax}
                  onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                  placeholder="Max $"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Condition Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <input
                type="text"
                value={filters.condition}
                onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
                placeholder="Mint, Near Mint..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={filters.description}
                onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                placeholder="Search description..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Is Rookie Filter (Cards only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rookie Card</label>
              <select
                value={filters.isRookie}
                onChange={(e) => setFilters({ ...filters, isRookie: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {filteredItems.length > 0 ? (
        <>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('type')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Type</span>
                        {sortColumn === 'type' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('name')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Name</span>
                        {sortColumn === 'name' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('details')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Details</span>
                        {sortColumn === 'details' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('cardNumber')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Card #</span>
                        {sortColumn === 'cardNumber' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('team')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Team</span>
                        {sortColumn === 'team' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('container')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Container</span>
                        {sortColumn === 'container' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('zone')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Zone</span>
                        {sortColumn === 'zone' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('quantity')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Qty</span>
                        {sortColumn === 'quantity' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('grade')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Grade</span>
                        {sortColumn === 'grade' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('condition')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Condition</span>
                        {sortColumn === 'condition' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('isRookie')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Rookie</span>
                        {sortColumn === 'isRookie' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('description')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Description</span>
                        {sortColumn === 'description' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('cost')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Cost Per</span>
                        {sortColumn === 'cost' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('price')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Price Per</span>
                        {sortColumn === 'price' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      onClick={() => handleSort('profitLoss')}
                      className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>P/L</span>
                        {sortColumn === 'profitLoss' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-center font-medium text-gray-500 uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedItems.map((item) => {
                    const isEditing = item.isEditing || editingItems.has(item.id)
                    const editingItem = editingItems.get(item.id) || item
                    const inputSize = viewSize === 'small' ? 'text-xs px-1 py-0.5' : viewSize === 'large' ? 'text-base px-2 py-1' : 'text-sm px-1.5 py-1'
                    
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isEditing ? 'bg-yellow-50' : ''}`}>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${viewSize === 'small' ? 'text-xs' : viewSize === 'large' ? 'text-base' : 'text-sm'} font-medium ${
                          item.item_type === 'card' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.item_type}
                        </span>
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.item_type === 'card' ? (editingItem.player || '') : (editingItem.title || '')}
                              onChange={(e) => updateEditingItem(item.id, item.item_type === 'card' ? 'player' : 'title', e.target.value)}
                              className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full`}
                            />
                          ) : (
                        <Link 
                          to={item.item_type === 'card' ? `/cards/${item.id}` : `/comics/${item.id}`}
                          className={`${textSizes.heading} font-medium text-purple-600 hover:text-purple-900`}
                        >
                          {item.item_type === 'card' ? item.player : item.title}
                        </Link>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'}`}>
                          {isEditing ? (
                            <div className="space-y-1">
                              {item.item_type === 'card' ? (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Manufacturer"
                                    value={editingItem.manufacturer || ''}
                                    onChange={(e) => updateEditingItem(item.id, 'manufacturer', e.target.value)}
                                    className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full mb-1`}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Sport"
                                    value={editingItem.sport || ''}
                                    onChange={(e) => updateEditingItem(item.id, 'sport', e.target.value)}
                                    className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full mb-1`}
                                  />
                                  <input
                                    type="number"
                                    placeholder="Year"
                                    value={editingItem.year || ''}
                                    onChange={(e) => updateEditingItem(item.id, 'year', e.target.value ? parseInt(e.target.value) : null)}
                                    className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full`}
                                  />
                                </>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Publisher"
                                    value={editingItem.publisher || ''}
                                    onChange={(e) => updateEditingItem(item.id, 'publisher', e.target.value)}
                                    className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full mb-1`}
                                  />
                                  <input
                                    type="number"
                                    placeholder="Issue"
                                    value={editingItem.issue || ''}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      const numValue = value === '' ? null : (isNaN(parseInt(value)) ? editingItem.issue : parseInt(value))
                                      updateEditingItem(item.id, 'issue', numValue)
                                    }}
                                    className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full mb-1`}
                                  />
                                  <input
                                    type="number"
                                    placeholder="Year"
                                    value={editingItem.year || ''}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      const numValue = value === '' ? null : (isNaN(parseInt(value)) ? editingItem.year : parseInt(value))
                                      updateEditingItem(item.id, 'year', numValue)
                                    }}
                                    className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full`}
                                  />
                                </>
                              )}
                            </div>
                          ) : (
                        <div className={`${textSizes.subtext} text-gray-900`}>
                          {item.item_type === 'card' 
                            ? `${item.manufacturer} ${item.sport} ${item.year}`
                            : `${item.publisher} #${item.issue} (${item.year})`
                          }
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                          {isEditing && item.item_type === 'card' ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Card #"
                                value={editingItem.number || ''}
                                onChange={(e) => updateEditingItem(item.id, 'number', e.target.value)}
                                className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full mb-1`}
                              />
                              <input
                                type="number"
                                placeholder="Out of"
                                value={editingItem.number_out_of || ''}
                                onChange={(e) => updateEditingItem(item.id, 'number_out_of', e.target.value ? parseInt(e.target.value) : null)}
                                className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full`}
                              />
                            </div>
                          ) : (
                        <div className={`${textSizes.subtext} text-gray-900`}>
                          {item.item_type === 'card' && item.number 
                            ? item.number_out_of 
                              ? `${item.number} / ${item.number_out_of}` 
                              : item.number
                            : '-'
                          }
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                          {isEditing && item.item_type === 'card' ? (
                            <input
                              type="text"
                              placeholder="Team"
                              value={editingItem.team || ''}
                              onChange={(e) => updateEditingItem(item.id, 'team', e.target.value)}
                              className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full`}
                            />
                          ) : (
                        <div className={`${textSizes.subtext} text-gray-900`}>
                          {item.item_type === 'card' && item.team ? item.team : '-'}
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                          {isEditing ? (
                            <select
                              value={editingItem.container_id}
                              onChange={(e) => updateEditingItem(item.id, 'container_id', e.target.value)}
                              className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full`}
                            >
                              <option value="">Select container</option>
                              {containers.map(container => (
                                <option key={container.id} value={container.id}>
                                  {container.name} {container.zone ? `(${container.zone.name})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                        <div className={`${textSizes.subtext} text-gray-500`}>
                          {item.container?.name || 'No Container'}
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                        <div className={`${textSizes.subtext} text-gray-500`}>
                          {item.container?.zone?.name || 'Unknown Zone'}
                        </div>
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              value={editingItem.quantity}
                              onChange={(e) => updateEditingItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-16`}
                            />
                          ) : (
                        <div className={`${textSizes.subtext} text-gray-900`}>
                          {item.quantity}
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              value={editingItem.grade || ''}
                              onChange={(e) => updateEditingItem(item.id, 'grade', e.target.value ? parseFloat(e.target.value) : null)}
                              className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-16`}
                            />
                          ) : (
                        <div className={`${textSizes.subtext} text-gray-900`}>
                          {item.grade || '-'}
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'}`}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingItem.condition || ''}
                              onChange={(e) => updateEditingItem(item.id, 'condition', e.target.value)}
                              className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full`}
                            />
                          ) : (
                        <div className={`${textSizes.subtext} text-gray-900`}>
                          {item.condition || '-'}
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                          {isEditing && item.item_type === 'card' ? (
                            <input
                              type="checkbox"
                              checked={editingItem.is_rookie || false}
                              onChange={(e) => updateEditingItem(item.id, 'is_rookie', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          ) : (
                        <div className={`${textSizes.subtext} text-gray-900`}>
                          {item.item_type === 'card' ? (item.is_rookie ? 'Yes' : 'No') : '-'}
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'}`}>
                          {isEditing ? (
                            <textarea
                              value={editingItem.description || ''}
                              onChange={(e) => updateEditingItem(item.id, 'description', e.target.value)}
                              rows={2}
                              className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full`}
                            />
                          ) : (
                        <div className={`${textSizes.subtext} text-gray-900`}>
                          {item.description || '-'}
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editingItem.cost || ''}
                              onChange={(e) => updateEditingItem(item.id, 'cost', e.target.value ? parseFloat(e.target.value) : null)}
                              className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-20`}
                            />
                          ) : (
                            <div className={`${textSizes.subtext} font-medium text-orange-600`}>
                              {item.cost ? `$${item.cost.toFixed(2)}` : '-'}
                        </div>
                          )}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editingItem.price || ''}
                              onChange={(e) => updateEditingItem(item.id, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                              className={`${inputSize} border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-20`}
                            />
                          ) : (
                        <div className={`${textSizes.subtext} font-medium text-blue-600`}>
                              {item.price ? `$${item.price.toFixed(2)}` : '-'}
                        </div>
                          )}
                        </td>
                        <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap text-right`}>
                          {(() => {
                            const price = item.price ?? 0
                            const cost = item.cost ?? 0
                            const quantity = item.quantity ?? 1
                            // Calculate P/L as (price - cost) * quantity to account for per-item values
                            const profitLoss = (price - cost) * quantity
                            
                            if (price === 0 && cost === 0) {
                              return <div className={`${textSizes.subtext} font-medium text-gray-500`}>-</div>
                            }
                            
                            const isProfit = profitLoss > 0
                            const colorClass = isProfit ? 'text-green-600' : profitLoss < 0 ? 'text-red-600' : 'text-gray-500'
                            const sign = profitLoss >= 0 ? '+' : ''
                            
                            return (
                              <div className={`${textSizes.subtext} font-medium ${colorClass}`}>
                                {sign}${profitLoss.toFixed(2)}
                              </div>
                            )
                          })()}
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap text-right ${viewSize === 'small' ? 'text-xs' : viewSize === 'large' ? 'text-base' : 'text-sm'} font-medium`}>
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => saveItem(item.id)}
                                className="text-green-600 hover:text-green-900 flex items-center"
                                title="Save"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => cancelEdit(item.id)}
                                className="text-red-600 hover:text-red-900 flex items-center"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => cloneItem(item)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Clone
                              </button>
                        <Link
                          to={`/items/${item.id}/edit?type=${item.item_type}`}
                                className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                            </div>
                          )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, sortedItems.length)}</span> of{' '}
                    <span className="font-medium">{sortedItems.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span
                            key={page}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            ...
                          </span>
                        )
                      }
                      return null
                    })}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Layers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding some items to your inventory.</p>
          <div className="mt-6">
            <Link
              to="/items/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Link>
          </div>
        </div>
      )}

      {/* Upload Results Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => !isUploading && setShowUploadModal(false)}>
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3">
              {isUploading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Processing upload...</p>
                </div>
              ) : uploadResults ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {uploadResults.success && 'Upload Successful'}
                      {uploadResults.partial && 'Partial Success'}
                      {!uploadResults.success && !uploadResults.partial && 'Upload Failed'}
                    </h3>
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {uploadResults.success && (
                    <div className="mb-4">
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <p className="text-green-800 font-medium mb-2">All items processed successfully!</p>
                        <div className="text-sm text-green-700 space-y-1">
                          {uploadResults.cardsCreated > 0 && <p>• {uploadResults.cardsCreated} card(s) created</p>}
                          {uploadResults.cardsUpdated > 0 && <p>• {uploadResults.cardsUpdated} card(s) updated</p>}
                          {uploadResults.comicsCreated > 0 && <p>• {uploadResults.comicsCreated} comic(s) created</p>}
                          {uploadResults.comicsUpdated > 0 && <p>• {uploadResults.comicsUpdated} comic(s) updated</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadResults.partial && (
                    <div className="mb-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                        <p className="text-yellow-800 font-medium mb-2">Some items processed successfully:</p>
                        <div className="text-sm text-yellow-700 space-y-1">
                          {uploadResults.cardsCreated > 0 && <p>• {uploadResults.cardsCreated} card(s) created</p>}
                          {uploadResults.cardsUpdated > 0 && <p>• {uploadResults.cardsUpdated} card(s) updated</p>}
                          {uploadResults.comicsCreated > 0 && <p>• {uploadResults.comicsCreated} comic(s) created</p>}
                          {uploadResults.comicsUpdated > 0 && <p>• {uploadResults.comicsUpdated} comic(s) updated</p>}
                        </div>
                      </div>
                      {uploadResults.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                          <p className="text-red-800 font-medium mb-2">Errors ({uploadResults.errors.length}):</p>
                          <div className="max-h-64 overflow-y-auto">
                            <ul className="text-sm text-red-700 space-y-1">
                              {uploadResults.errors.map((error, idx) => (
                                <li key={idx}>
                                  Row {error.row} ({error.type}): {error.message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!uploadResults.success && !uploadResults.partial && (
                    <div className="mb-4">
                      <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <p className="text-red-800 font-medium mb-2">Upload failed:</p>
                        {uploadResults.errors.length > 0 ? (
                          <div className="max-h-64 overflow-y-auto">
                            <ul className="text-sm text-red-700 space-y-1">
                              {uploadResults.errors.map((error, idx) => (
                                <li key={idx}>
                                  {error.row > 0 ? `Row ${error.row} (${error.type}): ` : ''}{error.message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-sm text-red-700">Unknown error occurred</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
