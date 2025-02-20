import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import {
  BarChart2,
  CheckCircle,
  Clock,
  MessageCircle,
  File,
  Image,
  Video,
  FileText,
  Download,
  ArrowLeft,
  Music,
  Plus,
  Edit
} from 'lucide-react'
import { projectService } from '../../services/ProjectService'
import { taskService } from '../../services/TaskService'
import { userManagementService } from '../../services/UserManagementService'
import { useAuth } from '../../context/AuthContext'
import { ProjectSchema, TaskSchema } from '../../types/firestore-schema'
import { getDefaultProfileImage } from '../../utils/user'
import { Link } from 'react-router-dom'

// FileItem Component
const FileItem: React.FC<{
  attachment: {
    id: string
    name: string
    url: string
    type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio'
    size?: number
  }
}> = ({ attachment }) => {
  const getAttachmentIcon = () => {
    switch (attachment.type) {
      case 'image':
        return <Image size={48} className="text-gray-600" />;
      case 'video':
        return <Video size={48} className="text-gray-600" />;
      case 'document':
        return <FileText size={48} className="text-gray-600" />;
      case 'audio':
        return <Music size={48} className="text-gray-600" />;
      default:
        return <File size={48} className="text-gray-600" />;
    }
  };

  return (
    <div className="flex flex-col items-center w-48 p-4 bg-white rounded-lg shadow-md border">
      {getAttachmentIcon()}
      <a
        href={attachment.url}
        download={attachment.name}
        className="mt-2 text-sm text-gray-700 hover:underline truncate text-center"
        title={attachment.name}
      >
        {attachment.name}
      </a>
      <a
        href={attachment.url}
        download={attachment.name}
        className="mt-2 px-4 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center"
      >
        <Download size={14} />
      </a>
    </div>
  )
}

