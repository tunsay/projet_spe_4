"use client";
import React, { useEffect, useState, useCallback } from "react";
import { buildApiUrl } from "@/lib/api";

// --- Types et Endpoints ---
interface User {
    id: number | string;
    display_name: string;
    email: string;
    is_blocked: boolean;
    role: "admin" | "user";
}

interface NewUserData {
    email: string;
    display_name: string;
    password: string;
    role: "admin" | "user";
}

const ADMIN_ENDPOINTS = {
    USERS: buildApiUrl("/api/admin/users"),
    BLOCK: buildApiUrl("/api/admin/users/block"),
    UNBLOCK: buildApiUrl("/api/admin/users/unblock"),
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [notificationMessage, setNotificationMessage] = useState<
        string | null
    >(null);
    const [isNotificationError, setIsNotificationError] = useState(false);

    const [newUserData, setNewUserData] = useState<NewUserData>({
        email: "",
        display_name: "",
        password: "",
        role: "user",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNotification = (message: string, isError: boolean) => {
        setNotificationMessage(message);
        setIsNotificationError(isError);
        setTimeout(() => setNotificationMessage(null), 5000);
    };

    const handleUserCreated = (newUser: User) => {
        setUsers((prevUsers) => [newUser, ...prevUsers]);
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setNotificationMessage(null);
        try {
            const response = await fetch(ADMIN_ENDPOINTS.USERS, {
                credentials: "include",
            });

            if (response.status === 401 || response.status === 403) {
                handleNotification(
                    "Accès non autorisé. Seuls les administrateurs peuvent voir cette page.",
                    true
                );
                setUsers([]);
                return;
            }

            if (!response.ok) {
                const body = await response.json().catch(() => ({
                    message: `Erreur HTTP ${response.status}`,
                }));
                throw new Error(
                    body.message ||
                        `Erreur lors du chargement des utilisateurs: ${response.status}`
                );
            }

            const data: User[] = await response.json();
            setUsers(data);
        } catch (err) {
            handleNotification(
                err instanceof Error
                    ? err.message
                    : "Une erreur inconnue est survenue lors du chargement des données.",
                true
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleBlockToggle = useCallback(
        async (userId: number | string, isBlocked: boolean) => {
            const endpoint = isBlocked
                ? ADMIN_ENDPOINTS.UNBLOCK
                : ADMIN_ENDPOINTS.BLOCK;
            const action = isBlocked ? "Déblocage" : "Blocage";

            setUsers((prevUsers) =>
                prevUsers.map((u) =>
                    u.id === userId ? { ...u, is_blocked: !isBlocked } : u
                )
            );

            try {
                const response = await fetch(`${endpoint}/${userId}`, {
                    method: "POST",
                    credentials: "include",
                });

                if (!response.ok) {
                    setUsers((prevUsers) =>
                        prevUsers.map((u) =>
                            u.id === userId
                                ? { ...u, is_blocked: isBlocked }
                                : u
                        )
                    );
                    const body = await response
                        .json()
                        .catch(() => ({ message: `${action} échoué` }));
                    handleNotification(
                        body.message ||
                            `${action} a échoué. Code: ${response.status}`,
                        true
                    );
                } else {
                    handleNotification(
                        `${action} effectué avec succès.`,
                        false
                    );
                }
            } catch (err) {
                setUsers((prevUsers) =>
                    prevUsers.map((u) =>
                        u.id === userId ? { ...u, is_blocked: isBlocked } : u
                    )
                );
                handleNotification(
                    `${action} a échoué en raison d'une erreur réseau.`,
                    true
                );
            }
        },
        []
    );

    const handleFormChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setNewUserData({
            ...newUserData,
            [e.target.name]: e.target.value as "admin" | "user" | string,
        });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch(ADMIN_ENDPOINTS.USERS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(newUserData),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({
                    message: `Erreur HTTP ${response.status}`,
                }));
                throw new Error(
                    body.message || `Échec de l'inscription: ${response.status}`
                );
            }

            const newUser: User = await response.json();
            handleUserCreated(newUser);

            setNewUserData({
                email: "",
                display_name: "",
                password: "",
                role: "user",
            });
            handleNotification("Utilisateur créé avec succès !", false);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Erreur inconnue lors de l'inscription.";
            handleNotification(`Échec de l'inscription: ${message}`, true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="mx-auto max-w-6xl px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                Administration des Utilisateurs
            </h1>

            {notificationMessage && (
                <div
                    className={`mb-6 text-sm p-4 rounded-lg border ${
                        isNotificationError
                            ? "text-red-800 bg-red-100 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700"
                            : "text-green-800 bg-green-100 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700"
                    }`}
                    role="alert"
                >
                    {notificationMessage}
                </div>
            )}

            <form
                onSubmit={handleFormSubmit}
                className="p-6 mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
            >
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Inscrire un nouvel utilisateur
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="email"
                        name="email"
                        required
                        placeholder="Email"
                        value={newUserData.email}
                        onChange={handleFormChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />

                    <input
                        type="text"
                        name="display_name"
                        required
                        placeholder="Nom d'affichage"
                        value={newUserData.display_name}
                        onChange={handleFormChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />

                    <input
                        type="password"
                        name="password"
                        required
                        placeholder="Mot de passe"
                        value={newUserData.password}
                        onChange={handleFormChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />

                    <select
                        name="role"
                        value={newUserData.role}
                        onChange={handleFormChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="user">Utilisateur standard</option>
                        <option value="admin">Administrateur</option>
                    </select>
                </div>

                <div className="mt-6 flex justify-end items-center">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition duration-150"
                    >
                        {isSubmitting
                            ? "Inscription en cours..."
                            : "Inscrire l'utilisateur"}
                    </button>
                </div>
            </form>

            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100 mt-12">
                Liste des Utilisateurs
            </h2>

            {loading ? (
                <div className="flex items-center justify-center h-20">
                    <div className="px-3 py-1 text-sm font-medium leading-none text-center text-indigo-800 bg-indigo-200 rounded-full animate-pulse dark:bg-indigo-900 dark:text-indigo-200">
                        Chargement des utilisateurs...
                    </div>
                </div>
            ) : users.length === 0 ? (
                <div className="p-4 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                    Aucun utilisateur trouvé.
                </div>
            ) : (
                <div className="relative overflow-x-auto shadow-xl sm:rounded-lg">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400 border-b dark:border-gray-600">
                            <tr>
                                <th scope="col" className="px-6 py-3">
                                    Nom d&apos;utilisateur
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Email
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Statut
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Rôle
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Actions de compte
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-100"
                                >
                                    <th
                                        scope="row"
                                        className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                                    >
                                        {user.display_name}
                                    </th>
                                    <td className="px-6 py-4">{user.email}</td>

                                    <td className="px-6 py-4 font-semibold">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                user.is_blocked
                                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                                            }`}
                                        >
                                            {user.is_blocked
                                                ? "Bloqué"
                                                : "Actif"}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 font-semibold">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                user.role === "admin"
                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                            }`}
                                        >
                                            {user.role === "admin"
                                                ? "ADMIN"
                                                : "STANDARD"}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleBlockToggle(
                                                    user.id,
                                                    user.is_blocked
                                                )
                                            }
                                            className={`font-semibold rounded-lg text-sm px-5 py-2.5 transition duration-150 shadow-md ${
                                                user.is_blocked
                                                    ? "text-white bg-cyan-600 hover:bg-cyan-700"
                                                    : "text-white bg-red-600 hover:bg-red-700"
                                            }`}
                                        >
                                            {user.is_blocked
                                                ? "Débloquer"
                                                : "Bloquer"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
