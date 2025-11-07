import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Layers, ChevronLeft, ChevronRight } from 'lucide-react'

interface ItemDetail {
  id: string
  year: number | null
  name: string
  cardNumber: string | null
  cost: number | null
  price: number | null
  quantity: number
  item_type: 'card' | 'comic'
  // Additional fields for display
  manufacturer?: string
  sport?: string
  team?: string | null
  publisher?: string
  issue?: number
}

interface PlayerGroup {
  playerName: string
  items: ItemDetail[]
  totalCost: number
  totalValue: number
}

interface TableRow {
  type: 'total' | 'group-header' | 'item'
  group?: PlayerGroup
  item?: ItemDetail
}

export const ItemDetailPage: React.FC = () => {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [playerGroups, setPlayerGroups] = useState<PlayerGroup[]>([])
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

      // Transform cards to ItemDetail format
      const cardItems: ItemDetail[] = cards.map(card => ({
        id: card.id,
        year: card.year ?? null,
        name: card.player || '',
        cardNumber: card.number || null,
        cost: card.cost,
        price: card.price,
        quantity: card.quantity || 1,
        item_type: 'card',
        manufacturer: card.manufacturer,
        sport: card.sport,
        team: card.team
      }))

      // Transform comics to ItemDetail format
      const comicItems: ItemDetail[] = comics.map(comic => ({
        id: comic.id,
        year: comic.year ?? null,
        name: comic.title || '',
        cardNumber: `#${comic.issue || ''}`,
        cost: comic.cost,
        price: comic.price,
        quantity: comic.quantity || 1,
        item_type: 'comic',
        publisher: comic.publisher,
        issue: comic.issue
      }))

      // Combine all items
      const allItems = [...cardItems, ...comicItems]

      // Group by player name (for cards, use player; for comics, use title)
      const groupMap = new Map<string, ItemDetail[]>()
      
      allItems.forEach(item => {
        const groupKey = item.name || 'Unknown'
        const existing = groupMap.get(groupKey)
        if (existing) {
          existing.push(item)
        } else {
          groupMap.set(groupKey, [item])
        }
      })

      // Create player groups with totals
      const groups: PlayerGroup[] = Array.from(groupMap.entries()).map(([playerName, items]) => {
        const totalCost = items.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0)
        const totalValue = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0)
        
        // Sort items within group by year (descending), then by card number
        const sortedItems = [...items].sort((a, b) => {
          // Sort by year first
          if (a.year != null && b.year != null) {
            if (b.year !== a.year) return b.year - a.year
          } else if (a.year == null && b.year != null) return 1
          else if (a.year != null && b.year == null) return -1
          
          // Then by card number
          const aNum = a.cardNumber || ''
          const bNum = b.cardNumber || ''
          return aNum.localeCompare(bNum)
        })

        return {
          playerName,
          items: sortedItems,
          totalCost,
          totalValue
        }
      })

      // Sort groups by player name
      groups.sort((a, b) => a.playerName.localeCompare(b.playerName))

      setPlayerGroups(groups)
    } catch (error) {
      console.error('Error fetching item details:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate overall totals
  const overallTotalCost = playerGroups.reduce((sum, group) => sum + group.totalCost, 0)
  const overallTotalValue = playerGroups.reduce((sum, group) => sum + group.totalValue, 0)
  const overallTotalCount = playerGroups.reduce((sum, group) => 
    sum + group.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  )

  // Build table rows: totals row is always first, then group headers + items
  const allRows: TableRow[] = [
    { type: 'total' },
    ...playerGroups.flatMap(group => [
      { type: 'group-header' as const, group },
      ...group.items.map(item => ({ type: 'item' as const, item }))
    ])
  ]

  // Pagination: totals row is always shown, paginate the rest
  // Skip the totals row (index 0) for pagination
  const rowsToPaginate = allRows.slice(1)
  const totalPages = Math.ceil(rowsToPaginate.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRows = rowsToPaginate.slice(startIndex, endIndex)

  // Combine totals row with paginated rows
  const displayRows = [allRows[0], ...paginatedRows]

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
            <p className="mt-2 text-gray-600">Item details and breakdown</p>
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

      {playerGroups.length > 0 ? (
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
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Card #
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
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
                    {displayRows.map((row) => {
                      if (row.type === 'total') {
                        return (
                          <tr key="total" className="bg-blue-50 font-semibold border-b-2 border-gray-300">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              Total
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">
                              {/* Empty for name column */}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">
                              {/* Empty for card number column */}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                              {overallTotalCount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                              ${overallTotalCost.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                              ${overallTotalValue.toFixed(2)}
                            </td>
                          </tr>
                        )
                      }

                      if (row.type === 'group-header' && row.group) {
                        const group = row.group
                        return (
                          <tr key={`group-${group.playerName}`} className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                              {group.playerName}
                            </td>
                            <td className="px-6 py-3 text-sm font-bold text-gray-900">
                              {/* Empty for name column */}
                            </td>
                            <td className="px-6 py-3 text-sm font-bold text-gray-900">
                              {/* Empty for card number column */}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                              {group.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                              ${group.totalCost.toFixed(2)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                              ${group.totalValue.toFixed(2)}
                            </td>
                          </tr>
                        )
                      }

                      if (row.type === 'item' && row.item) {
                        const item = row.item
                        const itemCost = (item.cost || 0) * item.quantity
                        const itemValue = (item.price || 0) * item.quantity
                        
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.year ?? 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <Link
                                to={item.item_type === 'card' ? `/cards/${item.id}` : `/comics/${item.id}`}
                                className="text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                {item.item_type === 'card' ? (
                                  <div>
                                    <div className="font-medium">{item.name}</div>
                                    {item.manufacturer && item.sport && (
                                      <div className="text-xs text-gray-500">
                                        {item.manufacturer} {item.sport}
                                        {item.team && ` • ${item.team}`}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium">{item.name}</div>
                                    {item.publisher && (
                                      <div className="text-xs text-gray-500">
                                        {item.publisher}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.cardNumber || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              ${itemCost.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                              ${itemValue.toFixed(2)}
                            </td>
                          </tr>
                        )
                      }

                      return null
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
                      <span className="font-medium">{Math.min(endIndex, rowsToPaginate.length)}</span> of{' '}
                      <span className="font-medium">{rowsToPaginate.length}</span> results
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
