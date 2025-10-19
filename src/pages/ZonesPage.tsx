import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Zone } from '../lib/supabase'
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react'

export const ZonesPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone) => (
            <div key={zone.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{zone.name}</h3>
                  </div>
                </div>
                <div className="mt-4 flex space-x-3">
                  <Link
                    to={`/zones/${zone.id}/edit`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteZone(zone.id)}
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
