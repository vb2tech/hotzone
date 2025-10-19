import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Container, Zone } from '../lib/supabase'
import { Layers, Plus, Edit, Trash2, Package, MapPin } from 'lucide-react'

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
  container: Container & {
    zone: Zone
  }
  // Card fields
  player?: string
  manufacturer?: string
  sport?: string
  year?: number
  number?: string
  is_rookie?: boolean
  // Comic fields
  title?: string
  publisher?: string
  issue?: number
}

export const ItemsPage: React.FC = () => {
  const [items, setItems] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'card' | 'comic'>('all')

  useEffect(() => {
    fetchItems()
  }, [])

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

      // Combine and format the data
      const cards = cardsResult.data?.map(card => ({
        ...card,
        item_type: 'card' as const,
        container: {
          ...card.containers,
          zone: card.containers.zones
        }
      })) || []

      const comics = comicsResult.data?.map(comic => ({
        ...comic,
        item_type: 'comic' as const,
        container: {
          ...comic.containers,
          zone: comic.containers.zones
        }
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
        <Link
          to="/items/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Layers className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {item.item_type === 'card' ? item.player : item.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.item_type === 'card' 
                        ? `${item.manufacturer} ${item.sport} ${item.year}`
                        : `${item.publisher} #${item.issue} (${item.year})`
                      }
                    </p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Package className="h-4 w-4 mr-1" />
                      {item.container.name}
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {item.container.zone?.name || 'Unknown Zone'}
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.item_type === 'card' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.item_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        Qty: {item.quantity}
                      </span>
                      {item.grade && (
                        <span className="text-xs text-gray-500">
                          Grade: {item.grade}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex space-x-3">
                  <Link
                    to={`/items/${item.id}/edit`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
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
