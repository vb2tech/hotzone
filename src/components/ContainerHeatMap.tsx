import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Container, Zone } from '../lib/supabase'
import { X, Layers } from 'lucide-react'

interface ContainerWithItems extends Container {
  itemCount: number
  zone: Zone
}

interface HeatMapPoint {
  id: string
  name: string
  x: number
  y: number
  itemCount: number
  container: ContainerWithItems
}

export const ContainerHeatMap: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [hoveredContainer, setHoveredContainer] = useState<ContainerWithItems | null>(null)
  const [selectedContainer, setSelectedContainer] = useState<ContainerWithItems | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<HeatMapPoint | null>(null)
  const [heatMapPoints, setHeatMapPoints] = useState<HeatMapPoint[]>([])

  useEffect(() => {
    fetchContainersWithItems()
  }, [])

  const fetchContainersWithItems = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch containers with their items and zone info for current user only
      const { data: containersData, error: containersError } = await supabase
        .from('containers')
        .select(`
          *,
          zones (
            id,
            name
          ),
          cards (id),
          comics (id)
        `)
        .eq('user_id', user.id)

      if (containersError) throw containersError

      const containersWithCounts = containersData?.map(container => ({
        ...container,
        itemCount: (container.cards?.length || 0) + (container.comics?.length || 0),
        zone: container.zones
      })) || []

      // Store containers data for later use
      
      // Generate fixed positions for heat map points
      const points = containersWithCounts.map((container, index) => {
        // Create a grid-like layout with some randomness
        const cols = Math.ceil(Math.sqrt(containersWithCounts.length))
        const row = Math.floor(index / cols)
        const col = index % cols
        
        // Ensure we have at least 1 column and row
        const safeCols = Math.max(1, cols)
        const safeRows = Math.max(1, Math.ceil(containersWithCounts.length / safeCols))
        
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
          id: container.id,
          name: container.name,
          x: finalX,
          y: finalY,
          itemCount: container.itemCount,
          container: container
        }
      })
      
      setHeatMapPoints(points)
    } catch (error) {
      console.error('Error fetching containers with items:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPointSize = (itemCount: number): number => {
    if (itemCount === 0) return 20
    if (itemCount <= 5) return 30
    if (itemCount <= 15) return 40
    return 50
  }

  const getPointColor = (itemCount: number): string => {
    if (itemCount === 0) return 'bg-gray-300'
    if (itemCount <= 5) return 'bg-green-400'
    if (itemCount <= 15) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  const handleContainerClick = (point: HeatMapPoint) => {
    setSelectedContainer(point.container)
    setSelectedPoint(point)
  }

  const handleCloseModal = () => {
    setSelectedContainer(null)
    setSelectedPoint(null)
  }

  const handleViewContainer = (containerId: string) => {
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
        <h2 className="text-2xl font-bold text-gray-900">Container Heat Map</h2>
        <p className="mt-2 text-gray-600">
          Heat map visualization showing item density across containers. Hotter areas indicate higher item counts. Click on a container to view details.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="relative h-96 rounded-lg overflow-hidden">
          {/* Heat map background with gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-red-50">
            {/* Heat intensity overlay */}
            {heatMapPoints.map((point) => {
              const intensity = Math.min(point.itemCount / 20, 1) // Normalize to 0-1
              const size = getPointSize(point.itemCount) * 3 // Larger heat radius
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
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-125 ${getPointColor(point.itemCount)} shadow-lg`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                width: `${getPointSize(point.itemCount)}px`,
                height: `${getPointSize(point.itemCount)}px`,
                borderRadius: '50%',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }}
              onMouseEnter={() => setHoveredContainer(point.container)}
              onMouseLeave={() => setHoveredContainer(null)}
              onClick={() => handleContainerClick(point)}
            >
              <div className="flex items-center justify-center h-full">
                <div className="text-white font-bold text-xs text-center px-1">
                  {point.name}
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
                <span>No items</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-400 rounded-full mr-2 shadow-sm"></div>
                <span>1-5 items</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-400 rounded-full mr-2 shadow-sm"></div>
                <span>6-15 items</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-400 rounded-full mr-2 shadow-sm"></div>
                <span>16+ items</span>
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
        {hoveredContainer && (
          <div className="absolute z-10 bg-white p-4 rounded-lg shadow-lg border max-w-xs">
            <h4 className="font-medium text-gray-900">{hoveredContainer.name}</h4>
            <p className="text-sm text-gray-600 mt-1">
              Zone: {hoveredContainer.zone?.name || 'Unknown'}
            </p>
            <p className="text-sm text-gray-600">
              {hoveredContainer.itemCount} item{hoveredContainer.itemCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Modal for selected container */}
      {selectedContainer && selectedPoint && (
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
                {selectedContainer.name}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Zone:</span>
                  <span className="text-sm font-medium">{selectedContainer.zone?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Items:</span>
                  <span className="text-sm font-medium">{selectedContainer.itemCount}</span>
                </div>
                <div className="pt-3 border-t">
                  <button
                    onClick={() => handleViewContainer(selectedContainer.id)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    View Container Items
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
