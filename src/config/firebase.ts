import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  reauthenticateWithCredential, // Import reauthenticateWithCredential
  EmailAuthProvider // Import EmailAuthProvider
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAU0TCTTobySafDi-9Y68C5eyOD-gmU7nw",
  authDomain: "vem-simbora.firebaseapp.com",
  projectId: "vem-simbora",
  storageBucket: "vem-simbora.firebasestorage.app",
  messagingSenderId: "403932059706",
  appId: "1:403932059706:web:5a7e01eebf7be71769bd03",
  measurementId: "G-31XN454YCP"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Configurar persistência de sessão
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Erro ao configurar persistência:', error)
  })

// User roles type
type UserRole = 'admin' | 'manager' | 'employee'

// Authentication service
export const AuthService = {
  // Login user
  login: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Buscar dados adicionais do usuário
      const userDoc = await getDoc(doc(db, 'users', user.uid))

      if (userDoc.exists()) {
        const userData = userDoc.data()

        return {
          ...user,
          role: userData.role,
          coins: userData.coins
        }
      }

      throw new Error('Dados do usuário não encontrados')
    } catch (error) {
      console.error('Erro de login:', error)
      throw error
    }
  },

  // Register new user
  register: async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => {
    try {
      // Criar usuário no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Atualizar perfil
      await updateProfile(user, { displayName: name })

      // Criar documento no Firestore
      const userData = {
        id: user.uid,
        name,
        email,
        role,
        coins: 0,
        status: 'active'
      }

      await setDoc(doc(db, 'users', user.uid), userData)

      return {
        ...user,
        ...userData
      }
    } catch (error) {
      console.error('Erro de registro:', error)
      throw error
    }
  },

  // Logout user
  logout: async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Erro de logout:', error)
      throw error
    }
  },

  // Password reset
  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error('Erro de redefinição de senha:', error)
      throw error
    }
  },

  updateProfile: async (userId: string, updates: any) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, updates)

      // Update the user's profile in Firebase Authentication
      if (auth.currentUser) {
        const authUpdates: any = {};
        if (updates.name) {
          authUpdates.displayName = updates.name;
        }
        if (updates.photoURL) {
          authUpdates.photoURL = updates.photoURL;
        }
        if (Object.keys(authUpdates).length > 0) {
          console.log("firebase.ts - Updating auth profile with:", authUpdates); // Log auth updates
          await updateProfile(auth.currentUser, authUpdates);
          console.log("firebase.ts - Auth profile updated successfully"); // Log success
        }
      }


    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      throw error
    }
  },

    // Reauthenticate user  -- ADDED THIS METHOD
  reauthenticate: async (email: string, password: string) => {
    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('Nenhum usuário autenticado')
      }
      const credential = EmailAuthProvider.credential(email, password)
      await reauthenticateWithCredential(user, credential)
      return true // Return true on success
    } catch (error) {
      console.error('Erro de reautenticação:', error)
      return false // Return false on failure
    }
  }
}

// Token service
export const TokenService = {
  // Atualizar token manualmente
  refreshToken: async (user: any) => {
    try {
      return await user.getIdToken(true)
    } catch (error) {
      console.error('Erro ao atualizar token:', error)
      throw error
    }
  },

  // Verificar claims do token
  checkTokenClaims: async (user: any) => {
    try {
      const tokenResult = await user.getIdTokenResult()
      return {
        admin: tokenResult.claims.admin === true,
        manager: tokenResult.claims.manager === true,
        employee: tokenResult.claims.employee === true
      }
    } catch (error) {
      console.error('Erro ao verificar claims do token:', error)
      return {
        admin: false,
        manager: false,
        employee: false
      }
    }
  }
}

// Exportar serviços e configurações
export { auth, db, storage }
