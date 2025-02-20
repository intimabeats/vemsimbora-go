// src/components/Layout.tsx
import React, { ReactNode, useRef, useState, useEffect } from 'react'
import { MobileNavbar } from './MobileNavbar'
import {
  Home,
  Users,
  Briefcase,
  Settings,
  LogOut,
  CheckCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
    User // Import the User icon
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { LoadingScreen } from './LoadingScreen'
import { getDefaultProfileImage } from '../utils/user'

type Role = 'admin' | 'manager' | 'employee';

type SidebarProps = {
  role: Role;
  isSidebarHidden: boolean; // Receive isSidebarHidden
  toggleSidebar: () => void; // Receive toggleSidebar
}

const Sidebar: React.FC<SidebarProps> = ({ role, isSidebarHidden, toggleSidebar }) => { // Receive props
  const { logout, currentUser } = useAuth()
  const navigate = useNavigate()

  const commonLinks = [
    { icon: Home, label: 'Dashboard', href: `/${role}/dashboard` }
  ]

  const roleSpecificLinks = {
    admin: [
      { icon: Briefcase, label: 'Projetos', href: '/admin/projects' },
      { icon: CheckCircle, label: 'Tarefas', href: '/admin/tasks' },
      { icon: Users, label: 'Usuários', href: '/admin/user-management' },
      { icon: Settings, label: 'Configurações', href: '/admin/settings' },
    ],
    manager: [
      { icon: Briefcase, label: 'Projetos', href: '/manager/projects' },
      { icon: CheckCircle, label: 'Tarefas', href: '/manager/tasks' },
      { icon: Settings, label: 'Configurações', href: '/manager/settings' }
    ],
    employee: [
      { icon: CheckCircle, label: 'Tarefas', href: '/employee/tasks' },
      { icon: Settings, label: 'Configurações', href: '/employee/settings' }
    ]
  }

  const links = [...commonLinks, ...(roleSpecificLinks[role] || [])];

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col bg-white border-r shadow-md h-screen fixed left-0 top-0  transition-all duration-300 ${isSidebarHidden ? 'w-16' : 'w-[calc(64*4px-30px)]'
          } overflow-hidden`}
      >
        {/* Toggle Button (Above Profile) */}
        <button
          onClick={toggleSidebar} // Use the passed toggleSidebar function
          className="p-4 text-gray-600 hover:text-gray-900 flex justify-center items-center"
        >
          {isSidebarHidden ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>

        <div className="p-4 flex-shrink-0">
          {/* Wrap profile image and name in a Link */}
          <Link to={`/profile/${currentUser?.uid}`}>
            <div className={`flex items-center mb-8 ${isSidebarHidden ? 'justify-center' : 'justify-start'}`}>
              <img
                src={currentUser?.photoURL || getDefaultProfileImage(currentUser?.displayName || '')}
                alt="Vem Simbora Logo"
                className="w-12 h-12 rounded-full object-cover"
              />
              {!isSidebarHidden && (
                <>
                  <div className='ml-3'>
                    <h2 className="text-base font-bold text-gray-800">
                      {currentUser?.displayName || 'Usuário'}
                    </h2>
                    <p className="text-sm text-gray-500 capitalize">{role}</p>
                  </div>
                </>
              )}
            </div>
          </Link>
        </div>


        <nav className="flex-1 overflow-y-auto">
          {/* Notification Link (Always Visible) */}
          <Link
            to="/notifications"
            className={`flex items-center py-3 hover:bg-gray-100 rounded-lg transition ${isSidebarHidden ? 'justify-center px-0' : 'px-4'}`}
          >
            <Bell className={`text-gray-500 ${!isSidebarHidden ? 'mr-3' : ''}`} size={20} />
            {!isSidebarHidden && <span className="text-gray-500">Notificações</span>}
          </Link>
          {/* Spacing */}
          <div className="py-4"></div>
          {/* My Profile Link */}
          <Link
            to={`/profile/${currentUser?.uid}`}
            className={`flex items-center py-3  hover:bg-gray-100 rounded-lg transition  ${isSidebarHidden ? 'justify-center px-0' : 'px-4'}`}
          >
            <User className=" text-gray-600" size={20} />
            {!isSidebarHidden && <span className="ml-3 text-gray-700">Meu Perfil</span>}
          </Link>

          {links.map((link, index) => (
            <Link
              key={index}
              to={link.href}
              className={`flex items-center py-3  hover:bg-gray-100 rounded-lg transition  ${isSidebarHidden ? 'justify-center px-0' : 'px-4'}`}
            >
              <link.icon className=" text-gray-600" size={20} />
              {!isSidebarHidden && <span className="ml-3 text-gray-700">{link.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center  py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition ${isSidebarHidden ? 'justify-center' : 'justify-center'}`}
          >
            <LogOut size={20} /> {!isSidebarHidden && <span className="ml-2">Sair</span>}
          </button>
        </div>
      </div>
    </>
  )
}

export const Layout: React.FC<{
  children: ReactNode,
  role?: Role,
  isLoading?: boolean,  // isLoading is now a prop of Layout
  hideNavigation?: boolean;
}> = ({ children, role = 'employee', isLoading = false, hideNavigation = false }) => {

  const mobileNavbarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [isSidebarHidden, setIsSidebarHidden] = useState(true); // Initialize as true

  // Load preference from localStorage on mount
  useEffect(() => {
    const storedPreference = localStorage.getItem('isSidebarHidden');
    setIsSidebarHidden(storedPreference ? storedPreference === 'true' : true); // Default to true if not found
  }, []);

  // Save preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isSidebarHidden', isSidebarHidden.toString());
  }, [isSidebarHidden]);

  const toggleSidebar = () => {
    setIsSidebarHidden(prev => !prev); // Toggle the state
  };

  const isChatRoute = location.pathname.startsWith('/admin/projects/') && location.pathname.endsWith('/chat');
  const isMobile = window.innerWidth < 768;

  return (
    <div className="flex">
      {!hideNavigation && <Sidebar role={role} isSidebarHidden={isSidebarHidden} toggleSidebar={toggleSidebar} />} {/* Pass state and toggle */}
      <main
        className={`
        w-full bg-gray-50 min-h-screen
        ${!hideNavigation ? (isSidebarHidden ? 'md:ml-16' : 'md:ml-[calc(64*4px-30px)]') : ''}
        transition-all duration-300
        ${!hideNavigation && !isChatRoute && isMobile ? 'pb-16' : ''}
      `}
      >
        {isLoading ? <LoadingScreen /> : children}
      </main>
      {(!hideNavigation && !isChatRoute && isMobile) && <MobileNavbar ref={mobileNavbarRef} role={role} />}
    </div>
  )
}
