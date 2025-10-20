import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Container, Zone } from '../lib/supabase'
import { Package, MapPin, ArrowLeft, Layers } from 'lucide-react'

interface ContainerWithZone extends Container {
  zone: Zone
}

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
  // Card fields
  player?: string
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
}

export const ContainerViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [container, setContainer] = useState<ContainerWithZone | null>(null)
  const [items, setItems] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchContainerAndItems(id)
    }
  }, [id])

  const fetchContainerAndItems = async (containerId: string) => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Fetch container with zone info for current user only
      const { data: containerData, error: containerError } = await supabase
        .from('containers')
        .select(`
          *,
          zones (
            id,
            name
          )
        `)
        .eq('id', containerId)
        .eq('user_id', user.id)
        .single()

      if (containerError) throw containerError
      
      const containerWithZone = {
        ...containerData,
        zone: containerData.zones
      }
      
      setContainer(containerWithZone)

      // Fetch items from both cards and comics tables for current user only
      const [cardsResult, comicsResult] = await Promise.all([
        supabase
          .from('cards')
          .select('*')
          .eq('container_id', containerId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('comics')
          .select('*')
          .eq('container_id', containerId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ])

      if (cardsResult.error) throw cardsResult.error
      if (comicsResult.error) throw comicsResult.error

      // Combine and format the data
      const cards = cardsResult.data?.map(card => ({
        ...card,
        item_type: 'card' as const
      })) || []

      const comics = comicsResult.data?.map(comic => ({
        ...comic,
        item_type: 'comic' as const
      })) || []

      // Combine and sort by creation date
      const allItems = [...cards, ...comics].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setItems(allItems)
    } catch (error) {
      console.error('Error fetching container and items:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!container) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Container not found</h3>
        <p className="mt-1 text-sm text-gray-500">The container you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link
            to="/containers"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Containers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            to="/containers"
            className="mr-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Containers
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{container.name}</h1>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              {container.zone?.name || 'Unknown Zone'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
      </div>

      {/* Items Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
              <Link 
                to={item.item_type === 'card' ? `/cards/${item.id}` : `/comics/${item.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Layers className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {item.item_type === 'card' ? item.player : item.title}
                    </h3>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.item_type === 'card' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.item_type}
                      </span>
                      <span className="ml-2">Qty: {item.quantity}</span>
                    </div>
                    {item.item_type === 'card' && (
                      <div className="mt-1 text-sm text-gray-500">
                        {item.manufacturer} • {item.sport} • {item.year}
                        {item.is_rookie && <span className="ml-1 text-blue-600">(Rookie)</span>}
                      </div>
                    )}
                    {item.item_type === 'comic' && (
                      <div className="mt-1 text-sm text-gray-500">
                        {item.publisher} • Issue #{item.issue} • {item.year}
                      </div>
                    )}
                    {item.grade && (
                      <div className="mt-1 text-sm text-gray-500">
                        Grade: {item.grade}
                      </div>
                    )}
                    {item.condition && (
                      <div className="mt-1 text-sm text-gray-500">
                        Condition: {item.condition}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Layers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items in this container</h3>
          <p className="mt-1 text-sm text-gray-500">This container doesn't have any items yet.</p>
          <div className="mt-6">
            <Link
              to="/items/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Layers className="h-4 w-4 mr-2" />
              Add Item
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
