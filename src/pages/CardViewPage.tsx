import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Card, Container, Zone } from '../lib/supabase'
import { ArrowLeft, Package, MapPin, CreditCard } from 'lucide-react'

interface ContainerWithZone extends Container {
  zone: Zone
}

export const CardViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [card, setCard] = useState<Card | null>(null)
  const [container, setContainer] = useState<ContainerWithZone | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchCardAndContainer(id)
    }
  }, [id])

  const fetchCardAndContainer = async (cardId: string) => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Fetch card info for current user only
      const { data: cardData, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .eq('user_id', user.id)
        .single()

      if (cardError) throw cardError
      setCard(cardData)

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
        .eq('id', cardData.container_id)
        .eq('user_id', user.id)
        .single()

      if (containerError) throw containerError
      
      const containerWithZone = {
        ...containerData,
        zone: containerData.zones
      }

      setContainer(containerWithZone)
    } catch (error) {
      console.error('Error fetching card and container:', error)
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

  if (!card) {
    return (
      <div className="text-center py-12">
        <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Card not found</h3>
        <p className="mt-1 text-sm text-gray-500">The card you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link
            to="/items"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Items
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
            to="/items"
            className="mr-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Items
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{card.player}</h1>
            <p className="mt-2 text-sm text-gray-500">Card details and information</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Quantity</p>
          <p className="text-2xl font-bold text-gray-900">{card.quantity}</p>
        </div>
      </div>

      {/* Card Details */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <CreditCard className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-lg font-medium text-gray-900">Card Information</h2>
          </div>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Player</dt>
              <dd className="mt-1 text-sm text-gray-900">{card.player}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Manufacturer</dt>
              <dd className="mt-1 text-sm text-gray-900">{card.manufacturer}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Sport</dt>
              <dd className="mt-1 text-sm text-gray-900">{card.sport}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Year</dt>
              <dd className="mt-1 text-sm text-gray-900">{card.year}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Card Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{card.number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Rookie Card</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  card.is_rookie 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {card.is_rookie ? 'Yes' : 'No'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Quantity</dt>
              <dd className="mt-1 text-sm text-gray-900">{card.quantity}</dd>
            </div>
            {card.grade && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Grade</dt>
                <dd className="mt-1 text-sm text-gray-900">{card.grade}</dd>
              </div>
            )}
            {card.condition && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Condition</dt>
                <dd className="mt-1 text-sm text-gray-900">{card.condition}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Container Information */}
      {container && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-lg font-medium text-gray-900">Container Information</h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  <Link 
                    to={`/containers/${container.id}`}
                    className="text-green-600 hover:text-green-700"
                  >
                    {container.name}
                  </Link>
                </h3>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  {container.zone?.name || 'Unknown Zone'}
                </div>
              </div>
              <Link
                to={`/containers/${container.id}`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                View Container
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Link
          to={`/items/${card.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Edit Card
        </Link>
      </div>
    </div>
  )
}
