import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Layers } from 'lucide-react'

interface YearBreakdown {
  year: number  // -1 represents unknown/null years
  count: number
  totalCost: number
  totalValue: number
  items: Array<{
    id: string
    item_type: 'card' | 'comic'
    quantity: number
    cost: number | null
    price: number | null
    // Card fields
    manufacturer?: string
    sport?: string
    team?: string | null
    number?: string
    number_out_of?: number | null
    is_rookie?: boolean
    // Comic fields
    publisher?: string
    issue?: number
  }>
}

export const ItemDetailPage: React.FC = () => {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [yearBreakdowns, setYearBreakdowns] = useState<YearBreakdown[]>([])
  const [itemName, setItemName] = useState<string>('')
  const [itemType, setItemType] = useState<'card' | 'comic' | 'mixed'>('mixed')

  useEffect(() => {
    if (name) {
      fetchItemDetails(decodeURIComponent(name))
    }
  }, [name])

  const fetchItemDetails = async (itemName: string) => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setItemName(itemName)

      // Fetch all cards and comics with matching name
      const [cardsResult, comicsResult] = await Promise.all([
        supabase
          .from('cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('player', itemName),
        supabase
          .from('comics')
          .select('*')
          .eq('user_id', user.id)
          .eq('title', itemName)
      ])

      if (cardsResult.error) throw cardsResult.error
      if (comicsResult.error) throw comicsResult.error

      const cards = cardsResult.data || []
      const comics = comicsResult.data || []

      // Determine item type
      if (cards.length > 0 && comics.length > 0) {
        setItemType('mixed')
      } else if (cards.length > 0) {
        setItemType('card')
      } else {
        setItemType('comic')
      }

      // Group by year
      const yearMap = new Map<number, YearBreakdown>()

      // Process cards
      cards.forEach(card => {
        const year = (card.year != null && card.year !== undefined) ? card.year : -1
        const quantity = card.quantity || 1
        const cost = ((card.cost || 0) * quantity)
        const value = ((card.price || 0) * quantity)

        const existing = yearMap.get(year)
        if (existing) {
          existing.count += quantity
          existing.totalCost += cost
          existing.totalValue += value
          existing.items.push({
            id: card.id,
            item_type: 'card',
            quantity,
            cost: card.cost,
            price: card.price,
            manufacturer: card.manufacturer,
            sport: card.sport,
            team: card.team,
            number: card.number,
            number_out_of: card.number_out_of,
            is_rookie: card.is_rookie
          })
        } else {
          yearMap.set(year, {
            year: year,
            count: quantity,
            totalCost: cost,
            totalValue: value,
            items: [{
              id: card.id,
              item_type: 'card',
              quantity,
              cost: card.cost,
              price: card.price,
              manufacturer: card.manufacturer,
              sport: card.sport,
              team: card.team,
              number: card.number,
              number_out_of: card.number_out_of,
              is_rookie: card.is_rookie
            }]
          })
        }
      })

      // Process comics
      comics.forEach(comic => {
        const year = (comic.year != null && comic.year !== undefined) ? comic.year : -1
        const quantity = comic.quantity || 1
        const cost = ((comic.cost || 0) * quantity)
        const value = ((comic.price || 0) * quantity)

        const existing = yearMap.get(year)
        if (existing) {
          existing.count += quantity
          existing.totalCost += cost
          existing.totalValue += value
          existing.items.push({
            id: comic.id,
            item_type: 'comic',
            quantity,
            cost: comic.cost,
            price: comic.price,
            publisher: comic.publisher,
            issue: comic.issue
          })
        } else {
          yearMap.set(year, {
            year: year,
            count: quantity,
            totalCost: cost,
            totalValue: value,
            items: [{
              id: comic.id,
              item_type: 'comic',
              quantity,
              cost: comic.cost,
              price: comic.price,
              publisher: comic.publisher,
              issue: comic.issue
            }]
          })
        }
      })

      // Convert to array and sort by year (descending), with unknown years at the end
      const breakdowns = Array.from(yearMap.values())
        .filter(breakdown => breakdown != null) // Filter out any null/undefined entries
        .map(breakdown => ({
          ...breakdown,
          count: breakdown.count || 0,
          totalCost: breakdown.totalCost || 0,
          totalValue: breakdown.totalValue || 0
        }))
        .sort((a, b) => {
          // Put unknown years (-1) at the end
          if (a.year === -1) return 1
          if (b.year === -1) return -1
          return b.year - a.year
        })
      
      console.log('Year breakdowns:', breakdowns) // Debug log
      setYearBreakdowns(breakdowns)
    } catch (error) {
      console.error('Error fetching item details:', error)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{itemName}</h1>
            <p className="mt-2 text-gray-600">Year breakdown and variant details</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          itemType === 'card' 
            ? 'bg-blue-100 text-blue-800' 
            : itemType === 'comic'
            ? 'bg-green-100 text-green-800'
            : 'bg-purple-100 text-purple-800'
        }`}>
          {itemType}
        </span>
      </div>

      {yearBreakdowns.length > 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variants
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
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
                  {yearBreakdowns.map((breakdown, index) => {
                    // Ensure all values are defined
                    const year = breakdown?.year != null ? breakdown.year : -1
                    const count = breakdown?.count != null ? breakdown.count : 0
                    const totalCost = breakdown?.totalCost != null ? breakdown.totalCost : 0
                    const totalValue = breakdown?.totalValue != null ? breakdown.totalValue : 0
                    const items = breakdown?.items || []
                    
                    return (
                      <tr key={`${year}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {year === -1 ? 'Unknown' : year}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="space-y-1">
                            {items.length > 0 ? (
                              items.map((item) => (
                                <div key={item.id} className="flex items-center space-x-2">
                                  <Link
                                    to={item.item_type === 'card' ? `/cards/${item.id}` : `/comics/${item.id}`}
                                    className="text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    {item.item_type === 'card' ? (
                                      <span>
                                        {item.manufacturer || ''} {item.sport || ''}
                                        {item.team && ` • ${item.team}`}
                                        {item.number && ` • #${item.number}`}
                                        {item.number_out_of && `/${item.number_out_of}`}
                                        {item.is_rookie && ' (Rookie)'}
                                        <span className="text-gray-400 ml-2">Qty: {item.quantity || 0}</span>
                                      </span>
                                    ) : (
                                      <span>
                                        {item.publisher || ''} #{item.issue || ''}
                                        <span className="text-gray-400 ml-2">Qty: {item.quantity || 0}</span>
                                      </span>
                                    )}
                                  </Link>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400">No variants</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {count.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${totalCost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                          ${totalValue.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Layers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">No items found with this name.</p>
        </div>
      )}
    </div>
  )
}

