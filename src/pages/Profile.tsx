// src/pages/Profile.tsx
import React, { useState, useEffect, useRef } from 'react'
import {
  User,
  Mail,
  Lock,
  Shield,
  Save,
  Camera,
  X,
  AlertTriangle,
    Loader2,
    FileEdit // new icon
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AuthService } from '../config/firebase'
import { useNavigate } from 'react-router-dom'
import { storage } from '../config/firebase' // Import storage
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage' // Import storage functions
import { Validation } from '../utils/validation'
import { Layout } from '../components/Layout'
import { userManagementService } from '../services/UserManagementService' // Import

export const Profile: React.FC = () => {
  const { currentUser, logout, setCurrentUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverPhotoInputRef = useRef<HTMLInputElement>(null); // Ref for cover photo input


  const [name, setName] = useState('')
  const [email, setEmail] = useState('')  // Email is read-only
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [coverImage, setCoverImage] = useState<string>(''); // New state for cover image
  const [isUploadingCover, setIsUploadingCover] = useState(false); // New state for cover upload
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null); // New state for cover upload errors
  const [bio, setBio] = useState(''); // New state for the bio


  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');

            try {
                if (currentUser) {
                    setName(currentUser.displayName || '');
                    setEmail(currentUser.email || '');
                    setProfileImage(currentUser.photoURL || null);

                    const userData = await userManagementService.getUserById(currentUser.uid);
                    if (userData) {
                        setCoverImage(userData.coverImage || 'linear-gradient(to right, #4c51bf, #6a82fb)');
                        if (userData.bio) {
                            setBio(userData.bio);
                        }
                    }
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load profile data.');
                console.error("Error fetching user data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [currentUser?.uid]); // Correct dependency


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    if (!Validation.isValidFileType(file, ['image/jpeg', 'image/png'])) {
      setError('Formato de imagem inválido. Use JPEG ou PNG.')
      return
    }

    if (!Validation.isValidFileSize(file, 5)) { // 5MB limit
      setError('Imagem muito grande. O tamanho máximo é 5MB.')
      return
    }

    setIsUploading(true)
    setError('')
    try {
      const storageRef = ref(storage, `users/${currentUser!.uid}/profileImage`)
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      setProfileImage(downloadURL)

      // Update profile immediately --  AND UPDATE CURRENT USER!
      await AuthService.updateProfile(currentUser!.uid, { photoURL: downloadURL })
      await userManagementService.updateUser(currentUser!.uid, { profileImage: downloadURL }) // Update Firestore
      setCurrentUser(prevUser => prevUser ? { ...prevUser, photoURL: downloadURL } : null) // VERY IMPORTANT
      setSuccess('Imagem de perfil atualizada!')

    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload da imagem')
    } finally {
      setIsUploading(false) // Set loading to false after upload (success or failure)
    }
  }

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!Validation.isValidFileType(file, ['image/jpeg', 'image/png'])) {
      setCoverUploadError('Formato de imagem inválido. Use JPEG ou PNG.');
      return;
    }

    if (!Validation.isValidFileSize(file, 5)) {
      setCoverUploadError('Imagem muito grande. O tamanho máximo é 5MB.');
      return;
    }

    setIsUploadingCover(true);
    setCoverUploadError(null); // Clear previous errors
    try {
      const storageRef = ref(storage, `users/${currentUser!.uid}/coverImage`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setCoverImage(downloadURL);

      // Update user's profile with the new cover photo URL
      await userManagementService.updateUser(currentUser!.uid, { coverImage: downloadURL });
      // Optionally update the currentUser context if you want immediate reflection
      setCurrentUser(prevUser => prevUser ? { ...prevUser, coverImage: downloadURL } : null);
      setSuccess('Imagem de capa atualizada!');

    } catch (err: any) {
      setCoverUploadError(err.message || 'Erro ao fazer upload da imagem de capa.');
    } finally {
      setIsUploadingCover(false); // Set loading to false after upload (success or failure)
    }
  };

  const validatePasswords = () => {
    if (newPassword !== confirmPassword) {
      setError('Novas senhas não coincidem')
      return false
    }
    if (newPassword && !Validation.isStrongPassword(newPassword)) {
      setError('Nova senha não atende aos requisitos de segurança.')
      return false
    }
    return true
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      // Validate name
      if (!Validation.isValidName(name)) {
        setError('Nome inválido. Use nome e sobrenome.')
        setIsLoading(false)
        return
      }

      // Validate passwords if changing
      if (newPassword) {
        if (!validatePasswords()) {
          setIsLoading(false)
          return
        }

        // Reauthenticate user before password change
        if (currentUser && currentPassword) {
          const reauthSuccess = await AuthService.reauthenticate(
            currentUser.email!,
            currentPassword
          )
          if (!reauthSuccess) {
            setError('Senha atual incorreta. Reautenticação falhou.')
            setIsLoading(false)
            return
          }

          // Update password (requires reauthentication)
          await currentUser.updatePassword(newPassword)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        }
      }

      // Prepare updates
      const updates: any = {}
      if (name !== currentUser?.displayName) {
        updates.name = name
      }
      //NEW
      if (bio !== currentUser?.bio) {
          updates.bio = bio;
      }

      // Update profile (name and potentially photoURL)
      await AuthService.updateProfile(currentUser!.uid, updates)
      await userManagementService.updateUser(currentUser!.uid, updates) // Update Firestore
      setSuccess('Perfil atualizado com sucesso!')
      // Update the currentUser in the context
      setCurrentUser(prevUser => prevUser ? { ...prevUser, displayName: name, ...updates } : null);

    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil')
    } finally {
      setIsLoading(false) // Set loading to false after update (success or failure)
    }
  }

  const handleClose = () => {
    const returnRoute = currentUser?.role === 'admin'
      ? '/admin/settings'
      : currentUser?.role === 'manager'
        ? '/manager/settings'
        : '/employee/settings'

    navigate(returnRoute)
  }

  return (
    <Layout role={currentUser?.role || 'employee'} isLoading={isLoading}>
      <div className="container mx-auto p-6">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Meu Perfil</h1>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
          {/* Cover Photo Section */}
          <div className="relative w-full h-48 bg-gray-200 rounded-xl overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: coverImage.startsWith('linear-gradient')
                  ? coverImage
                  : `url(${coverImage})`,
              }}
            >
              {/* Semi-transparent overlay (only if it's an image) */}
              {!coverImage.startsWith('linear-gradient') && (
                <div className="absolute inset-0 bg-black opacity-30"></div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={coverPhotoInputRef}
              onChange={handleCoverImageUpload}
              className="hidden"
            />
            <button
              onClick={() => coverPhotoInputRef.current?.click()}
              className="absolute top-4 right-4 bg-white bg-opacity-75 text-gray-700 p-2 rounded-full hover:bg-opacity-100 transition-colors"
              title="Change Cover Photo"
            >
              <Camera size={20} />
            </button>
            {isUploadingCover && (
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                <Loader2 className="animate-spin text-white" size={20} />
              </div>
            )}
            {coverUploadError && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded">
                {coverUploadError}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Informações Pessoais */}
            <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-md">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
                    <AlertTriangle className="mr-2" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                    {success}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-gray-700 mb-2 flex items-center">
                      <User className="mr-2 text-gray-500" size={20} /> Nome
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-gray-700 mb-2 flex items-center">
                      <Mail className="mr-2 text-gray-500" size={20} /> Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      readOnly
                      className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                    <label htmlFor="bio" className="block text-gray-700 mb-2 flex items-center">
                        <FileEdit className="mr-2 text-gray-500" size={20} /> Bio
                    </label>
                    <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="A short description about yourself..."
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" // Added resize-none
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="currentPassword" className="block text-gray-700 mb-2 flex items-center">
                      <Lock className="mr-2 text-gray-500" size={20} /> Senha Atual
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Necessário para alterar senha"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-gray-700 mb-2 flex items-center">
                      <Shield className="mr-2 text-gray-500" size={20} /> Nova Senha
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-gray-700 mb-2 flex items-center">
                    <Shield className="mr-2 text-gray-500" size={20} /> Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : (
                    <>
                      <Save className="mr-2" /> Salvar Alterações
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Foto de Perfil */}
            <div className="bg-white p-8 rounded-xl shadow-md flex flex-col items-center">
              <div className="relative mb-6">
                <img
                  src={profileImage || 'https://via.placeholder.com/150'}
                  alt="Foto de Perfil"
                  className="w-48 h-48 rounded-full object-cover border-4 border-blue-100"
                />
                <label
                  htmlFor="profile-upload"
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition"
                >
                  <Camera size={20} />
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="profile-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                {isUploading && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
                </div>}
              </div>

              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800">{name}</h2>
                <p className="text-gray-600 capitalize">{currentUser?.role}</p>
                <p className="text-sm text-gray-500 mt-2">{email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
