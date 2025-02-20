// src/services/ProjectService.ts
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore'
import { auth } from '../config/firebase'
import { ProjectSchema } from '../types/firestore-schema'
import { activityService } from './ActivityService'; // Import

export class ProjectService {
  private db = getFirestore()

  // Criar novo projeto
  async createProject(projectData: Omit<ProjectSchema, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const projectRef = doc(collection(this.db, 'projects'))

      const newProject: ProjectSchema = {
        id: projectRef.id,
        ...projectData,
        createdBy: auth.currentUser?.uid || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        commentTabs: [  //Keep for future use
          {
            id: 'general',
            name: 'Geral',
            comments: []
          }
        ],
        messages: [] // Initialize messages here
      }

      await setDoc(projectRef, newProject)

      // Log activity
      await activityService.logActivity({
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown User',
        type: 'project_created',
        projectId: newProject.id,
        projectName: newProject.name, // Store the project NAME
      });


      return newProject
    } catch (error) {
      console.error('Erro ao criar projeto:', error)
      throw error
    }
  }
async addProjectMessage(
  projectId: string, 
  message: {
    id: string
    userId: string
    userName: string
    content: string
    timestamp: number
    attachments?: any[]
    messageType?: 'task_submission' | 'task_approval' | 'general'; // Type of message
    originalMessageId?: string
  }
) {
  try {
    const projectRef = doc(this.db, 'projects', projectId)
    const projectDoc = await getDoc(projectRef)
    
    if (!projectDoc.exists()) {
      throw new Error('Projeto não encontrado')
    }

    const projectData = projectDoc.data()
    const messages = projectData.messages || []

    await updateDoc(projectRef, {
      messages: [...messages, message],
      updatedAt: Date.now()
    })

    return message
  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error)
    throw error
  }
}

// NEW: Add a system message, handling updates for existing messages
async addSystemMessageToProjectChat(
    projectId: string,
    message: {
        userId: string;
        userName: string;
        content: string;
        timestamp: number;
        attachments?: any[];
        messageType: 'task_submission' | 'task_approval' | 'general';
        originalMessageId?: string; // ID of the original message, if this is an update
        quotedMessage?: { userName: string; content: string; attachments?: any[] };
    }
): Promise<void> {
    try {
        const projectRef = doc(this.db, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);

        if (!projectDoc.exists()) {
            throw new Error('Project not found');
        }

        const projectData = projectDoc.data() as ProjectSchema;
        let messages = projectData.messages || [];

        if (message.originalMessageId) {
            // This is an UPDATE to an existing message
            messages = messages.map((msg: any) =>
                msg.id === message.originalMessageId ? { ...msg, content: message.content, timestamp: message.timestamp } : msg
            );
        } else {
            // This is a NEW message
            messages = [...messages, { ...message, id: Date.now().toString() }]; // Assign a unique ID
        }

        await updateDoc(projectRef, {
            messages: messages,
            updatedAt: Date.now(),
        });
    } catch (error) {
        console.error('Error adding system message:', error);
        throw error;
    }
}

	async getProjectMessages(projectId: string): Promise<any[]> {
  try {
    const projectRef = doc(this.db, 'projects', projectId)
    const projectDoc = await getDoc(projectRef)
    
    if (!projectDoc.exists()) {
      throw new Error('Projeto não encontrado')
    }

    const projectData = projectDoc.data()
    return projectData.messages || []
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error)
    throw error
  }
}
  // Atualizar projeto
  async updateProject(projectId: string, updates: Partial<ProjectSchema>) {
    try {
      const projectRef = doc(this.db, 'projects', projectId)

      await updateDoc(projectRef, {
        ...updates,
        updatedAt: Date.now()
      })

      // Fetch and return updated project
      const updatedDoc = await getDoc(projectRef)
      const updatedProjectData =  { id: updatedDoc.id, ...updatedDoc.data() } as ProjectSchema

      // Log activity for project update
      await activityService.logActivity({
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown User',
        type: 'project_updated',
        projectId: projectId,
        projectName: updatedProjectData.name, // Use updated name
        details: `Project updated.`, // You can add more details here if needed
      });
      return updatedProjectData
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error)
      throw error
    }
  }

  // Excluir projeto
  async deleteProject(projectId: string) {
    try {
      const projectRef = doc(this.db, 'projects', projectId)
      await deleteDoc(projectRef)
    } catch (error) {
      console.error('Erro ao excluir projeto:', error)
      throw error
    }
  }

 // Buscar projetos com paginação e filtros
async fetchProjects(options?: {
  status?: ProjectSchema['status'];
  excludeStatus?: ProjectSchema['status']; // Add excludeStatus
  limit?: number;
  page?: number;
}) {
  try {
    let q = query(collection(this.db, 'projects'));

    // Filtros
    if (options?.status) {
      q = query(q, where('status', '==', options.status)); // Apply status filter
    }

    // Exclude status (for "Todos os Status" to exclude "archived")
    if (options?.excludeStatus) {
      q = query(q, where('status', '!=', options.excludeStatus)); // Apply excludeStatus filter
    }
    // Apply BOTH filters if BOTH are present.  Previous code only applied one.

    // Ordenação
    q = query(q, orderBy('createdAt', 'desc'));

    // Executar consulta
    const snapshot = await getDocs(q);
    const allProjects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProjectSchema));

    // Paginação
    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedProjects = allProjects.slice(startIndex, endIndex);
    const totalPages = Math.ceil(allProjects.length / limit);

    return {
      data: paginatedProjects,
      totalPages,
      totalProjects: allProjects.length
    };
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    throw error;
  }
}

  // Buscar projeto por ID
  async getProjectById(projectId: string): Promise<ProjectSchema> {
    try {
      const projectRef = doc(this.db, 'projects', projectId)
      const projectSnap = await getDoc(projectRef)

      if (projectSnap.exists()) {
        return {
          id: projectSnap.id,
          ...projectSnap.data()
        } as ProjectSchema
      } else {
        throw new Error('Projeto não encontrado')
      }
    } catch (error) {
      console.error('Erro ao buscar projeto por ID:', error)
      throw error
    }
  }

  // Adicionar comentário ao projeto
  async addProjectComment(
    projectId: string, 
    tabId: string, 
    comment: {
      userId: string, 
      userName: string, 
      content: string, 
      timestamp: number,
      attachments?: any[]
    }
  ) {
    try {
      const projectRef = doc(this.db, 'projects', projectId)
      const projectDoc = await getDoc(projectRef)
      
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado')
      }

      const projectData = projectDoc.data() as ProjectSchema
      const commentTabs = projectData.commentTabs || []

      const updatedTabs = commentTabs.map(tab => {
        if (tab.id === tabId) {
          return {
            ...tab,
            comments: [...(tab.comments || []), comment]
          }
        }
        return tab
      })

      await updateDoc(projectRef, {
        commentTabs: updatedTabs,
        updatedAt: Date.now()
      })

      return updatedTabs
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
      throw error
    }
  }

    // Arquivar projeto
    async archiveProject(projectId: string): Promise<void> {
        try {
            const projectRef = doc(this.db, 'projects', projectId);
            await updateDoc(projectRef, {
                status: 'archived',
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('Error archiving project:', error);
            throw error;
        }
    }

    // Desarquivar projeto
    async unarchiveProject(projectId: string): Promise<void> {
        try {
            const projectRef = doc(this.db, 'projects', projectId);
            await updateDoc(projectRef, {
                status: 'planning', // Or any other default status
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('Error unarchiving project:', error);
            throw error;
        }
    }
}

export const projectService = new ProjectService()
