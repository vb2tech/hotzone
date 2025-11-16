import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Comic, Container, Zone } from '../lib/supabase'
import { ArrowLeft, Package, MapPin, BookOpen } from 'lucide-react'

interface ContainerWithZone extends Container {
  zone: Zone
}

export const ComicViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [comic, setComic] = useState<Comic | null>(null)
  const [container, setContainer] = useState<ContainerWithZone | null>(null)
  const [duplicateComics, setDuplicateComics] = useState<Array<Comic & { container: ContainerWithZone }>>([])
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchComicAndContainer(id)
    }
  }, [id])

  const fetchComicAndContainer = async (comicId: string) => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Fetch comic info for current user only
      const { data: comicData, error: comicError } = await supabase
        .from('comics')
        .select('*')
        .eq('id', comicId)
        .eq('user_id', user.id)
        .single()

      if (comicError) throw comicError
      setComic(comicData)

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
        .eq('id', comicData.container_id)
        .eq('user_id', user.id)
        .single()

      if (containerError) throw containerError
      
      const containerWithZone = {
        ...containerData,
        zone: containerData.zones
      }

      setContainer(containerWithZone)

      // Fetch all duplicate comics (same title, publisher, issue, year)
      const { data: duplicateComicsData, error: duplicateError } = await supabase
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
        .eq('title', comicData.title)
        .eq('publisher', comicData.publisher)
        .eq('issue', comicData.issue)
        .eq('year', comicData.year)

      if (duplicateError) throw duplicateError

      const duplicateComicsWithContainers = duplicateComicsData?.map(comic => ({
        ...comic,
        container: {
          ...comic.containers,
          zone: comic.containers.zones
        }
      })) || []

      setDuplicateComics(duplicateComicsWithContainers)

      // Calculate total quantity
      const total = duplicateComicsWithContainers.reduce((sum, comic) => sum + comic.quantity, 0)
      setTotalQuantity(total)
    } catch (error) {
      console.error('Error fetching comic and container:', error)
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

  if (!comic) {
    return (
      <div className="text-center py-12">
        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Comic not found</h3>
        <p className="mt-1 text-sm text-gray-500">The comic you're looking for doesn't exist.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">{comic.title}</h1>
            <p className="mt-2 text-sm text-gray-500">Comic details and information</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Quantity</p>
          <p className="text-2xl font-bold text-gray-900">{comic.quantity}</p>
        </div>
      </div>

      {/* Comic Details */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-green-600 mr-3" />
            <h2 className="text-lg font-medium text-gray-900">Comic Information</h2>
          </div>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Title</dt>
              <dd className="mt-1 text-sm text-gray-900">{comic.title}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Publisher</dt>
              <dd className="mt-1 text-sm text-gray-900">{comic.publisher}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Issue Number</dt>
              <dd className="mt-1 text-sm text-gray-900">#{comic.issue}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Year</dt>
              <dd className="mt-1 text-sm text-gray-900">{comic.year}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Quantity</dt>
              <dd className="mt-1 text-sm text-gray-900">{comic.quantity}</dd>
            </div>
            {comic.price && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Price</dt>
                <dd className="mt-1 text-sm text-gray-900">${comic.price.toFixed(2)}</dd>
              </div>
            )}
            {comic.cost && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Cost</dt>
                <dd className="mt-1 text-sm text-gray-900">${comic.cost.toFixed(2)}</dd>
              </div>
            )}
            {comic.grade && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Grade</dt>
                <dd className="mt-1 text-sm text-gray-900">{comic.grade}</dd>
              </div>
            )}
            {comic.condition && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Condition</dt>
                <dd className="mt-1 text-sm text-gray-900">{comic.condition}</dd>
              </div>
            )}
            {comic.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{comic.description}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Total Quantity and Other Locations */}
      {duplicateComics.length > 1 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-lg font-medium text-gray-900">Total Inventory</h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Total Quantity Across All Containers</span>
                <span className="text-2xl font-bold text-green-600">{totalQuantity}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">All Locations</h3>
              <div className="space-y-2">
                {duplicateComics.map((duplicateComic) => (
                  <div key={duplicateComic.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {duplicateComic.container.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Zone: {duplicateComic.container.zone?.name || 'Unknown Zone'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        Quantity: {duplicateComic.quantity}
                      </span>
                      {duplicateComic.id === comic?.id && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
          to={`/items/${comic.id}/edit?type=comic`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Edit Comic
        </Link>
      </div>
    </div>
  )
}
