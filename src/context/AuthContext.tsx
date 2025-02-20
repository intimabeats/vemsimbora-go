// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback
} from 'react'
import {
  auth,
  AuthService,
  TokenService
} from '../config/firebase'
import {
  onAuthStateChanged,
  User,
  getIdToken,
  sendPasswordResetEmail
} from 'firebase/auth'

// User roles type
type UserRole = 'admin' | 'manager' | 'employee'

// Extended user interface
interface ExtendedUser extends User {
  role?: UserRole
  coins?: number
}

// Auth context type
type AuthContextType = {
  currentUser: ExtendedUser | null
  login: (email: string, password: string) => Promise<ExtendedUser>
  logout: () => Promise<void>
  refreshToken: () => Promise<string>
  checkTokenClaims: () => Promise<{
    admin: boolean
    manager: boolean
    employee: boolean
  }>
  resetPassword: (email: string) => Promise<void>
  setCurrentUser: React.Dispatch<React.SetStateAction<ExtendedUser | null>> // Add setCurrentUser
}

// Create context
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: async () => ({} as ExtendedUser),
  logout: async () => { },
  refreshToken: async () => '',
  checkTokenClaims: async () => ({
    admin: false,
    manager: false,
    employee: false
  }),
  resetPassword: async () => { },
  setCurrentUser: () => {} // Provide a default implementation
})

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)


  const updateUser = useCallback(async (user: User | null) => {
    console.log("AuthContext updateUser - user:", user); // Log the user object
    if (user) {
      try {
        // Tentar restaurar dados do usuário do localStorage
        const storedUser = localStorage.getItem('user')

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
            console.log("AuthContext updateUser - storedUser:", parsedUser);

          // Verificar validade do token
          const token = await getIdToken(user, true)

          setCurrentUser({
            ...user,
            role: parsedUser.role,
            coins: parsedUser.coins
          })
        } else {
          // Se não houver dados no localStorage, buscar do Firestore
          const userDoc = await AuthService.login(user.email!, '')
            console.log("AuthContext updateUser - userDoc from Firestore:", userDoc);
          setCurrentUser({
            ...user,
            role: userDoc.role,
            coins: userDoc.coins
          })
        }
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error)
        setCurrentUser(null)
      }
    } else {
      setCurrentUser(null)
    }
  }, []);


  useEffect(() => {
    // Configurar listener de autenticação persistente
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      await updateUser(user);
      setLoading(false)
    }, (error) => {
      console.error('Erro no listener de autenticação:', error)
      setCurrentUser(null)
      setLoading(false)
    })

    // Configurar listener de expiração de token
    const tokenListener = setInterval(async () => {
      if (currentUser) {
        try {
          await getIdToken(currentUser, true)
        } catch (error) {
          console.error('Token expirado:', error)
          await logout()
        }
      }
    }, 30 * 60 * 1000) // Verificar a cada 30 minutos

    // Limpar listeners
    return () => {
      unsubscribe()
      clearInterval(tokenListener)
    }
  }, [updateUser]) // Add updateUser to the dependency array


  // Métodos de autenticação
  const login = async (email: string, password: string) => {
    try {
      const user = await AuthService.login(email, password)
        console.log("AuthContext login - user after AuthService.login:", user); // Log after login

      // Salvar dados no localStorage
      localStorage.setItem('user', JSON.stringify({
        role: user.role,
        coins: user.coins
      }))

      setCurrentUser(user)
      return user
    } catch (error) {
      console.error('Erro de login:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await AuthService.logout()
      localStorage.removeItem('user')
      setCurrentUser(null)
    } catch (error) {
      console.error('Erro de logout:', error)
      throw error
    }
  }

  const refreshToken = async () => {
    if (!currentUser) {
      throw new Error('Nenhum usuário autenticado')
    }
    return TokenService.refreshToken(currentUser)
  }

  const checkTokenClaims = async () => {
    if (!currentUser) {
      throw new Error('Nenhum usuário autenticado')
    }
    return TokenService.checkTokenClaims(currentUser)
  }

  // Password reset function
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error; // Re-throw the error to be caught in the component
    }
  };

  // Valor do contexto
  const value = {
    currentUser,
    login,
    logout,
    refreshToken,
    checkTokenClaims,
    resetPassword,
    setCurrentUser // Expose setCurrentUser
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

// Custom hook para usar o contexto de autenticação
export const useAuth = () => {
  return useContext(AuthContext)
}
