import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Zone, Container } from '../lib/supabase'
import { MapPin, ArrowLeft, Package, Plus } from 'lucide-react'

interface ContainerWithDetails extends Container {
  zone: Zone
}

export const ZoneViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [zone, setZone] = useState<Zone | null>(null)
  const [containers, setContainers] = useState<ContainerWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchZoneAndContainers(id)
    }
  }, [id])

  const fetchZoneAndContainers = async (zoneId: string) => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Fetch zone info for current user only
      const { data: zoneData, error: zoneError } = await supabase
        .from('zones')
        .select('*')
        .eq('id', zoneId)
        .eq('user_id', user.id)
        .single()

      if (zoneError) throw zoneError
      setZone(zoneData)

      // Fetch containers in this zone for current user only
      const { data: containersData, error: containersError } = await supabase
        .from('containers')
        .select(`
          *,
          zones (
            id,
            name
          )
        `)
        .eq('zone_id', zoneId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (containersError) throw containersError
      
      const containersWithZones = containersData?.map(container => ({
        ...container,
        zone: container.zones
      })) || []

      setContainers(containersWithZones)
    } catch (error) {
      console.error('Error fetching zone and containers:', error)
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

  if (!zone) {
    return (
      <div className="text-center py-12">
        <MapPin className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Zone not found</h3>
        <p className="mt-1 text-sm text-gray-500">The zone you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link
            to="/zones"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Zones
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
            to="/zones"
            className="mr-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Zones
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{zone.name}</h1>
            <p className="mt-2 text-sm text-gray-500">Zone containers and inventory</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Containers</p>
          <p className="text-2xl font-bold text-gray-900">{containers.length}</p>
        </div>
      </div>

      {/* Containers Grid */}
      {containers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {containers.map((container) => (
            <div key={container.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
              <Link 
                to={`/containers/${container.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{container.name}</h3>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {container.zone?.name || 'Unknown Zone'}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No containers in this zone</h3>
          <p className="mt-1 text-sm text-gray-500">This zone doesn't have any containers yet.</p>
          <div className="mt-6">
            <Link
              to="/containers/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Container
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
