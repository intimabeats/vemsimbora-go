import React, { useState, useEffect } from 'react'
    import { Layout } from '../components/Layout'
    import { Bell, CheckCircle, AlertTriangle, XCircle } from 'lucide-react' // Import more icons
    import { NotificationService } from '../services/NotificationService'
    import { useAuth } from '../context/AuthContext'
    import { NotificationSchema } from '../types/firestore-schema'
    import { Link } from 'react-router-dom'

    export const Notifications: React.FC = () => {
      const [notifications, setNotifications] = useState<NotificationSchema[]>([])
      const [isLoading, setIsLoading] = useState(true)
      const { currentUser } = useAuth()

      useEffect(() => {
        const fetchNotifications = async () => {
          setIsLoading(true)
          try {
            if (currentUser) {
              const userNotifications = await NotificationService.getUserNotifications(currentUser.uid)
              setNotifications(userNotifications)
            }
          } catch (error) {
            console.error('Erro ao buscar notificações:', error)
            // Handle error appropriately, e.g., show an error message to the user
          } finally {
            setIsLoading(false)
          }
        }

        fetchNotifications()
      }, [currentUser])

      const handleMarkAllAsRead = async () => {
        try {
          if (currentUser) {
            await NotificationService.markAllNotificationsAsRead(currentUser.uid)
            // Refresh notifications after marking all as read
            const updatedNotifications = await NotificationService.getUserNotifications(currentUser.uid)
            setNotifications(updatedNotifications)
          }
        } catch (error) {
          console.error('Erro ao marcar todas as notificações como lidas:', error)
        }
      }

      // Helper function to get icon and color based on notification type
      const getNotificationStyle = (type: NotificationSchema['type']) => {
        switch (type) {
          case 'task_created':
            return { icon: <CheckCircle className="text-green-500" />, color: 'bg-green-100' };
          case 'task_assigned':
            return { icon: <CheckCircle className="text-blue-500" />, color: 'bg-blue-100' };
          case 'task_updated':
            return { icon: <AlertTriangle className="text-yellow-500" />, color: 'bg-yellow-100' };
          case 'task_completed':
            return { icon: <CheckCircle className="text-green-500" />, color: 'bg-green-100' };
          case 'project_update':
            return { icon: <Bell className="text-blue-500" />, color: 'bg-blue-100' };
          case 'reward_earned':
            return { icon: <CheckCircle className="text-yellow-500" />, color: 'bg-yellow-100' };
          case 'system_alert':
            return { icon: <XCircle className="text-red-500" />, color: 'bg-red-100' };
          default:
            return { icon: <Bell className="text-gray-500" />, color: 'bg-gray-100' };
        }
      };

      return (
        <Layout role={currentUser?.role} isLoading={isLoading}>
          <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
                <Bell className="mr-3 text-blue-600" />
                Notificações
              </h1>
              <button
                onClick={handleMarkAllAsRead}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
                disabled={notifications.every(n => n.read)}
              >
                <CheckCircle className="mr-2" />
                Marcar Todas como Lidas
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-6 text-center">
                <p className="text-gray-500">Nenhuma notificação encontrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => {
                  const { icon, color } = getNotificationStyle(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-center ${color} p-4 rounded-lg shadow-md ${notification.read ? 'opacity-70' : ''
                        }`}
                    >
                      <div className="mr-4">{icon}</div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                          {notification.title}
                        </h2>
                        <p className="text-gray-600">{notification.message}</p>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.timestamp).toLocaleString()}
                        </span>
                        {/* Example of linking to a task - adjust as needed */}
                        {notification.relatedEntityId && (
                          <Link
                            to={`/task/${notification.relatedEntityId}`} // Replace with your actual route
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Ver Tarefa
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Layout>
      )
    }
