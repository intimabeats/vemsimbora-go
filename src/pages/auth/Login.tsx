import React, { useState } from 'react'
import { LogIn, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Layout } from '../../components/Layout' // Import Layout

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await login(email, password)

      // Redirecionar baseado na role
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard')
          break
        case 'manager':
          navigate('/manager/dashboard')
          break
        case 'employee':
          navigate('/employee/dashboard')
          break
        default:
          navigate('/login')
      }
    } catch (err: any) {
      setError(getErrorMessage(err.code))
      setIsLoading(false)
    }
  }

  const getErrorMessage = (errorCode: string) => {
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Conta desativada',
      'default': 'Erro de autenticação. Tente novamente.'
    }
    return errorMessages[errorCode] || errorMessages['default']
  }

  return (
    <Layout hideNavigation={true} isLoading={false}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <img
              src="https://images.unsplash.com/photo-1560179707-f14e90ef3623"
              alt="Vem Simbora Logo"
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
            />
            <h1 className="text-3xl font-bold text-gray-800">Vem Simbora</h1>
            <p className="text-gray-500">Gestão de Tarefas</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu email"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <span>Carregando...</span>
              ) : (
                <>
                  <LogIn className="mr-2" /> Entrar
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link to="/forgot-password" className="text-blue-600 hover:underline flex items-center justify-center">
              <Lock className="mr-2" /> Esqueci minha senha
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
