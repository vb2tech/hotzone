import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Zone } from '../lib/supabase'
import { MapPin, Plus, Edit, Trash2, LayoutGrid, List } from 'lucide-react'

type ViewMode = 'card' | 'list'
type ViewSize = 'small' | 'medium' | 'large'

export const ZonesPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('zones-view-mode')
    return (saved as ViewMode) || 'list'
  })
  const [viewSize, setViewSize] = useState<ViewSize>(() => {
    const saved = localStorage.getItem('zones-view-size')
    return (saved as ViewSize) || 'medium'
  })

  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('zones-view-mode', mode)
  }

  const changeViewSize = (size: ViewSize) => {
    setViewSize(size)
    localStorage.setItem('zones-view-size', size)
  }

  // Get grid classes based on size
  const getCardGridClasses = () => {
    switch (viewSize) {
      case 'small':
        return 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
      case 'large':
        return 'grid grid-cols-1 md:grid-cols-2 gap-6'
      default: // medium
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
    }
  }

  // Get text size classes
  const getTextSizeClasses = () => {
    switch (viewSize) {
      case 'small':
        return { heading: 'text-sm', subtext: 'text-xs' }
      case 'large':
        return { heading: 'text-xl', subtext: 'text-base' }
      default: // medium
        return { heading: 'text-lg', subtext: 'text-sm' }
    }
  }

  const textSizes = getTextSizeClasses()

  useEffect(() => {
    fetchZones()
  }, [])

  const fetchZones = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setZones(data || [])
    } catch (error) {
      console.error('Error fetching zones:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteZone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return

    try {
      const { error } = await supabase.from('zones').delete().eq('id', id)
      if (error) throw error
      fetchZones()
    } catch (error) {
      console.error('Error deleting zone:', error)
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
          <h1 className="text-3xl font-bold text-gray-900">Zones</h1>
          <p className="mt-2 text-gray-600">Manage your storage zones</p>
        </div>
        <div className="flex space-x-3">
          {/* View Toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => toggleViewMode('card')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'card'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => toggleViewMode('list')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
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
            to="/zones/heatmap"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Heat Map
          </Link>
          <Link
            to="/zones/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </Link>
        </div>
      </div>

      {zones.length > 0 ? (
        viewMode === 'card' ? (
          <div className={getCardGridClasses()}>
            {zones.map((zone) => (
              <div key={zone.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
                <Link 
                  to={`/zones/${zone.id}`}
                  className={`block ${viewSize === 'small' ? 'p-3' : viewSize === 'large' ? 'p-8' : 'p-6'} hover:bg-gray-50 transition-colors duration-200`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <MapPin className={`${viewSize === 'small' ? 'h-4 w-4' : viewSize === 'large' ? 'h-8 w-8' : 'h-6 w-6'} text-blue-600`} />
                    </div>
                    <div className={`${viewSize === 'small' ? 'ml-2' : viewSize === 'large' ? 'ml-6' : 'ml-4'} flex-1`}>
                      <h3 className={`${textSizes.heading} font-medium text-gray-900`}>{zone.name}</h3>
                    </div>
                  </div>
                </Link>
                <div className="px-6 pb-6">
                  <div className="flex space-x-3">
                    <Link
                      to={`/zones/${zone.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteZone(zone.id)
                      }}
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
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Name
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-left font-medium text-gray-500 uppercase tracking-wider`}>
                      Created
                    </th>
                    <th scope="col" className={`${viewSize === 'small' ? 'px-3 py-2 text-xs' : viewSize === 'large' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} text-right font-medium text-gray-500 uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-gray-50">
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                        <Link 
                          to={`/zones/${zone.id}`}
                          className={`${textSizes.heading} font-medium text-blue-600 hover:text-blue-900`}
                        >
                          {zone.name}
                        </Link>
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap`}>
                        <div className={`${textSizes.subtext} text-gray-500`}>
                          {new Date(zone.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className={`${viewSize === 'small' ? 'px-3 py-2' : viewSize === 'large' ? 'px-8 py-4' : 'px-6 py-4'} whitespace-nowrap text-right ${viewSize === 'small' ? 'text-xs' : viewSize === 'large' ? 'text-base' : 'text-sm'} font-medium`}>
                        <Link
                          to={`/zones/${zone.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteZone(zone.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No zones</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new zone.</p>
          <div className="mt-6">
            <Link
              to="/zones/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 bg-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
