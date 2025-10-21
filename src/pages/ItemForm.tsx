import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, Container, Zone } from '../lib/supabase'
import { ArrowLeft, Save } from 'lucide-react'

interface ContainerWithZone extends Container {
  zone: Zone
}

export const ItemForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  
  const [formData, setFormData] = useState({
    container_id: '',
    item_type: 'card' as 'card' | 'comic',
    grade: null as number | null,
    condition: '',
    quantity: 1,
    price: null as number | null,
    cost: null as number | null,
    description: '',
    // Card specific fields
    player: '',
    team: '',
    manufacturer: '',
    sport: '',
    card_year: new Date().getFullYear(),
    number: '',
    number_out_of: null as number | null,
    number_type: 'single' as 'single' | 'out_of',
    is_rookie: false,
    // Comic specific fields
    title: '',
    publisher: '',
    issue: 1,
    comic_year: new Date().getFullYear()
  })
  const [containers, setContainers] = useState<ContainerWithZone[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  useEffect(() => {
    fetchContainers()
    if (isEdit && id) {
      fetchItem(id)
    }
  }, [isEdit, id])

  const fetchContainers = async () => {
    try {
      const { data, error } = await supabase
        .from('containers')
        .select(`
          *,
          zones (
            id,
            name
          )
        `)
        .order('name')

      if (error) throw error
      setContainers(data || [])
    } catch (error) {
      console.error('Error fetching containers:', error)
    }
  }

  const fetchItem = async (itemId: string) => {
    try {
      setLoading(true)
      
      // Try to fetch from cards table first
      const { data: cardData, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('id', itemId)
        .single()

      if (!cardError && cardData) {
        setFormData({
          container_id: cardData.container_id,
          item_type: 'card',
          grade: cardData.grade,
          condition: cardData.condition || '',
          quantity: cardData.quantity || 1,
          price: cardData.price || null,
          cost: cardData.cost || null,
          description: cardData.description || '',
          // Card specific fields
          player: cardData.player || '',
          team: cardData.team || '',
          manufacturer: cardData.manufacturer || '',
          sport: cardData.sport || '',
          card_year: cardData.year || new Date().getFullYear(),
          number: cardData.number || '',
          number_out_of: cardData.number_out_of || null,
          number_type: cardData.number_out_of ? 'out_of' : 'single',
          is_rookie: cardData.is_rookie || false,
          // Comic specific fields (defaults)
          title: '',
          publisher: '',
          issue: 1,
          comic_year: new Date().getFullYear()
        })
        return
      }

      // Try to fetch from comics table
      const { data: comicData, error: comicError } = await supabase
        .from('comics')
        .select('*')
        .eq('id', itemId)
        .single()

      if (!comicError && comicData) {
        setFormData({
          container_id: comicData.container_id,
          item_type: 'comic',
          grade: comicData.grade,
          condition: comicData.condition || '',
          quantity: comicData.quantity || 1,
          price: comicData.price || null,
          cost: comicData.cost || null,
          description: comicData.description || '',
          // Card specific fields (defaults)
          player: '',
          team: '',
          manufacturer: '',
          sport: '',
          card_year: new Date().getFullYear(),
          number: '',
          number_out_of: null,
          number_type: 'single',
          is_rookie: false,
          // Comic specific fields
          title: comicData.title || '',
          publisher: comicData.publisher || '',
          issue: comicData.issue || 1,
          comic_year: comicData.year || new Date().getFullYear()
        })
        return
      }

      throw new Error('Item not found')
    } catch (error) {
      console.error('Error fetching item:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Check for duplicates before saving
      const hasDuplicate = await checkForDuplicate()
      if (hasDuplicate) {
        setSaving(false)
        return
      }
      const baseData = {
        container_id: formData.container_id,
        grade: formData.grade,
        condition: formData.condition,
        quantity: formData.quantity,
        price: formData.price,
        cost: formData.cost,
        description: formData.description || null
      }

      if (formData.item_type === 'card') {
        const cardData = {
          ...baseData,
          player: formData.player,
          team: formData.team || null,
          manufacturer: formData.manufacturer,
          sport: formData.sport,
          year: formData.card_year,
          number: formData.number,
          number_out_of: formData.number_type === 'out_of' ? formData.number_out_of : null,
          is_rookie: formData.is_rookie
        }

        if (isEdit && id) {
          const { error } = await supabase
            .from('cards')
            .update(cardData)
            .eq('id', id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('cards')
            .insert([cardData])
          if (error) throw error
        }
      } else {
        const comicData = {
          ...baseData,
          title: formData.title,
          publisher: formData.publisher,
          issue: formData.issue,
          year: formData.comic_year
        }

        if (isEdit && id) {
          const { error } = await supabase
            .from('comics')
            .update(comicData)
            .eq('id', id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('comics')
            .insert([comicData])
          if (error) throw error
        }
      }
      navigate('/items')
    } catch (error) {
      console.error('Error saving item:', error)
    } finally {
      setSaving(false)
    }
  }

  const checkForDuplicate = async (): Promise<boolean> => {
    if (!formData.container_id) return false

    try {
      if (formData.item_type === 'card') {
        // Check for duplicate cards in the same container
        const { data: existingCards, error } = await supabase
          .from('cards')
          .select('id')
          .eq('container_id', formData.container_id)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .eq('player', formData.player)
          .eq('team', formData.team)
          .eq('manufacturer', formData.manufacturer)
          .eq('sport', formData.sport)
          .eq('year', formData.card_year)

        if (error) throw error

        // If editing, exclude the current item from the check
        const filteredCards = isEdit && id 
          ? existingCards?.filter(card => card.id !== id) || []
          : existingCards || []

        if (filteredCards.length > 0) {
          setDuplicateError('A card with the same player, team, manufacturer, sport, and year already exists in this container.')
          return true
        }
      } else {
        // Check for duplicate comics in the same container
        const { data: existingComics, error } = await supabase
          .from('comics')
          .select('id')
          .eq('container_id', formData.container_id)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .eq('title', formData.title)
          .eq('publisher', formData.publisher)
          .eq('issue', formData.issue)
          .eq('year', formData.comic_year)

        if (error) throw error

        // If editing, exclude the current item from the check
        const filteredComics = isEdit && id 
          ? existingComics?.filter(comic => comic.id !== id) || []
          : existingComics || []

        if (filteredComics.length > 0) {
          setDuplicateError('A comic with the same title, publisher, issue, and year already exists in this container.')
          return true
        }
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      setDuplicateError('Error checking for duplicates. Please try again.')
      return true
    }

    setDuplicateError(null)
    return false
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    // Clear duplicate error when form data changes
    if (duplicateError) {
      setDuplicateError(null)
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/items')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Items
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {isEdit ? 'Edit Item' : 'Create New Item'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Duplicate Error Message */}
            {duplicateError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Duplicate Item Detected
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {duplicateError}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="item_type" className="block text-sm font-medium text-gray-700">
                Item Type *
              </label>
              <select
                name="item_type"
                id="item_type"
                required
                value={formData.item_type}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="card">Card</option>
                <option value="comic">Comic</option>
              </select>
            </div>

            <div>
              <label htmlFor="container_id" className="block text-sm font-medium text-gray-700">
                Container *
              </label>
              <select
                name="container_id"
                id="container_id"
                required
                value={formData.container_id}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a container</option>
                {containers.map((container) => (
                  <option key={container.id} value={container.id}>
                    {container.name} {container.zone ? `(${container.zone.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
                  Grade
                </label>
                <input
                  type="number"
                  name="grade"
                  id="grade"
                  value={formData.grade || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Grade (optional)"
                />
              </div>
              <div>
                <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                  Condition
                </label>
                <input
                  type="text"
                  name="condition"
                  id="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Mint, Near Mint"
                />
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  id="quantity"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="1"
                />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  id="price"
                  value={formData.price || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
                  Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="cost"
                  id="cost"
                  value={formData.cost || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Description field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Optional notes or description"
              />
            </div>

            {/* Card-specific fields */}
            {formData.item_type === 'card' && (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900">Card Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="player" className="block text-sm font-medium text-gray-700">
                      Player *
                    </label>
                    <input
                      type="text"
                      name="player"
                      id="player"
                      required
                      value={formData.player}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Michael Jordan"
                    />
                  </div>
                  <div>
                    <label htmlFor="team" className="block text-sm font-medium text-gray-700">
                      Team
                    </label>
                    <input
                      type="text"
                      name="team"
                      id="team"
                      value={formData.team}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Chicago Bulls, Los Angeles Lakers"
                    />
                  </div>
                  <div>
                    <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
                      Manufacturer *
                    </label>
                    <input
                      type="text"
                      name="manufacturer"
                      id="manufacturer"
                      required
                      value={formData.manufacturer}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Topps, Panini"
                    />
                  </div>
                  <div>
                    <label htmlFor="sport" className="block text-sm font-medium text-gray-700">
                      Sport *
                    </label>
                    <input
                      type="text"
                      name="sport"
                      id="sport"
                      required
                      value={formData.sport}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Basketball, Football"
                    />
                  </div>
                  <div>
                    <label htmlFor="card_year" className="block text-sm font-medium text-gray-700">
                      Year *
                    </label>
                    <input
                      type="number"
                      name="card_year"
                      id="card_year"
                      required
                      value={formData.card_year}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="2023"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Card Number *
                    </label>
                    <div className="space-y-4">
                      {/* Single Number Option */}
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="number_type"
                          id="number_type_single"
                          value="single"
                          checked={formData.number_type === 'single'}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label htmlFor="number_type_single" className="ml-2 block text-sm text-gray-900">
                          Single Number
                        </label>
                      </div>
                      {formData.number_type === 'single' && (
                        <div className="ml-6">
                          <input
                            type="text"
                            name="number"
                            id="number"
                            required
                            value={formData.number}
                            onChange={handleChange}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="e.g., #23, #1"
                          />
                        </div>
                      )}

                      {/* Out of Number Option */}
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="number_type"
                          id="number_type_out_of"
                          value="out_of"
                          checked={formData.number_type === 'out_of'}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label htmlFor="number_type_out_of" className="ml-2 block text-sm text-gray-900">
                          Number out of Total
                        </label>
                      </div>
                      {formData.number_type === 'out_of' && (
                        <div className="ml-6">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              name="number"
                              id="number_out_of_first"
                              required
                              value={formData.number}
                              onChange={handleChange}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="e.g., 1"
                            />
                            <span className="text-sm text-gray-500">out of</span>
                            <input
                              type="number"
                              name="number_out_of"
                              id="number_out_of_second"
                              required
                              value={formData.number_out_of || ''}
                              onChange={handleChange}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="e.g., 100"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_rookie"
                      id="is_rookie"
                      checked={formData.is_rookie}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_rookie: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_rookie" className="ml-2 block text-sm text-gray-900">
                      Rookie Card
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Comic-specific fields */}
            {formData.item_type === 'comic' && (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900">Comic Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      required
                      value={formData.title}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Amazing Spider-Man"
                    />
                  </div>
                  <div>
                    <label htmlFor="publisher" className="block text-sm font-medium text-gray-700">
                      Publisher *
                    </label>
                    <input
                      type="text"
                      name="publisher"
                      id="publisher"
                      required
                      value={formData.publisher}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Marvel, DC Comics"
                    />
                  </div>
                  <div>
                    <label htmlFor="issue" className="block text-sm font-medium text-gray-700">
                      Issue Number *
                    </label>
                    <input
                      type="number"
                      name="issue"
                      id="issue"
                      required
                      value={formData.issue}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label htmlFor="comic_year" className="block text-sm font-medium text-gray-700">
                      Year *
                    </label>
                    <input
                      type="number"
                      name="comic_year"
                      id="comic_year"
                      required
                      value={formData.comic_year}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="2023"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/items')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : (isEdit ? 'Update Item' : 'Create Item')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
