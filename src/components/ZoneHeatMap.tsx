import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Zone, Container } from '../lib/supabase'
import { Package, X } from 'lucide-react'

interface ContainerWithItems extends Container {
  itemCount: number
}

interface ZoneWithContainers extends Zone {
  containerCount: number
  containers: ContainerWithItems[]
}

interface HeatMapPoint {
  id: string
  name: string
  x: number
  y: number
  containerCount: number
  containers: Container[]
}

export const ZoneHeatMap: React.FC = () => {
  const navigate = useNavigate()
  const [zones, setZones] = useState<ZoneWithContainers[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredZone, setHoveredZone] = useState<ZoneWithContainers | null>(null)
  const [selectedZone, setSelectedZone] = useState<ZoneWithContainers | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<HeatMapPoint | null>(null)
  const [heatMapPoints, setHeatMapPoints] = useState<HeatMapPoint[]>([])

  useEffect(() => {
    fetchZonesWithContainers()
  }, [])

  const fetchZonesWithContainers = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch zones with their containers and items for current user only
      const { data: zonesData, error: zonesError } = await supabase
        .from('zones')
        .select(`
          *,
          containers (
            id,
            name,
            cards (id),
            comics (id)
          )
        `)
        .eq('user_id', user.id)

      if (zonesError) throw zonesError

      const zonesWithCounts = zonesData?.map(zone => ({
        ...zone,
        containerCount: zone.containers?.length || 0,
        containers: zone.containers?.map((container: any) => ({
          ...container,
          itemCount: (container.cards?.length || 0) + (container.comics?.length || 0)
        })) || []
      })) || []

      setZones(zonesWithCounts)
      
      // Generate fixed positions for heat map points
      const points = zonesWithCounts.map((zone, index) => {
        // Create a grid-like layout with some randomness
        const cols = Math.ceil(Math.sqrt(zonesWithCounts.length))
        const row = Math.floor(index / cols)
        const col = index % cols
        
        // Ensure we have at least 1 column and row
        const safeCols = Math.max(1, cols)
        const safeRows = Math.max(1, Math.ceil(zonesWithCounts.length / safeCols))
        
        // Base grid position with safe boundaries
        const baseX = safeCols === 1 ? 50 : (col / (safeCols - 1)) * 60 + 20 // 20% to 80% of width
        const baseY = safeRows === 1 ? 50 : (row / (safeRows - 1)) * 60 + 20 // 20% to 80% of height
        
        // Add some randomness to avoid perfect grid, but keep within bounds
        const randomX = (Math.random() - 0.5) * 15
        const randomY = (Math.random() - 0.5) * 15
        
        // Ensure points stay within visible area (15% to 85% to account for point size)
        const finalX = Math.max(15, Math.min(85, baseX + randomX))
        const finalY = Math.max(15, Math.min(85, baseY + randomY))
        
        return {
          id: zone.id,
          name: zone.name,
          x: finalX,
          y: finalY,
          containerCount: zone.containerCount,
          containers: zone.containers
        }
      })
      
      setHeatMapPoints(points)
    } catch (error) {
      console.error('Error fetching zones with containers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPointSize = (containerCount: number): number => {
    if (containerCount === 0) return 20
    if (containerCount <= 2) return 30
    if (containerCount <= 5) return 40
    return 50
  }

  const getPointColor = (containerCount: number): string => {
    if (containerCount === 0) return 'bg-gray-300'
    if (containerCount <= 2) return 'bg-green-400'
    if (containerCount <= 5) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  const handleZoneClick = (point: HeatMapPoint) => {
    const zone = zones.find(z => z.id === point.id)
    if (zone) {
      setSelectedZone(zone)
      setSelectedPoint(point)
    }
  }

  const handleCloseModal = () => {
    setSelectedZone(null)
    setSelectedPoint(null)
  }

  const handleContainerClick = (containerId: string) => {
    navigate(`/containers/${containerId}`)
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Zone Heat Map</h2>
        <p className="mt-2 text-gray-600">
          Heat map visualization showing container density across zones. Hotter areas indicate higher container counts. Click on a zone to view containers.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="relative h-96 rounded-lg overflow-hidden">
          {/* Heat map background with gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-red-50">
            {/* Heat intensity overlay */}
            {heatMapPoints.map((point) => {
              const intensity = Math.min(point.containerCount / 10, 1) // Normalize to 0-1
              const size = getPointSize(point.containerCount) * 3 // Larger heat radius
              return (
                <div
                  key={`heat-${point.id}`}
                  className="absolute rounded-full opacity-30"
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle, rgba(255,${Math.floor(255 - intensity * 255)},0,${0.3 + intensity * 0.4}) 0%, transparent 70%)`
                  }}
                />
              )
            })}
          </div>

          {/* Heat map points */}
          {heatMapPoints.map((point) => (
            <div
              key={point.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-125 ${getPointColor(point.containerCount)} shadow-lg`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                width: `${getPointSize(point.containerCount)}px`,
                height: `${getPointSize(point.containerCount)}px`,
                borderRadius: '50%',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }}
              onMouseEnter={() => setHoveredZone(zones.find(z => z.id === point.id) || null)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => handleZoneClick(point)}
            >
              <div className="flex items-center justify-center h-full">
                <div className="text-white font-bold text-xs">
                  {point.containerCount}
                </div>
              </div>
            </div>
          ))}

          {/* Heat map legend */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Heat Intensity</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded-full mr-2 shadow-sm"></div>
                <span>No containers</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-400 rounded-full mr-2 shadow-sm"></div>
                <span>1-2 containers</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-400 rounded-full mr-2 shadow-sm"></div>
                <span>3-5 containers</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-400 rounded-full mr-2 shadow-sm"></div>
                <span>6+ containers</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Cool</span>
                <div className="flex-1 mx-2 h-2 bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-400 rounded"></div>
                <span>Hot</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hover tooltip */}
        {hoveredZone && (
          <div className="absolute z-10 bg-white p-4 rounded-lg shadow-lg border max-w-xs">
            <h4 className="font-medium text-gray-900">{hoveredZone.name}</h4>
            <p className="text-sm text-gray-600 mt-1">
              {hoveredZone.containerCount} container{hoveredZone.containerCount !== 1 ? 's' : ''}
            </p>
            {hoveredZone.containers.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-700">Containers:</p>
                <ul className="text-xs text-gray-600 mt-1">
                  {hoveredZone.containers.slice(0, 3).map((container) => (
                    <li key={container.id}>• {container.name}</li>
                  ))}
                  {hoveredZone.containers.length > 3 && (
                    <li>• +{hoveredZone.containers.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for selected zone - positioned at clicked spot */}
      {selectedZone && selectedPoint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div 
            className="absolute bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 max-h-80 overflow-hidden"
            style={{
              left: `${Math.min(selectedPoint.x, 70)}%`, // Keep modal on screen
              top: `${Math.min(selectedPoint.y, 60)}%`, // Keep modal on screen
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedZone.name}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-64">
              {selectedZone.containers.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedZone.containerCount} container{selectedZone.containerCount !== 1 ? 's' : ''}
                  </p>
                  {selectedZone.containers.map((container) => (
                    <div
                      key={container.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleContainerClick(container.id)}
                    >
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-blue-600 mr-2" />
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">{container.name}</h4>
                          <p className="text-xs text-gray-500">
                            {container.itemCount} item{container.itemCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        →
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Package className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No containers</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    This zone doesn't have any containers yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}