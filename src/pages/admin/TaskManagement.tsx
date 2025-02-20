import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/Layout'
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from 'lucide-react'
import { taskService } from '../../services/TaskService'
import { projectService } from '../../services/ProjectService'
import { userManagementService } from '../../services/UserManagementService'
import { TaskSchema, ProjectSchema } from '../../types/firestore-schema'
import { CreateTaskModal } from '../../components/modals/CreateTaskModal'
import { EditTaskModal } from '../../components/modals/EditTaskModal'
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal'
import { Link } from 'react-router-dom'
import useDebounce from '../../utils/useDebounce';

export const TaskManagement: React.FC = () => {
  // Estados
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<TaskSchema[]>([])
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([])
  const [users, setUsers] = useState<{ [key: string]: string }>({})

  // Estados de modal
  const [selectedTask, setSelectedTask] = useState<TaskSchema | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Estados de filtro e paginação
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce the search term

  // State for project filter
  const [filter, setFilter] = useState<{ status?: ProjectSchema['status'] }>({});


  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ITEMS_PER_PAGE = 9

  // useCallback to prevent unnecessary re-renders of fetchProjects
  // Pass filter as a parameter
  const fetchProjects = useCallback(async (filter: { status?: ProjectSchema['status'] }) => {
    try {
      setIsLoading(true); // Correctly use setIsLoading here
      const options: {
        status?: ProjectSchema['status'];
        excludeStatus?: ProjectSchema['status'];
        limit: number;
        page: number;
      } = {
        limit: ITEMS_PER_PAGE,
        page: currentPage,
      };

      if (filter.status) {
        options.status = filter.status;
      } else {
        options.excludeStatus = 'archived'; // Exclude archived by default
      }

      const fetchedProjects = await projectService.fetchProjects(options);
      setProjects(fetchedProjects.data);
      setTotalPages(fetchedProjects.totalPages);

    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
    } finally {
      setIsLoading(false); // And here
    }
  }, [currentPage, ITEMS_PER_PAGE, setIsLoading]); // Add setIsLoading to dependencies

  useEffect(() => {
    fetchProjects(filter) // Pass filter here
  }, [filter, currentPage, debouncedSearchTerm, fetchProjects]); // Use debouncedSearchTerm


  const handleDeleteProject = async () => {
    if (!selectedProject) return

    try {
      await projectService.deleteProject(selectedProject.id)
      setProjects(prevProjects =>
        prevProjects.filter(project => project.id !== selectedProject.id)
      )
      setSelectedProject(null)
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('Erro ao excluir projeto:', error)
    }
  }

  const handleEditProject = (project: ProjectSchema) => {
    setSelectedProject(project)
    setIsEditModalOpen(true)
  }

  const handleDeleteConfirmation = (project: ProjectSchema) => {
    setSelectedProject(project)
    setIsDeleteModalOpen(true)
  }

  const handleProjectCreated = (newProject: ProjectSchema) => {
    setProjects(prevProjects => [newProject, ...prevProjects])
  }

  const handleProjectUpdated = (updatedProject: ProjectSchema) => {
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === updatedProject.id ? updatedProject : project
      )
    )
  }

  const handleArchiveProject = async (projectId: string) => {
    try {
      await projectService.archiveProject(projectId);
      // Refresh the project list
      fetchProjects(filter); // Pass filter
    } catch (error) {
      console.error('Error archiving project:', error);
    }
  };

  const handleUnarchiveProject = async (projectId: string) => {
    try {
      await projectService.unarchiveProject(projectId);
      // Refresh the project list
      fetchProjects(filter); // Pass filter
    } catch (error) {
      console.error('Error unarchiving project:', error);
    }
  };



  const StatusBadge: React.FC<{ status: ProjectSchema['status'] }> = ({ status }) => {
    const statusStyles = {
      planning: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      paused: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      archived: 'bg-gray-400 text-white' // Style for archived status
    }

    const statusLabels = {
      planning: 'Planejamento',
      active: 'Ativo',
      completed: 'Concluído',
      paused: 'Pausado',
      cancelled: 'Cancelado',
      archived: 'Arquivado' // Label for archived status
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Buscar projetos e usuários
        const [projectsResponse, usersResponse, tasksResponse] = await Promise.all([
          projectService.fetchProjects(),
          userManagementService.fetchUsers(),
          taskService.fetchTasks({
            projectId: projectFilter || undefined,
            status: statusFilter as TaskSchema['status'] || undefined,
            limit: ITEMS_PER_PAGE,
            page: currentPage
          })
        ])

        // Mapear projetos
        setProjects(projectsResponse.data.map(p => ({
          id: p.id,
          name: p.name
        })))

        // Mapear usuários
        const userMap = usersResponse.data.reduce((acc, user) => {
          acc[user.id] = user.name
          return acc
        }, {} as { [key: string]: string })
        setUsers(userMap)

        // Definir tarefas e total de páginas
        setTasks(tasksResponse.data)
        setTotalPages(tasksResponse.totalPages)
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err)
        setError(err.message || 'Falha ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [projectFilter, statusFilter, currentPage])

  // Filtrar tarefas
  const filteredTasks = tasks.filter(task =>
    (searchTerm === '' ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Componente de Badge de Status
  const StatusBadgeTask: React.FC<{ status: TaskSchema['status'] }> = ({ status }) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      waiting_approval: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      blocked: 'bg-red-100 text-red-800'
    }

    const statusLabels = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      waiting_approval: 'Aguardando Aprovação',
      completed: 'Concluída',
      blocked: 'Bloqueada'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  // Manipuladores de ações
  const handleCreateTask = (newTask: TaskSchema) => {
    setTasks(prev => [newTask, ...prev])
    setIsCreateModalOpen(false)
  }

  const handleUpdateTask = (updatedTask: TaskSchema) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    )
    setIsEditModalOpen(false)
    setSelectedTask(null)
  }

  const handleDeleteTask = async () => {
    if (!selectedTask) return

    try {
      await taskService.deleteTask(selectedTask.id)
      setTasks(prev => prev.filter(task => task.id !== selectedTask.id))
      setIsDeleteModalOpen(false)
      setSelectedTask(null)
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir tarefa')
    }
  }

  return (
    <Layout role="admin" isLoading={isLoading}>
      <div className="container mx-auto p-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gerenciamento de Tarefas
            </h1>
            <p className="text-gray-500 text-sm">
              Gerencie e acompanhe todas as tarefas do sistema
            </p>
          </div>
          <div className="flex space-x-4"> {/* Container for buttons */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
            >
              <Plus className="mr-2" /> Nova Tarefa
            </button>
            <Link
              to="/admin/action-templates/create"
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md"
            >
              <Plus className="mr-2" /> Criar Modelo de Ação
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Projetos</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Andamento</option>
            <option value="waiting_approval">Aguardando Aprovação</option>
            <option value="completed">Concluída</option>
            <option value="blocked">Bloqueada</option>
          </select>
        </div>

        {/* Lista de Tarefas */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma tarefa encontrada
            </h3>
            <p className="text-gray-500">
              Tente ajustar os filtros ou criar uma nova tarefa.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 group"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                        <Link to={`/tasks/${task.id}`}>{task.title}</Link> {/* Link to TaskDetails */}
                      </h2>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedTask(task)
                            setIsEditModalOpen(true)
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTask(task)
                            setIsDeleteModalOpen(true)
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {task.description}
                    </p>

                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                        <Users className="text-gray-500" size={16} />
                        <span className="text-gray-600 text-sm truncate max-w-[150px]">
                          {/* Corrected: Check if task.assignedTo is an array before mapping */}
                          {Array.isArray(task.assignedTo)
                            ? task.assignedTo
                                .map(userId => users[userId] || userId)
                                .join(', ')
                            : 'Nenhum responsável atribuído'} {/* Handle non-array case */}
                        </span>
                      </div>
                      <StatusBadgeTask status={task.status} />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Clock className="text-gray-500" size={16} />
                        <span className="text-gray-600 text-sm">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-sm text-yellow-600 font-medium flex items-center">
                        <span className="mr-1">🪙</span>
                        {task.coinsReward}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center hover:bg-gray-100 transition"
                >
                  <ChevronLeft className="mr-2" /> Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center hover:bg-gray-100 transition"
                >
                  Próximo <ChevronRight className="ml-2" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Modais */}
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onTaskCreated={handleCreateTask}
        />

        {selectedTask && (
          <>
            <EditTaskModal
              task={selectedTask}
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false)
                setSelectedTask(null)
              }}
              onTaskUpdated={handleUpdateTask}
            />

            <DeleteConfirmationModal
              isOpen={isDeleteModalOpen}
              onClose={() => {
                setIsDeleteModalOpen(false)
                setSelectedTask(null)
              }}
              onConfirm={handleDeleteTask}
              itemName={selectedTask.title}
              warningMessage="A exclusão de uma tarefa removerá permanentemente todas as suas informações do sistema."
            />
          </>
        )}
      </div>
    </Layout>
  )
}

export default TaskManagement
