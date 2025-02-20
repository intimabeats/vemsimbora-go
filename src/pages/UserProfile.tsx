// src/pages/UserProfile.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { userManagementService } from '../services/UserManagementService';
import { projectService } from '../services/ProjectService';
import { taskService } from '../services/TaskService';
import { User, Mail, AlertTriangle } from 'lucide-react' // Import icons
import { getDefaultProfileImage } from "../utils/user";

interface UserProfileProps { }

export const UserProfile: React.FC<UserProfileProps> = () => {
    const { userId } = useParams<{ userId: string }>();
    const { currentUser } = useAuth();
    const [user, setUser] = useState<any>(null); // Use 'any' or a more specific type if you have one
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default gradient as a data URL
    const defaultCover = 'linear-gradient(to right, #4c51bf, #6a82fb)';

    useEffect(() => {
        const fetchUserProfile = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (!userId) {
                    throw new Error("User ID is required.");
                }

                const userData = await userManagementService.getUserById(userId);
                setUser(userData);

                // Fetch projects where the user is a manager or assigned to tasks
                const allProjects = await projectService.fetchProjects();
                // The filter logic here was incorrect.  It was filtering *before* the
                // tasks were fetched, leading to incorrect results.  We need to fetch
                // ALL tasks, *then* filter.
                const allTasks = await taskService.fetchTasks(); // Fetch ALL tasks
                const userProjects = allProjects.data.filter(project =>
                    project.managers.includes(userId) ||
                    allTasks.data.some(task => task.projectId === project.id && task.assignedTo === userId) // Correct filter
                );

                setProjects(userProjects);


                // Fetch tasks assigned to the user
                const userTasks = await taskService.fetchTasks({ assignedTo: userId });
                setTasks(userTasks.data);

            } catch (err: any) {
                setError(err.message || "Failed to load user profile.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, [userId]); // Correct dependency: userId

    if (isLoading) {
        return <Layout isLoading={true} />;  // Or a loading spinner within the profile area
    }

    if (error) {
        return (
            <Layout>
                <div className="p-4 bg-red-100 text-red-700 border border-red-400 rounded flex items-center">
                    <AlertTriangle className="mr-2" size={20} />
                    {error}
                </div>
            </Layout>
        );
    }

    if (!user) {
        return (
            <Layout>
                <div className="p-4 bg-yellow-100 text-yellow-700 border border-yellow-400 rounded flex items-center">
                    <AlertTriangle className="mr-2" size={20} />
                    User not found.
                </div>
            </Layout>
        );
    }

    const isOwnProfile = currentUser?.uid === userId;

    return (
        <Layout role={currentUser?.role}>
            <div className="container mx-auto p-6">
                <div className="bg-white shadow rounded-lg p-6">
                    {/* Cover Photo */}
                    <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: user.coverImage ? `url(${user.coverImage})` : defaultCover,
                        }}
                    >
                        {/* Semi-transparent overlay (only if it's an image) */}
                        {user.coverImage && (
                            <div className="absolute inset-0 bg-black opacity-30 rounded-t-xl"></div>
                        )}
                    </div>
                    </div>

                    {/* Profile Details */}
                    <div className="relative mt-[-6rem] p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <img
                                    src={user.profileImage || getDefaultProfileImage(user.name)}
                                    alt={user.name}
                                    className="w-24 h-24 rounded-full border-4 border-white object-cover mr-4"
                                />
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                                    <p className="text-gray-600 capitalize">{user.role}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p> {/* Consider masking */}
                                </div>
                            </div>
                            {isOwnProfile && (
                                <Link
                                    to="/profile"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    Edit Profile
                                </Link>
                            )}
                        </div>

                        <div className="mt-4">
                            <h2 className="text-lg font-semibold">Bio</h2>
                            <p className="text-gray-600">{user.bio || 'No bio provided.'}</p>
                        </div>

                        <div className="mt-6">
                            <h2 className="text-lg font-semibold">Projects</h2>
                            {projects.length > 0 ? (
                                <ul className="mt-2">
                                    {projects.map((project) => (
                                        <li key={project.id} className="text-blue-600 hover:underline">
                                            <Link to={`/admin/projects/${project.id}`}>{project.name}</Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">Not participating in any projects.</p>
                            )}
                        </div>

                        <div className="mt-6">
                            <h2 className="text-lg font-semibold">Tasks</h2>
                            {tasks.length > 0 ? (
                                <div className="mt-2 space-y-2">
                                    {tasks.map((task) => (
                                        <div key={task.id} className="border rounded-lg p-2">
                                            <Link to={`/tasks/${task.id}`} className="text-blue-600 hover:underline">{task.title}</Link>
                                            <span className="ml-2 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                                                {task.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">No tasks assigned.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
