// src/components/ActionView.tsx
import React, { useState, useEffect } from 'react';
import { TaskAction } from '../types/firestore-schema';
import { taskService } from '../services/TaskService';
import { X, Bold, Italic, List, Link, Image as ImageIcon, Code, ListOrdered, AlignLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDefaultProfileImage } from "../utils/user";
import { userManagementService } from '../services/UserManagementService';
import ReactDOM from 'react-dom';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'

interface ActionViewProps {
  action: TaskAction;
  onComplete: (actionId: string, data?: any) => void;
  onCancel: () => void;
  taskId: string;
  isOpen: boolean;
}

// --- Line Number Extension (from CDN) ---
const LineNumber = Extension.create({
    name: 'lineNumber',

    addOptions() {
        return {
            width: 32,
        };
    },

    addNodeView() {
        return ({ node, editor, getPos }) => {
            const dom = document.createElement('span');
            dom.classList.add('line-number');
            dom.style.width = `${this.options.width}px`;
            dom.style.userSelect = 'none';

            const update = () => {
                if (typeof getPos === 'boolean') {
                    return;
                }
                const lineNumber = editor.view.state.doc.resolve(getPos()).index(0) + 1;
                dom.innerText = lineNumber.toString();
            };

            update();

            return {
                dom,
                update,
                selectNode: () => {
                    dom.classList.add('selected');
                },
                deselectNode: () => {
                    dom.classList.remove('selected');
                },
                destroy: () => {},
            };
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: ['paragraph', 'heading', 'list_item', 'todo_item', 'code_block'],
                attributes: {
                    lineNumber: {
                        default: null,
                        renderHTML: attributes => {
                            return {
                                class: 'line-number-container',
                            };
                        },
                        parseHTML: element => {
                            return {
                                lineNumber: element.firstChild?.textContent ?? null,
                            };
                        },
                    },
                },
            },
        ];
    },
});


// --- Toolbar Component ---
export const EditorToolbar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex space-x-2 mb-2 p-2 border-b">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
        title="Negrito"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
        title="Itálico"
      >
        <Italic size={16} />
      </button>
        <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
            title="Sublinhado"
        >
            <u>U</u>
        </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
        title="Lista não ordenada"
      >
        <List size={16} />
      </button>
        <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
            title="Lista ordenada"
        >
            <ListOrdered size={16} />
        </button>
      <button
        onClick={() => {
          const url = window.prompt('URL')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }}
        className={editor.isActive('link') ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
        title="Inserir link"
      >
        <Link size={16} />
      </button>
      <button
        onClick={() => {
          const url = window.prompt('Image URL')
          if (url) {
            editor.chain().focus().setImage({ src: url }).run()
          }
        }}
        className={'bg-gray-100 hover:bg-gray-200'}
        title="Inserir imagem"
      >
        <ImageIcon size={16} />
      </button>
        <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
            title="Código"
        >
            <Code size={16} />
        </button>

        <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
            title="Alinhar à Esquerda"
        >
            <AlignLeft size={16} />
        </button>

        <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
            title="Centralizar"
        >
            C
        </button>

        <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
            title="Alinhar à Direita"
        >
            R
        </button>
        <button
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={editor.isActive({ textAlign: 'justify' }) ? 'is-active bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}
            title="Justificar"
        >
            J
        </button>
    </div>
  );
};


