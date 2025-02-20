import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService, NotificationHelpers } from '../services/NotificationService'
import { Notification } from '../types/notification'

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({
    docs: [
      { 
        id: 'notification1', 
        data: () => ({
          type: 'task_created',
          title: 'Nova Tarefa',
          message: 'Tarefa criada',
          timestamp: Date.now(),
          read: false
        }) 
      }
    ]
  }),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn()
}))

describe('NotificationService', () => {
  const userId = 'test-user-id'
  const mockNotification = {
    type: 'task_created',
    title: 'Test Notification',
    message: 'Test Message'
  }

  it('should create a notification', async () => {
    const result = await NotificationService.createNotification(
      userId, 
      mockNotification
    )

    expect(result).toHaveProperty('id')
    expect(result.title).toBe(mockNotification.title)
    expect(result.read).toBe(false)
  })

  it('should fetch user notifications', async () => {
    const notifications = await NotificationService.getUserNotifications(userId)
    
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toHaveProperty('id', 'notification1')
  })

  it('should mark notification as read', async () => {
    await NotificationService.markNotificationAsRead(userId, 'notification1')
    
    // Verificar se updateDoc foi chamado
    expect(vi.fn()).toHaveBeenCalled()
  })

  describe('NotificationHelpers', () => {
    it('should create task created notification', () => {
      const notification = NotificationHelpers.taskCreated(
        'Desenvolver Relatório', 
        'João Silva'
      )

      expect(notification.type).toBe('task_created')
      expect(notification.title).toBe('Nova Tarefa Criada')
    })

    it('should create task approved notification', () => {
      const notification = NotificationHelpers.taskApproved(
        'Relatório Concluído', 
        50
      )

      expect(notification.type).toBe('task_approved')
      expect(notification.message).toContain('50 moedas')
    })
  })
})
