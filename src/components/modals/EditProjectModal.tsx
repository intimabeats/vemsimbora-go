import React, { useState, useEffect } from 'react'
import {
  Briefcase,
  X,
  AlertTriangle
} from 'lucide-react'
import { projectService } from '../../services/ProjectService'
import { ProjectSchema } from '../../types/firestore-schema'
import { userManagementService } from '../../services/UserManagementService' // Corrected import

interface EditProjectModalProps {
  project: ProjectSchema
  isOpen: boolean
  onClose: () => void
  onProjectUpdated: (project: ProjectSchema) => void
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onProjectUpdated
}) => {
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description,
    startDate: project.startDate && project.startDate > 0
      ? new Date(project.startDate).toISOString().split('T')[0]
      : '',
    endDate: project.endDate && project.endDate > 0
      ? new Date(project.endDate).toISOString().split('T')[0]
      : '',
    status: project.status,
    managers: project.managers
  })
  const [managers, setManagers] = useState<{ id: string, name: string }[]>([])
  const [managersLoading, setManagersLoading] = useState(false);
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  // Fetch managers
  useEffect(() => {
    const fetchManagers = async () => {
      setManagersLoading(true);
      setError(null);
      try {
        const fetchedManagers = await userManagementService.fetchUsers({
          role: 'manager'
        });
        const managerList = fetchedManagers.data.map(user => ({
          id: user.id,
          name: user.name
        }));
        setManagers(managerList);

      } catch (err: any) {
        console.error('Erro ao buscar gestores:', err);
        setError(err.message || 'Failed to load managers.');
      } finally {
        setManagersLoading(false);
      }
    };

    if (isOpen) {
      fetchManagers();
    }
  }, [isOpen]);


  // Reset form state when the project changes
  useEffect(() => {
    setFormData({
      name: project.name,
      description: project.description,
      startDate: project.startDate && project.startDate > 0
        ? new Date(project.startDate).toISOString().split('T')[0]
        : '',
      endDate: project.endDate && project.endDate > 0
        ? new Date(project.endDate).toISOString().split('T')[0]
        : '',
      status: project.status,
      managers: project.managers
    })
    setError(null)
    setStep(1)
    setFormErrors({})
  }, [project, isOpen])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Validations
  const validateStep1 = () => {
    const errors: { [key: string]: string } = {}
    if (!formData.name.trim()) errors.name = 'Project name is required'
    if (!formData.description.trim()) errors.description = 'Description is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = () => {
    const errors: { [key: string]: string } = {}
    if (!formData.startDate) errors.startDate = 'Start date is required'
    if (formData.managers.length === 0) errors.managers = 'At least one manager is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return

    setLoading(true)
    setError(null)

    try {
      // Prepare data for update
      const updateData: Partial<ProjectSchema> = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate
          ? new Date(formData.startDate).getTime()
          : null, // Correct: null if no start date
        endDate: formData.endDate
          ? new Date(formData.endDate).getTime()
          : null, // Correct: null if no end date
        status: formData.status,
        managers: formData.managers
      }

      // Update project
      await projectService.updateProject(project.id, updateData)

      // Call callback with updated project
      onProjectUpdated({
        ...project,
        ...updateData
      })

      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar projeto')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold flex items-center">
            <Briefcase className="mr-2 text-blue-600" />
            Editar Projeto (Step {step}/2)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center">
              <AlertTriangle className="mr-2" />
              {error}
            </div>
          ) : null}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Projeto
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.name ? 'border-red-500' : 'focus:ring-blue-500'}`}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 h-24 ${formErrors.description ? 'border-red-500' : 'focus:ring-blue-500'}`}
                />
                {formErrors.description && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) {
                    setStep(2)
                  }
                }}
                className="w-full py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.startDate ? 'border-red-500' : 'focus:ring-blue-500'}`}
                  />
                  {formErrors.startDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Término (opcional)
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="planning">Planejamento</option>
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gestores
                </label>
                <select
                  multiple
                  name="managers"
                  value={formData.managers}
                  onChange={(e) => {
                    const selectedManagers = Array.from(e.target.selectedOptions, option => option.value)
                    setFormData(prev => ({
                      ...prev,
                      managers: selectedManagers
                    }))
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 h-24 ${formErrors.managers ? 'border-red-500' : 'focus:ring-blue-500'}`}
                    disabled={managersLoading}
                >
                    {managersLoading ? (<option>Loading...</option>) : managers.length > 0 ? (
                        managers.map(manager => (
                            <option key={manager.id} value={manager.id}>
                                {manager.name}
                            </option>
                        ))
                    ) : (
                        <option disabled>No managers found</option>
                    )}
                </select>
                {formErrors.managers && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.managers}</p>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2 rounded-lg text-white transition 
                    ${loading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {loading ? 'Atualizando...' : 'Atualizar Projeto'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
