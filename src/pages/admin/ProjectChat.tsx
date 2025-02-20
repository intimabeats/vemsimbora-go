// src/pages/admin/ProjectChat.tsx
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import {
  MessageCircle,
  Paperclip,
  Send,
  ArrowLeft,
  X,
  Users
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { projectService } from '../../services/ProjectService'
import { userManagementService } from '../../services/UserManagementService'
import { storage } from '../../config/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Message } from '../../components/Message'
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal'
import { getDefaultProfileImage } from '../../utils/user'

interface MessageType {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: number
  attachments?: {
    id: string
    name: string
    url: string
    type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio'
    size?: number
  }[]
  quotedMessage?: {
    userName: string;
    content: string;
    attachments?: any[];
  }
  originalMessageId?: string; // Add originalMessageId
  messageType?: 'task_submission' | 'task_approval' | 'general'; // Add messageType
}

// Functional component for the Managers Modal
const ManagersModal: React.FC<{ managers: any[]; onClose: () => void }> = ({ managers, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Gestores do Projeto</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <ul>
              {managers.map((manager) => (
                <li key={manager.id} className="flex items-center mb-3">
                  <img
                    src={manager.profileImage || getDefaultProfileImage(manager.name)}
                    alt={manager.name}
                    className="w-10 h-10 rounded-full object-cover mr-3"
                  />
                  <span className="text-gray-800">{manager.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
};

export const ProjectChat: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null); // Ref for the input field
  const headerRef = useRef<HTMLDivElement>(null); // Ref for the header
  const inputAreaRef = useRef<HTMLDivElement>(null); // Ref for the input area


  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<any>(null)
  const [messages, setMessages] = useState<MessageType[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [users, setUsers] = useState<{ [key: string]: { name: string; photoURL?: string } }>({})
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [quotedMessage, setQuotedMessage] = useState<MessageType | null>(null)
  const [isManagersModalOpen, setIsManagersModalOpen] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);

  const openManagersModal = () => setIsManagersModalOpen(true);
  const closeManagersModal = () => setIsManagersModalOpen(false);

  // Load project data, messages, and users
    useEffect(() => {
        const loadProjectData = async () => {
            try {
                if (!projectId) throw new Error('Project ID is required');
                setIsLoading(true);
                setError(null);

                const projectData = await projectService.getProjectById(projectId);
                setProject(projectData);

                const projectMessages = await projectService.getProjectMessages(projectId);
                setMessages(projectMessages);

                const usersResponse = await userManagementService.fetchUsers();
                // console.log("Fetched users (from within ProjectChat):", usersResponse); // Log fetched users

                const userMap = usersResponse.data.reduce((acc, user) => {
                    acc[user.id] = { name: user.name, photoURL: user.profileImage }; // Use profileImage
                    return acc;
                }, {} as { [key: string]: { name: string; photoURL?: string } });
                // console.log("User map (within ProjectChat):", userMap); // Log the user map
                setUsers(userMap);


        // Fetch manager data
        if (projectData && projectData.managers) {
          const managerData = await Promise.all(
            projectData.managers.map((managerId: string) => userManagementService.getUserById(managerId))
          );
          setManagers(managerData);
        }

      } catch (err: any) {
        console.error('Error loading project data:', err)
        setError(err.message || 'Failed to load project details')
      } finally {
        setIsLoading(false)
      }
    }

    loadProjectData()
  }, [projectId])



  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

    const uploadFile = async (file: File) => {
        const storageRef = ref(storage, `projects/${projectId}/chat/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytes(storageRef, file);

        return new Promise<{
            id: string;
            name: string;
            url: string;
            type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio';
            size?: number;
        }>((resolve, reject) => {
            uploadTask.then(async (snapshot) => {
                const url = await getDownloadURL(snapshot.ref);
                const getFileType = (file: File) => {
                    if (file.type.startsWith('image/')) return 'image';
                    if (file.type.startsWith('video/')) return 'video';
                    if (file.type.startsWith('audio/')) return 'audio'; // Correctly identify audio
                    if (file.type.includes('document') || file.type.includes('pdf')) return 'document';
                    return 'other';
                };

                resolve({
                    id: Date.now().toString(),
                    name: file.name,
                    url,
                    type: getFileType(file),
                    size: file.size,
                });
            }).catch(reject);
        });
    };


    const handleSendMessage = async () => {
        setIsLoading(true);
        setError(null);

        try {
            setUploadProgress(0);
            let uploadedAttachments: {
                id: string;
                name: string;
                url: string;
                type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio';
                size?: number;
            }[] = [];

            if (attachments.length > 0) {
                const uploadPromises = attachments.map((file) => uploadFile(file));
                uploadedAttachments = await Promise.all(uploadPromises);
            }

            const newMessageObj: MessageType = {
                id: Date.now().toString(),
                userId: currentUser!.uid,
                userName: currentUser!.displayName || users[currentUser!.uid]?.name || 'Usuário',
                content: newMessage,
                timestamp: Date.now(),
                attachments: uploadedAttachments,
                quotedMessage: quotedMessage
                    ? {
                        userName: quotedMessage.userName,
                        content: quotedMessage.content,
                        attachments: quotedMessage.attachments,
                    }
                    : null, // Ensure quotedMessage is null if not present
              messageType: 'general'
            };

            // Add the new message to Firestore
            await projectService.addProjectMessage(projectId!, newMessageObj);

            // Update local state
            setMessages((prevMessages) => [...prevMessages, newMessageObj]);
            setNewMessage('');
            setAttachments([]);
            setUploadProgress(0);
            setQuotedMessage(null); // Clear quoted message
        } catch (err: any) {
            setError(err.message || 'Failed to send message');
        } finally {
            setIsLoading(false);
        }
    };


  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      // Filter out the message to be deleted
      const updatedMessages = messages.filter((msg) => msg.id !== messageToDelete);

      // Update the messages in the state
      setMessages(updatedMessages);

      // Update the messages in Firestore
      await projectService.updateProject(projectId!, { messages: updatedMessages });

    } catch (error) {
      console.error("Error deleting message:", error);
      setError("Failed to delete message.");
    } finally {
      setIsDeleteModalOpen(false);
      setMessageToDelete(null);
    }
  }

  // Dynamic height calculation
    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            if (chatContainerRef.current && headerRef.current && inputAreaRef.current) {
                const headerHeight = headerRef.current.offsetHeight;
                const inputAreaHeight = inputAreaRef.current.offsetHeight;
                const windowHeight = window.innerHeight;

                // Calculate available height for chat container
                const chatContainerHeight = windowHeight - headerHeight - inputAreaHeight;

                chatContainerRef.current.style.height = `${chatContainerHeight}px`;
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; // Scroll to bottom
            }
        });

        if (chatContainerRef.current) {
            resizeObserver.observe(chatContainerRef.current);
        }

        return () => {
            if (chatContainerRef.current) {
                resizeObserver.unobserve(chatContainerRef.current);
            }
        };
    }, []);


  if (isLoading) {
    return <Layout role="admin" isLoading={true} />
  }

  if (error) {
    return (
      <Layout role="admin">
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Erro: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </Layout>
    )
  }

  const MAX_MANAGERS_DISPLAY = 5;
  const displayedManagers = managers.slice(0, MAX_MANAGERS_DISPLAY);
  const remainingManagersCount = managers.length - MAX_MANAGERS_DISPLAY;


  return (
    <Layout role={currentUser?.role || 'employee'}>
      <div className="flex flex-col h-screen">
        {/* Fixed Header */}
        <div ref={headerRef}  className="bg-white shadow-md p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/admin/projects/${projectId}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 text-center flex-grow">
              {project?.name}
            </h1>
          </div>
            {/* Display Managers */}
          <div className="flex items-center justify-center mt-2 cursor-pointer" onClick={openManagersModal}>
            {displayedManagers.map((manager) => (
              <img
                key={manager.id}
                src={manager.profileImage || getDefaultProfileImage(manager.name)}
                alt={manager.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-white ml-[-0.5rem]"
              />
            ))}
            {remainingManagersCount > 0 && (
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center ml-[-0.5rem]">
                +{remainingManagersCount}
              </div>
            )}
          </div>
        </div>

        {/* Chat Container (scrollable) */}
        <div
            className="flex-1 overflow-y-auto bg-gray-50 p-4"
            ref={chatContainerRef}

        >
          {messages.map((message, index) => (
            <Message
              key={message.id}
              message={message}
              onDelete={(messageId) => {
                setMessageToDelete(messageId);
                setIsDeleteModalOpen(true);
              }}
              onQuote={(message) => setQuotedMessage({ userName: message.userName, content: message.content, attachments: message.attachments })}
              isFirstMessage={index === 0}
              users={users}
            />
          ))}
        </div>

        {/*  Input Area */}
        <div ref={inputAreaRef} className="bg-white p-4 shadow-md flex-shrink-0 sticky bottom-0">
          {/* Quoted Message Display */}
          {quotedMessage && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-700">Respondendo a {quotedMessage.userName}</div>
                <div className="text-gray-600">{quotedMessage.content}</div>
              </div>
              <button onClick={() => setQuotedMessage(null)} className="text-gray-500 hover:text-red-500">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Attachment Preview - Keep this simple */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1"
                >
                  <Paperclip size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-700 truncate" style={{ maxWidth: '150px' }}>
                    {file.name}
                  </span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <Paperclip size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              ref={inputRef}
            />

            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && attachments.length === 0 && !quotedMessage}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteMessage}
        itemName="esta mensagem"
        warningMessage="Esta ação não poderá ser desfeita."
      />
      {/* Managers Modal */}
      {isManagersModalOpen && (
        <ManagersModal managers={managers} onClose={closeManagersModal} />
      )}
    </Layout>
  )
}
