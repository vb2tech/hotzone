import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, Zone } from '../lib/supabase'
import { ArrowLeft, Save } from 'lucide-react'

export const ContainerForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  
  const [formData, setFormData] = useState({
    name: '',
    zone_id: ''
  })
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchZones()
    if (isEdit && id) {
      fetchContainer(id)
    }
  }, [isEdit, id])

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('name')

      if (error) throw error
      setZones(data || [])
    } catch (error) {
      console.error('Error fetching zones:', error)
    }
  }

  const fetchContainer = async (containerId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('containers')
        .select('*')
        .eq('id', containerId)
        .single()

      if (error) throw error
      setFormData({
        name: data.name,
        zone_id: data.zone_id
      })
    } catch (error) {
      console.error('Error fetching container:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (isEdit && id) {
        const { data, error } = await supabase
          .from('containers')
          .update(formData)
          .eq('id', id)
          .select()
        
        if (error) {
          console.error('Update error:', error)
          alert(`Failed to update container: ${error.message}`)
          throw error
        }
        console.log('Container updated successfully:', data)
      } else {
        const { data, error } = await supabase
          .from('containers')
          .insert([formData])
          .select()
        
        if (error) {
          console.error('Insert error:', error)
          alert(`Failed to create container: ${error.message}`)
          throw error
        }
        console.log('Container created successfully:', data)
      }
      navigate('/containers')
    } catch (error) {
      console.error('Error saving container:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
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
          onClick={() => navigate('/containers')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Containers
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {isEdit ? 'Edit Container' : 'Create New Container'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Container Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Card Box 1, Comic Shelf A, Storage Bin"
              />
            </div>

            <div>
              <label htmlFor="zone_id" className="block text-sm font-medium text-gray-700">
                Zone *
              </label>
              <select
                name="zone_id"
                id="zone_id"
                required
                value={formData.zone_id}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>


            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/containers')}
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
                {saving ? 'Saving...' : (isEdit ? 'Update Container' : 'Create Container')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
