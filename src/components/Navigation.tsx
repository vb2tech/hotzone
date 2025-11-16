import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  MapPin, 
  Package, 
  Layers, 
  LogOut,
  Menu,
  X,
  Settings,
  UserPlus,
  ChevronDown
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Zones', href: '/zones', icon: MapPin },
  { name: 'Containers', href: '/containers', icon: Package },
  { name: 'Items', href: '/items', icon: Layers },
]

export const Navigation: React.FC = () => {
  const { signOut, accounts, switchAccount, user, setShowAddAccount } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [switchAccountsOpen, setSwitchAccountsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
  }

  const handleSwitchAccount = async (userId: string) => {
    await switchAccount(userId)
    setSwitchAccountsOpen(false)
    setDropdownOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
        setSwitchAccountsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const otherAccounts = accounts.filter(acc => acc.userId !== user?.id)
  const hasMultipleAccounts = accounts.length > 1

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900">
                Hotzone
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-4 w-4" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1" role="menu">
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <div className="flex items-center">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </div>
                    </button>
                    {hasMultipleAccounts ? (
                      <>
                        <div className="border-t border-gray-100"></div>
                        <div>
                          <button
                            onClick={() => setSwitchAccountsOpen(!switchAccountsOpen)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                          >
                            <div className="flex items-center justify-between">
                              <span>Switch Accounts</span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${switchAccountsOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </button>
                          {switchAccountsOpen && (
                            <div className="pl-4">
                              {accounts.map((account) => (
                                <button
                                  key={account.userId}
                                  onClick={() => handleSwitchAccount(account.userId)}
                                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                    account.userId === user?.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                  }`}
                                  role="menuitem"
                                >
                                  <div className="flex items-center">
                                    <div className="flex-1">
                                      <div className="font-medium">{account.email}</div>
                                      {account.userId === user?.id && (
                                        <div className="text-xs text-blue-600">Current</div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="border-t border-gray-100"></div>
                        <button
                          onClick={() => {
                            setDropdownOpen(false)
                            setShowAddAccount(true)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                        >
                          <div className="flex items-center">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Account
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </div>
                </Link>
              )
            })}
            <div className="border-t border-gray-200 pt-2">
              <button
                onClick={handleSignOut}
                className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
              >
                <div className="flex items-center">
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign out
                </div>
              </button>
              {hasMultipleAccounts ? (
                <div className="pl-3 pr-4 py-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Switch Accounts</div>
                  {accounts.map((account) => (
                    <button
                      key={account.userId}
                      onClick={() => handleSwitchAccount(account.userId)}
                      className={`block w-full text-left py-2 px-2 rounded text-sm ${
                        account.userId === user?.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {account.email}
                      {account.userId === user?.id && ' (Current)'}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowAddAccount(true)
                  }}
                  className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                >
                  <div className="flex items-center">
                    <UserPlus className="h-4 w-4 mr-3" />
                    Add Account
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
