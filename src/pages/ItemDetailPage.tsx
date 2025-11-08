import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Layers, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    const saved = localStorage.getItem('item-detail-per-page')
    return saved ? parseInt(saved, 10) : 25
  })

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

  // Flatten all items into a single array for pagination
  const allItems = yearBreakdowns.flatMap((breakdown, breakdownIndex) => {
    const year = breakdown?.year != null ? breakdown.year : -1
    const items = breakdown?.items || []
    return items.map((item, itemIndex) => ({
      ...item,
      year,
      breakdownIndex,
      itemIndex
    }))
  })

  // Pagination calculations (summary row is always shown, so we paginate items)
  const totalPages = Math.ceil(allItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = allItems.slice(startIndex, endIndex)

  // Reset to page 1 when itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    localStorage.setItem('item-detail-per-page', value.toString())
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
        <>
          {/* Items Per Page Selector */}
          <div className="flex justify-end items-center">
            <div className="flex items-center space-x-2">
              <label htmlFor="items-per-page" className="text-sm text-gray-700">
                Items per page:
              </label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value, 10))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

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
                      Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Summary Row */}
                  {(() => {
                    const totalCount = yearBreakdowns.reduce((sum, breakdown) => sum + (breakdown?.count || 0), 0)
                    const totalCost = yearBreakdowns.reduce((sum, breakdown) => sum + (breakdown?.totalCost || 0), 0)
                    const totalValue = yearBreakdowns.reduce((sum, breakdown) => sum + (breakdown?.totalValue || 0), 0)
                    
                    return (
                      <tr className="bg-blue-50 font-semibold border-b-2 border-gray-300">
                        <td className="px-6 py-4 align-top whitespace-nowrap text-sm font-bold text-gray-900">
                          Total
                        </td>
                        <td className="px-6 py-4 align-top text-sm font-bold text-gray-900">
                          {/* Empty for variants column */}
                        </td>
                        <td className="px-6 py-4 align-top whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                          {totalCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 align-top whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                          ${totalCost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 align-top whitespace-nowrap text-sm font-bold text-green-600 text-right">
                          ${totalValue.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })()}
                  
                  {/* Individual Item Rows (Paginated) */}
                  {paginatedItems.map((item) => {
                    const itemCost = (item.cost || 0) * item.quantity
                    const itemPrice = (item.price || 0) * item.quantity
                    const year = item.year
                    
                    return (
                      <tr key={`${item.id}-${item.breakdownIndex}-${item.itemIndex}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 align-top whitespace-nowrap text-sm font-medium text-gray-900">
                          {year === -1 ? 'Unknown' : year}
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-gray-500">
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
                              </span>
                            ) : (
                              <span>
                                {item.publisher || ''} #{item.issue || ''}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="px-6 py-4 align-top whitespace-nowrap text-sm text-gray-900 text-right">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 align-top whitespace-nowrap text-sm text-gray-900 text-right">
                          ${itemCost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 align-top whitespace-nowrap text-sm font-medium text-green-600 text-right">
                          ${itemPrice.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, allItems.length)}</span> of{' '}
                    <span className="font-medium">{allItems.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span
                            key={page}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            ...
                          </span>
                        )
                      }
                      return null
                    })}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
          </div>
        </>
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

