import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/Layout'
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Archive,
  FolderOpen
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProjectSchema } from '../../types/firestore-schema'
import { projectService } from '../../services/ProjectService'
import { CreateProjectModal } from '../../components/modals/CreateProjectModal'
import { EditProjectModal } from '../../components/modals/EditProjectModal'
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal'
import useDebounce from '../../utils/useDebounce'; // Import the debounce hook

export const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSchema[]>([])
  const [isLoading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    status?: ProjectSchema['status']
  }>({})
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce the search term

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 9

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectSchema | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

    // useCallback to prevent unnecessary re-renders of fetchProjects
    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const options: {
                status?: ProjectSchema['status'];
                excludeStatus?: ProjectSchema['status'];
                limit: number;
                page: number;
            } = {
                limit: itemsPerPage,
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
            setLoading(false);
        }
    }, [filter.status, currentPage, itemsPerPage]); // Correct dependencies

  useEffect(() => {
    fetchProjects()
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
      fetchProjects();
    } catch (error) {
      console.error('Error archiving project:', error);
    }
  };

  const handleUnarchiveProject = async (projectId: string) => {
    try {
      await projectService.unarchiveProject(projectId);
      // Refresh the project list
      fetchProjects();
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

  return (
    <Layout role="admin" isLoading={isLoading}>
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
          <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Gerenciamento de Projetos
              </h1>
              <p className="text-gray-500 text-sm">
                Gerencie e acompanhe todos os projetos do sistema.
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition"
            >
              <Plus className="mr-2" /> Adicionar Projeto
            </button>
          </div>

          {/* Filtros - Responsive Layout */}
          <div className="md:flex md:space-x-4 mb-6">
            <div className="relative flex-grow mb-4 md:mb-0">
              <input
                type="text"
                placeholder="Buscar projetos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            </div>

            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: e.target.value as ProjectSchema['status'] })}
              className="w-full md:w-auto px-4 py-2 border rounded-lg"
            >
              <option value="">Todos os Status</option>
              <option value="planning">Planejamento</option>
              <option value="active">Ativos</option>
              <option value="completed">Concluídos</option>
              <option value="paused">Pausados</option>
              <option value="cancelled">Cancelados</option>
              <option value="archived">Arquivados</option>
            </select>
          </div>

          {/* Project Cards (Grid Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 ? (
              <div className="text-center py-4 col-span-full">
                Nenhum projeto encontrado
              </div>
            ) : (
              projects
              .filter((project) =>
                project.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||  // Use debouncedSearchTerm
                project.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
              )
              .map((project) => (
                <div key={project.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition group">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition">
                      <Link to={`/admin/projects/${project.id}`}>{project.name}</Link>
                    </h2>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {project.status === 'archived' ? (
                        <button
                          onClick={() => handleUnarchiveProject(project.id)}
                          className="text-green-500 hover:text-green-700"
                          title="Desarquivar"
                        >
                          <FolderOpen size={20} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveProject(project.id)}
                          className="text-yellow-500 hover:text-yellow-700"
                          title="Arquivar"
                        >
                          <Archive size={20} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditProject(project)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteConfirmation(project)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                  <div className="text-sm text-gray-600 mb-2">
                    Início: {new Date(project.startDate).toLocaleDateString()}
                    {project.endDate && (
                      <>
                        <br />
                        Fim: {new Date(project.endDate).toLocaleDateString()}
                      </>
                    )}
                  </div>
                   {/* Status Badge - Bottom Right */}
                  <div className="flex justify-end">
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paginação */}
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center"
              >
                <ChevronLeft className="mr-2" /> Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 flex items-center"
              >
                Próximo <ChevronRight className="ml-2" />
              </button>
            </div>
          </div>

          {/* Modais */}
          <CreateProjectModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onProjectCreated={handleProjectCreated}
          />

          {selectedProject && (
            <>
              <EditProjectModal
                project={selectedProject}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onProjectUpdated={handleProjectUpdated}
              />

              <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteProject}
                itemName={selectedProject.name}
                warningMessage="A exclusão de um projeto removerá permanentemente todas as suas informações do sistema."
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ProjectManagement
