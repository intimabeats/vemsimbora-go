import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { UserPlus } from 'lucide-react'
import { Layout } from '../../components/Layout'

export const Register: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true); // Add loading state.
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'manager' | 'employee'>('employee')
  const [error, setError] = useState('')

  const { register } = useAuth()
  const navigate = useNavigate()

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500); // Simulate a 0.5-second delay

        return () => clearTimeout(timer);
    }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate inputs
    if (password !== confirmPassword) {
      setError('Senhas não coincidem')
      return
    }

    try {
      await register(name, email, password, role)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar')
    }
  }

  return (
    <Layout isLoading={isLoading}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
            <div className="text-center mb-6">
            <UserPlus className="mx-auto mb-4 text-blue-600" size={48} />
            <h1 className="text-2xl font-bold text-gray-800">Criar Conta</h1>
            <p className="text-gray-500">Vem Simbora - Gestão de Tarefas</p>
            </div>

            {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                {error}
            </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="text"
                placeholder="Nome Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />

            <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="employee">Funcionário</option>
                <option value="manager">Gestor</option>
                <option value="admin">Administrador</option>
            </select>

            <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />

            <input
                type="password"
                placeholder="Confirmar Senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
            />

            <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
            >
                Criar Conta
            </button>
            </form>

            <div className="text-center mt-4">
            <p className="text-gray-600">
                Já tem uma conta? {' '}
                <a
                href="/login"
                className="text-blue-600 hover:underline"
                >
                Fazer Login
                </a>
            </p>
            </div>
        </div>
        </div>
    </Layout>
  )
}
