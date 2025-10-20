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
          to={`/items/${comic.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Edit Comic
        </Link>
      </div>
    </div>
  )
}
