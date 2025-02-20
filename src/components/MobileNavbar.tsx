import React, { useState, forwardRef } from 'react' // Corrected: Added forwardRef
        import {
          Home,
          Briefcase,
          Settings,
          CheckCircle,
          Users as UsersIcon,
            Bell
        } from 'lucide-react'
        import { useNavigate } from 'react-router-dom'
        import { useAuth } from '../context/AuthContext'

        type Role = 'admin' | 'manager' | 'employee';

        interface MobileNavbarProps {
            role: Role;
        }

        // Corrected: Wrapped with forwardRef
        export const MobileNavbar = forwardRef<HTMLDivElement, MobileNavbarProps>(({role}, ref) => { //destructured here
          const navigate = useNavigate()
          const { currentUser } = useAuth()
          const [activeTab, setActiveTab] = useState('dashboard')

          // Definir itens de menu com base na role do usuário
          const getNavItems = (role: Role | undefined) => {
              const commonItems = [
              {
                  icon: Home,
                  label: 'Dashboard',
                  route: `/${role}/dashboard`,
                  key: 'dashboard'
              },
              {
                icon: Bell,
                label: 'Notificações',
                route: '/notifications',
                key: 'notifications'
              }
              ]

              const roleSpecificItems = {
              admin: [
                  {
                  icon: UsersIcon,
                  label: 'Usuários',
                  route: '/admin/user-management',
                  key: 'users'
                  },
                  {
                  icon: Briefcase,
                  label: 'Projetos',
                  route: '/admin/projects',
                  key: 'projects'
                  },
                  {
                  icon: CheckCircle,
                  label: 'Tarefas',
                  route: '/admin/tasks',
                  key: 'tasks'
                  },
                  {
                  icon: Settings,
                  label: 'Configurações',
                  route: '/admin/settings',
                  key: 'settings'
                  }
              ],
              manager: [
                  {
                  icon: Briefcase,
                  label: 'Projetos',
                  route: '/manager/projects',
                  key: 'projects'
                  },
                  {
                  icon: CheckCircle,
                  label: 'Tarefas',
                  route: '/manager/tasks',
                  key: 'tasks'
                  },
                  {
                  icon: Settings,
                  label: 'Configurações',
                  route: '/manager/settings',
                  key: 'settings'
                  }
              ],
              employee: [
                  {
                  icon: CheckCircle,
                  label: 'Tarefas',
                  route: '/employee/tasks',
                  key: 'tasks'
                  },
                  {
                  icon: Settings,
                  label: 'Configurações',
                  route: '/employee/settings',
                  key: 'settings'
                  }
              ]
              }
                  if (role) {
                      return [...commonItems, ...(roleSpecificItems[role] || [])];
                  }

                  return [...commonItems];
          }

          const navItems = getNavItems(role)

          const handleNavigation = (route: string, key: string) => {
              setActiveTab(key)
              navigate(route)
          }

          return (
            // Added ref here
            <nav ref={ref} className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t z-50 md:hidden h-14">
              <div className="grid grid-cols-5 py-2">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleNavigation(item.route, item.key)}
                    className={`flex flex-col items-center justify-center ${activeTab === item.key
                      ? 'text-blue-600'
                      : 'text-gray-500'
                    }`}
                  >
                    <item.icon
                      size={24}
                      strokeWidth={activeTab === item.key ? 2.5 : 1.5}
                    />
                    <span className="text-xs mt-1">{item.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          )
        })
