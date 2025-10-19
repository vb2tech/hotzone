import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MapPin, Package, Layers, TrendingUp } from 'lucide-react'

interface DashboardStats {
  zones: number
  containers: number
  items: number
  recentItems: {
    id: string
    user_id: string
    container_id: string
    created_at: string
    updated_at: string
    grade: number | null
    condition: string | null
    quantity: number
    item_type: 'card' | 'comic'
    player?: string
    title?: string
    manufacturer?: string
    sport?: string
    year?: number
    publisher?: string
    issue?: number
  }[]
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    zones: 0,
    containers: 0,
    items: 0,
    recentItems: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  const fetchStats = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch counts from zones, containers, cards, and comics for current user only
      const [zonesResult, containersResult, cardsResult, comicsResult, recentCardsResult, recentComicsResult] = await Promise.all([
        supabase.from('zones').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('containers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('comics').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('cards').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('comics').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
      ])

      // Combine recent items
      const recentCards = recentCardsResult.data?.map(card => ({
        ...card,
        item_type: 'card' as const
      })) || []
      
      const recentComics = recentComicsResult.data?.map(comic => ({
        ...comic,
        item_type: 'comic' as const
      })) || []

      const allRecentItems = [...recentCards, ...recentComics]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      setStats({
        zones: zonesResult.count || 0,
        containers: containersResult.count || 0,
        items: (cardsResult.count || 0) + (comicsResult.count || 0),
        recentItems: allRecentItems
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
        <div className="bg-white overflow-hidden shadow rounded-lg">
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
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
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
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
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
        </div>
      </div>

      {/* Recent Items Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Items</h3>
          {stats.recentItems.length > 0 ? (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.item_type === 'card' ? item.player : item.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.item_type === 'card' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.item_type}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          Qty: {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No items yet</h3>
              <p className="mt-1 text-sm text-gray-500">Start by adding some items to your inventory.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
