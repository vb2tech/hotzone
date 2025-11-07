import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Container, Zone } from '../lib/supabase'
import { Layers, Plus, Save, X } from 'lucide-react'

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
  const [filter, setFilter] = useState<'all' | 'card' | 'comic'>('all')
  const [containers, setContainers] = useState<ContainerWithZone[]>([])
  const [editingItems, setEditingItems] = useState<Map<string, ItemWithDetails>>(new Map())
  const [viewSize, setViewSize] = useState<ViewSize>(() => {
    const saved = localStorage.getItem('items-view-size')
    return (saved as ViewSize) || 'medium'
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

  useEffect(() => {
    fetchItems()
    fetchContainers()
  }, [])

  const fetchContainers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
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
        const comicData = {
          ...baseData,
          title: editingItem.title!,
          publisher: editingItem.publisher!,
          issue: editingItem.issue!,
          year: editingItem.year!
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

  const filteredItems = items.filter(item => 
    filter === 'all' || item.item_type === filter
  )

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
          <Link
            to="/items/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Items', count: items.length },
            { key: 'card', label: 'Cards', count: items.filter(i => i.item_type === 'card').length },
            { key: 'comic', label: 'Comics', count: items.filter(i => i.item_type === 'comic').length }
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
      </div>

      {filteredItems.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Type
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Name
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Details
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Card #
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Team
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Container
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Zone
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Qty
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Grade
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Price
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Cost
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-right font-medium text-gray-500 uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => {
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
                                    onChange={(e) => updateEditingItem(item.id, 'issue', e.target.value ? parseInt(e.target.value) : null)}
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
                            <div className={`${textSizes.subtext} font-medium text-green-600`}>
                              {item.price ? `$${item.price.toFixed(2)}` : '-'}
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
                            <div className={`${textSizes.subtext} font-medium text-blue-600`}>
                              {item.cost ? `$${item.cost.toFixed(2)}` : '-'}
                            </div>
                          )}
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
                                to={`/items/${item.id}/edit`}
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
    </div>
  )
}