export const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectSchema | null>(null)
  const [tasks, setTasks] = useState<TaskSchema[]>([])
  const [users, setUsers] = useState<{ [key: string]: { name: string, profileImage?: string } }>({})
  const [attachments, setAttachments] = useState<any[]>([]);

  // Load project data
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        if (!projectId) {
          throw new Error('Project ID is required')
        }

        setIsLoading(true)
        setError(null)

        const projectData = await projectService.getProjectById(projectId)
        const tasksResponse = await taskService.fetchTasks({ projectId: projectId })
        const usersResponse = await userManagementService.fetchUsers()

        const userMap = usersResponse.data.reduce((acc, user) => {
          acc[user.id] = { name: user.name, profileImage: user.profileImage };
          return acc;
        }, {} as { [key: string]: { name: string; profileImage?: string } })

        const projectMessages = await projectService.getProjectMessages(projectId);
        const extractedAttachments = projectMessages.reduce((acc: any[], message) => {
          if (message.attachments && message.attachments.length > 0) {
            return acc.concat(message.attachments);
          }
          return acc;
        }, []);

        setProject(projectData)
        setTasks(tasksResponse.data)
        setUsers(userMap)
        setAttachments(extractedAttachments);

      } catch (err: any) {
        console.error('Error loading project data:', err)
        setError(err.message || 'Failed to load project details')
      } finally {
        setIsLoading(false)
      }
    }

    loadProjectData()
  }, [projectId])

  // Access control
  const canViewProject = () => {
    if (!currentUser) return false
    if (currentUser.role === 'admin') return true
    if (
      currentUser.role === 'manager' &&
      project?.managers.includes(currentUser.uid)
    ) return true
    return false
  }

  // Calculation methods
  const calculateProjectProgress = () => {
    if (!tasks.length) return 0
    const completedTasks = tasks.filter(task => task.status === 'completed').length
    return Math.round((completedTasks / tasks.length) * 100)
  }

  const getProjectManagerNames = () => {
    if (!project || !project.managers) {
      return 'Sem gestores';
    }
    return project.managers
      .map(managerId => {
        const manager = users[managerId];
        return manager ? manager.name : `Unknown User (${managerId})`;
      })
      .join(', ');
  };

  if (isLoading) {
    return <Layout role="admin" isLoading={true} />
  }

  if (error) {
    return (
      <Layout role="admin" isLoading={false}>
        <div className="container mx-auto p-6">
          {project ? (
            <>
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {project.name || 'Projeto sem nome'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                      {project.description || 'Sem descrição'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <StatusBadge status={project.status || 'planning'} />
                    <button
                      onClick={() => navigate(`/admin/projects/${project.id}/chat`)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <MessageCircle className="mr-2" size={20} />
                      Chat do Projeto
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <span className="text-sm text-gray-500">Data de Início</span>
                    <p className="font-medium">
                      {new Date(project.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  {project.endDate && (
                    <div>
                      <span className="text-sm text-gray-500">Data de Término</span>
                      <p className="font-medium">
                        {new Date(project.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-500">Gestores</span>
                    <div className="flex items-center mt-1">
                      {project.managers.map((managerId) => {
                        const manager = users[managerId];
                        return (
                          <div key={managerId} className="relative w-8 h-8 rounded-full overflow-hidden mr-2">
                            <img
                              src={manager?.profileImage || getDefaultProfileImage(manager?.name)}
                              alt={manager?.name || 'Unknown Manager'}
                              className='object-cover w-full h-full'
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Progresso do Projeto</span>
                    <span className="text-sm font-medium text-blue-600">
                      {calculateProjectProgress()}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${calculateProjectProgress()}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
              Projeto não encontrado
            </div>
          )}
        </div>
      </Layout>
    )
  }

  if (!canViewProject()) {
    return (
      <Layout role="admin" isLoading={false}>
        <div className="container mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Acesso Negado: </strong>
            <span className="block sm:inline">Você não tem permissão para visualizar este projeto</span>
          </div>
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout role="admin" isLoading={false}>
        <div className="container mx-auto p-6">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Aviso: </strong>
            <span className="block sm:inline">Projeto não encontrado</span>
          </div>
        </div>
      </Layout>
    )
  }

  const StatusBadge: React.FC<{ status: ProjectSchema['status'] }> = ({ status }) => {
    const statusStyles = {
      planning: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      paused: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      archived: 'bg-gray-400 text-white'
    }

    const statusLabels = {
      planning: 'Planejamento',
      active: 'Ativo',
      completed: 'Concluído',
      paused: 'Pausado',
      cancelled: 'Cancelado',
      archived: 'Arquivado'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  return (
    <Layout role="admin" isLoading={false}>
      <div className="container mx-auto p-6">
        {/* Back Button */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/admin/projects')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2" /> Voltar para Projetos
          </button>
          <button
            onClick={() => navigate(`/admin/projects/${project.id}/chat`)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <MessageCircle className="mr-2" size={20} />
            Chat do Projeto
          </button>
        </div>

        {/* Project Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">

          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600 mt-2">{project.description}</p>
            </div>
            <div className="flex items-center space-x-4">
              <StatusBadge status={project.status} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <span className="text-sm text-gray-500">Data de Início</span>
              <p className="font-medium">
                {new Date(project.startDate).toLocaleDateString()}
              </p>
            </div>
            {project.endDate && (
              <div>
                <span className="text-sm text-gray-500">Data de Término</span>
                <p className="font-medium">
                  {new Date(project.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-500">Gestores</span>
              <div className="flex items-center mt-1">
                {project.managers.map((managerId) => {
                  const manager = users[managerId];
                  return (
                    <div key={managerId} className="relative w-8 h-8 rounded-full overflow-hidden mr-2">
                      <img
                        src={manager?.profileImage || getDefaultProfileImage(manager?.name)}
                        alt={manager?.name || 'Unknown Manager'}
                        className='object-cover w-full h-full'
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Progresso do Projeto</span>
              <span className="text-sm font-medium text-blue-600">
                {calculateProjectProgress()}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${calculateProjectProgress()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <CheckCircle className="mr-2 text-blue-600" /> Tarefas do Projeto
            </h2>
            {/* Create Task Button - Link to the new page */}
            <Link
              to={`/admin/projects/${projectId}/create-task`}
              className="bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition flex items-center"
            >
              <Plus size={20} />
            </Link>
          </div>

          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhuma tarefa encontrada</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">
                      <Link to={`/tasks/${task.id}`} className="hover:underline">
                        {task.title}
                      </Link>
                    </h3>
                    {/* Add Edit Icon Here */}
                    <Link
                        to={`/admin/projects/${projectId}/edit-task/${task.id}`}
                        className="text-blue-500 hover:text-blue-700"
                        title="Editar Tarefa"
                    >
                        <Edit size={20} />
                    </Link>
                    <span className={`
                      px-2 py-1 rounded-full text-xs
                      ${task.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }
                    `}>
                      {task.status === 'completed' ? 'Concluída' : 'Em Andamento'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Prazo: {new Date(task.dueDate).toLocaleDateString()}</span>
                    <span>Recompensa: {task.coinsReward} moedas</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Files Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <File className="mr-2 text-blue-600" /> Arquivos do Projeto
          </h2>
          {attachments.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum arquivo encontrado</p>
          ) : (
            <div className="flex space-x-4 overflow-x-auto -mx-6 px-6">
              {attachments.map((attachment: any) => (
                <FileItem key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
