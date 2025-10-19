import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Container, Zone } from '../lib/supabase'
import { Package, Plus, Edit, Trash2, MapPin, Flame, QrCode, Printer, X } from 'lucide-react'
import QRCodeLib from 'qrcode'

interface ContainerWithZone extends Container {
  zone: Zone
}

export const ContainersPage: React.FC = () => {
  const [containers, setContainers] = useState<ContainerWithZone[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCodeModal, setQrCodeModal] = useState<{ container: ContainerWithZone; qrCodeDataUrl: string } | null>(null)

  useEffect(() => {
    fetchContainers()
  }, [])

  const fetchContainers = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('containers')
        .select(`
          *,
          zones (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const containersWithZones = data?.map(container => ({
        ...container,
        zone: container.zones
      })) || []
      
      setContainers(containersWithZones)
    } catch (error) {
      console.error('Error fetching containers:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteContainer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this container?')) return

    try {
      const { error } = await supabase.from('containers').delete().eq('id', id)
      if (error) throw error
      fetchContainers()
    } catch (error) {
      console.error('Error deleting container:', error)
    }
  }

  const generateQRCode = async (container: ContainerWithZone) => {
    try {
      // Generate the URL for the container view page
      const containerUrl = `https://vb2tech.github.io/hotzone/#/containers/${container.id}`
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCodeLib.toDataURL(containerUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeModal({ container, qrCodeDataUrl })
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const printQRCode = () => {
    if (!qrCodeModal) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Container QR Code - ${qrCodeModal.container.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
            }
            .container-info {
              margin-bottom: 20px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="container-info">
            <h2>${qrCodeModal.container.name}</h2>
            <p>Zone: ${qrCodeModal.container.zone?.name || 'Unknown'}</p>
          </div>
          <div class="qr-code">
            <img src="${qrCodeModal.qrCodeDataUrl}" alt="QR Code for ${qrCodeModal.container.name}" />
          </div>
          <div class="instructions">
            <p><strong>Scan this QR code to view container contents</strong></p>
            <p>This QR code links to: ${window.location.origin}/containers/${qrCodeModal.container.id}</p>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Containers</h1>
          <p className="mt-2 text-gray-600">Manage your storage containers</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/containers/heatmap"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Flame className="h-4 w-4 mr-2" />
            Heat Map
          </Link>
          <Link
            to="/containers/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Container
          </Link>
        </div>
      </div>

      {containers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {containers.map((container) => (
            <div key={container.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => generateQRCode(container)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </button>
                  <Link
                    to={`/containers/${container.id}/edit`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteContainer(container.id)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No containers</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new container.</p>
          <div className="mt-6">
            <Link
              to="/containers/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Container
            </Link>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                QR Code for {qrCodeModal.container.name}
              </h3>
              <button
                onClick={() => setQrCodeModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="mb-4">
                <img 
                  src={qrCodeModal.qrCodeDataUrl} 
                  alt={`QR Code for ${qrCodeModal.container.name}`}
                  className="mx-auto"
                />
              </div>
              <div className="mb-4 text-sm text-gray-600">
                <p><strong>Container:</strong> {qrCodeModal.container.name}</p>
                <p><strong>Zone:</strong> {qrCodeModal.container.zone?.name || 'Unknown'}</p>
                <p className="mt-2">
                  <strong>URL:</strong> {window.location.origin}/containers/{qrCodeModal.container.id}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={printQRCode}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print QR Code
                </button>
                <button
                  onClick={() => setQrCodeModal(null)}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
