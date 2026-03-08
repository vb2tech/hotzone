import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Clothing, Container, Zone } from '../lib/supabase'
import { ArrowLeft, Package, MapPin, Shirt } from 'lucide-react'

interface ContainerWithZone extends Container {
  zone: Zone
}

export const ClothingViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [clothing, setClothing] = useState<Clothing | null>(null)
  const [container, setContainer] = useState<ContainerWithZone | null>(null)
  const [duplicateClothing, setDuplicateClothing] = useState<Array<Clothing & { container: ContainerWithZone }>>([])
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchClothingAndContainer(id)
    }
  }, [id])

  const fetchClothingAndContainer = async (clothingId: string) => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch clothing info for current user only
      const { data: clothingData, error: clothingError } = await supabase
        .from('clothing')
        .select('*')
        .eq('id', clothingId)
        .eq('user_id', user.id)
        .single()

      if (clothingError) throw clothingError
      setClothing(clothingData)

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
        .eq('id', clothingData.container_id)
        .eq('user_id', user.id)
        .single()

      if (containerError) throw containerError

      const containerWithZone = {
        ...containerData,
        zone: containerData.zones
      }

      setContainer(containerWithZone)

      // Fetch all duplicate clothing (same brand, type, size, color)
      const { data: duplicateClothingData, error: duplicateError } = await supabase
        .from('clothing')
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
        .eq('brand', clothingData.brand)
        .eq('type', clothingData.type)
        .eq('size', clothingData.size)
        .eq('color', clothingData.color)

      if (duplicateError) throw duplicateError

      const duplicateClothingWithContainers = duplicateClothingData?.map(item => ({
        ...item,
        container: {
          ...item.containers,
          zone: item.containers.zones
        }
      })) || []

      setDuplicateClothing(duplicateClothingWithContainers)

      // Calculate total quantity
      const total = duplicateClothingWithContainers.reduce((sum, item) => sum + item.quantity, 0)
      setTotalQuantity(total)
    } catch (error) {
      console.error('Error fetching clothing and container:', error)
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

  if (!clothing) {
    return (
      <div className="text-center py-12">
        <Shirt className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Clothing not found</h3>
        <p className="mt-1 text-sm text-gray-500">The clothing item you're looking for doesn't exist.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">{clothing.brand} {clothing.type}</h1>
            <p className="mt-2 text-sm text-gray-500">Clothing details and information</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Quantity</p>
          <p className="text-2xl font-bold text-gray-900">{clothing.quantity}</p>
        </div>
      </div>

      {/* Clothing Details */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Shirt className="h-6 w-6 text-purple-600 mr-3" />
            <h2 className="text-lg font-medium text-gray-900">Clothing Information</h2>
          </div>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Brand</dt>
              <dd className="mt-1 text-sm text-gray-900">{clothing.brand}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{clothing.type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Size</dt>
              <dd className="mt-1 text-sm text-gray-900">{clothing.size}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Color</dt>
              <dd className="mt-1 text-sm text-gray-900">{clothing.color}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Quantity</dt>
              <dd className="mt-1 text-sm text-gray-900">{clothing.quantity}</dd>
            </div>
            {clothing.price && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Price</dt>
                <dd className="mt-1 text-sm text-gray-900">${clothing.price.toFixed(2)}</dd>
              </div>
            )}
            {clothing.cost && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Cost</dt>
                <dd className="mt-1 text-sm text-gray-900">${clothing.cost.toFixed(2)}</dd>
              </div>
            )}
            {clothing.condition && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Condition</dt>
                <dd className="mt-1 text-sm text-gray-900">{clothing.condition}</dd>
              </div>
            )}
            {clothing.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{clothing.description}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Total Quantity and Other Locations */}
      {duplicateClothing.length > 1 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Shirt className="h-6 w-6 text-purple-600 mr-3" />
              <h2 className="text-lg font-medium text-gray-900">Total Inventory</h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Total Quantity Across All Containers</span>
                <span className="text-2xl font-bold text-purple-600">{totalQuantity}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">All Locations</h3>
              <div className="space-y-2">
                {duplicateClothing.map((duplicateItem) => (
                  <div key={duplicateItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {duplicateItem.container.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Zone: {duplicateItem.container.zone?.name || 'Unknown Zone'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        Quantity: {duplicateItem.quantity}
                      </span>
                      {duplicateItem.id === clothing?.id && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Container Information */}
      {container && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-purple-600 mr-3" />
              <h2 className="text-lg font-medium text-gray-900">Container Information</h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  <Link
                    to={`/containers/${container.id}`}
                    className="text-purple-600 hover:text-purple-700"
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
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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
          to={`/items/${clothing.id}/edit?type=clothing`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Edit Clothing
        </Link>
      </div>
    </div>
  )
}
