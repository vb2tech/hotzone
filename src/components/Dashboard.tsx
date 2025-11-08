import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MapPin, Package, Layers } from 'lucide-react'

interface GroupedItem {
  name: string
  totalCount: number
  totalCost: number
  totalValue: number
  itemType: 'card' | 'comic' | 'mixed'
}

interface DashboardStats {
  zones: number
  containers: number
  items: number
  groupedItems: GroupedItem[]
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    zones: 0,
    containers: 0,
    items: 0,
    groupedItems: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  const fetchStats = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

        // Fetch counts and all items
        const [zonesResult, containersResult, cardsResult, comicsResult] = await Promise.all([
        supabase.from('zones').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('containers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('cards').select('*').eq('user_id', user.id),
          supabase.from('comics').select('*').eq('user_id', user.id)
        ])

        if (cardsResult.error) throw cardsResult.error
        if (comicsResult.error) throw comicsResult.error

        // Group items by name
        const groupedMap = new Map<string, GroupedItem>()

        // Process cards
        cardsResult.data?.forEach(card => {
          const name = card.player || 'Unknown'
          const existing = groupedMap.get(name)
          
          if (existing) {
            existing.totalCount += card.quantity || 1
            existing.totalCost += (card.cost || 0) * (card.quantity || 1)
            existing.totalValue += (card.price || 0) * (card.quantity || 1)
            if (existing.itemType === 'comic') {
              existing.itemType = 'mixed'
            }
          } else {
            groupedMap.set(name, {
              name,
              totalCount: card.quantity || 1,
              totalCost: (card.cost || 0) * (card.quantity || 1),
              totalValue: (card.price || 0) * (card.quantity || 1),
              itemType: 'card'
            })
          }
        })

        // Process comics
        comicsResult.data?.forEach(comic => {
          const name = comic.title || 'Unknown'
          const existing = groupedMap.get(name)
          
          if (existing) {
            existing.totalCount += comic.quantity || 1
            existing.totalCost += (comic.cost || 0) * (comic.quantity || 1)
            existing.totalValue += (comic.price || 0) * (comic.quantity || 1)
            if (existing.itemType === 'card') {
              existing.itemType = 'mixed'
            }
          } else {
            groupedMap.set(name, {
              name,
              totalCount: comic.quantity || 1,
              totalCost: (comic.cost || 0) * (comic.quantity || 1),
              totalValue: (comic.price || 0) * (comic.quantity || 1),
              itemType: 'comic'
            })
          }
        })

        // Convert map to array and sort by name
        const groupedItems = Array.from(groupedMap.values()).sort((a, b) => 
          a.name.localeCompare(b.name)
        )

      setStats({
        zones: zonesResult.count || 0,
        containers: containersResult.count || 0,
          items: (cardsResult.data?.length || 0) + (comicsResult.data?.length || 0),
          groupedItems
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

    fetchStats()
  }, [])

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your inventory</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/zones" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200 cursor-pointer">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Zones</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.zones}</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/containers" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200 cursor-pointer">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Containers</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.containers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/items" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200 cursor-pointer">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Layers className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.items}</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Grouped Items Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Items by Name</h3>
          {stats.groupedItems.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Count
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.groupedItems.map((item, index) => (
                    <tr 
                      key={`${item.name}-${index}`} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/items/${encodeURIComponent(item.name)}/details`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.itemType === 'card' 
                            ? 'bg-blue-100 text-blue-800' 
                            : item.itemType === 'comic'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.itemType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.totalCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ${item.totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                        ${item.totalValue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6">
              <Layers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No items yet</h3>
              <p className="mt-1 text-sm text-gray-500">Start by adding some items to your inventory.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