export const ActionView: React.FC<ActionViewProps> = ({ action, onComplete, onCancel, taskId, isOpen }) => {
  const [currentStep, setCurrentStep] = useState(0); // Track the current step
  const [stepData, setStepData] = useState<{ [key: number]: any }>({}); // Store data for each step
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; photoURL?: string } | null>(null);
  const { currentUser } = useAuth();

  // Lazily initialize the editor to avoid server-side rendering issues.
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension,
      ImageExtension,
      Placeholder.configure({
        placeholder: 'Digite o conteúdo aqui...',
      }),
      LineNumber,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: action.data?.steps?.[currentStep]?.data || '', // Load data for the current step
    editable: true,
    onUpdate: ({ editor }) => {
      // Update stepData whenever the editor content changes
      setStepData(prevStepData => ({
        ...prevStepData,
        [currentStep]: editor.getHTML(),
      }));
    },
  }, [currentStep, action.data]); // Add dependencies

    useEffect(() => {
        const fetchUser = async () => {
            if (action.completedBy) {
                try {
                    const userData = await userManagementService.getUserById(action.completedBy);
                    setUser({ name: userData.name, photoURL: userData.profileImage });
                } catch (error) {
                    console.error("Error fetching user:", error);
                    setUser({ name: "Unknown User", photoURL: getDefaultProfileImage(null) });
                }
            }
        };

        fetchUser();
    }, [action.completedBy]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStepData(prevStepData => ({
      ...prevStepData,
      [currentStep]: e.target.value,
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStepData(prevStepData => ({
      ...prevStepData,
      [currentStep]: e.target.value,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const fileUrl = await taskService.uploadTaskAttachment(taskId, file);
      setStepData(prevStepData => ({
        ...prevStepData,
        [currentStep]: { fileUrl }, // Store as object for consistency
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

    const handleCompleteStep = () => {
        if (currentStep < (action.data?.steps?.length ?? 0) - 1) {
            setCurrentStep(currentStep + 1);
            // Load content for the next step into the editor
            editor?.commands.setContent(action.data.steps[currentStep + 1].data || '');
        } else {
            // If it's the last step, call onComplete with all accumulated data
            onComplete(action.id, stepData);
        }
    };

    const handlePreviousStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            // Load content for the previous step into the editor
            editor?.commands.setContent(action.data.steps[currentStep - 1].data || '');
        }
    };

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

    // Get the current step's data
    const currentStepData = action.data?.steps ? action.data.steps[currentStep] : null;

    return isOpen ? ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{action.title} - Step {currentStep + 1} of {action.data?.steps?.length || 1}</h2>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                <p className="text-gray-600 text-sm mb-4">{currentStepData?.description}</p>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                        {error}
                    </div>
                )}
                <div>
                    {/* Conditional rendering based on step type */}
                    {currentStepData ? (
                        <>
                            {currentStepData.type === 'text' && (
                                <input
                                    type="text"
                                    placeholder="Enter text..."
                                    value={stepData[currentStep] || ''}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 text-gray-900"
                                />
                            )}
                            {currentStepData.type === 'long_text' && (
                                <textarea
                                    placeholder="Enter long text..."
                                    value={stepData[currentStep] || ''}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 h-32 text-gray-900"
                                />
                            )}
                            {currentStepData.type === 'file_upload' && (
                                <div>
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                    />
                                    {stepData[currentStep]?.fileUrl && (
                                        <a href={stepData[currentStep].fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            View File
                                        </a>
                                    )}
                                    {isUploading && <span>Uploading...</span>}
                                </div>
                            )}
                            {currentStepData.type === 'approval' && (
                                <div>
                                    <p>Waiting for approval...</p>
                                </div>
                            )}
                            {currentStepData.type === 'date' && (
                                <input
                                    type="date"
                                    value={stepData[currentStep] || ''}
                                    onChange={handleDateChange}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                                />
                            )}
                            {currentStepData.type === 'document' && (
                                <>
                                    <EditorToolbar editor={editor} />
                                    <div className="tiptap-editor-styles max-h-screen overflow-y-auto">
                                        <EditorContent editor={editor} />
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <p>No data for this step.</p> // Handle case where currentStepData is null
                    )}
                </div>

                {action.completed && user && (
                    <div className="mt-4 flex items-center">
                        <img
                            src={user.photoURL || getDefaultProfileImage(user.name)}
                            alt={user.name}
                            className="w-8 h-8 rounded-full mr-2"
                        />
                        <span className="text-sm text-gray-600">
                            Completed by {user.name}
                        </span>
                    </div>
                )}

                <div className="mt-4 flex justify-end space-x-4">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        Cancelar
                    </button>
                    {currentStep > 0 && (
                        <button
                            onClick={handlePreviousStep}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                    )}
                    <button
                        onClick={handleCompleteStep}
                        disabled={isUploading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isUploading ? 'Uploading...' : (currentStep === (action.data?.steps?.length ?? 1) -1 ? 'Complete Action' : 'Next')}
                        {currentStep < (action.data?.steps?.length ?? 1) - 1 && <ChevronRight size={16} />}
                    </button>

                </div>
            </div>
        </div>,
        document.body
    ) : null;
};
