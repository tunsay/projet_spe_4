"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl } from "@/lib/api";
import { handleUnauthorized } from "@/lib/auth";

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
};

export default function AdminUsersPage() {
    const router = useRouter();
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

            if (await handleUnauthorized(response, router)) {
                setUsers([]);
                return;
            }

            if (response.status === 403) {
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
    }, [router]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleBlockToggle = useCallback(
        async (userId: number | string, isBlocked: boolean) => {
            const endpoint = isBlocked ? "unblock" : "block";
            const action = isBlocked ? "Déblocage" : "Blocage";

            setUsers((prevUsers) =>
                prevUsers.map((u) =>
                    u.id === userId ? { ...u, is_blocked: !isBlocked } : u
                )
            );

            try {
                const response = await fetch(
                    `${ADMIN_ENDPOINTS.USERS}/${userId}/${endpoint}`,
                    {
                        method: "PUT",
                        credentials: "include",
                    }
                );

                if (await handleUnauthorized(response, router)) {
                    setUsers((prevUsers) =>
                        prevUsers.map((u) =>
                            u.id === userId
                                ? { ...u, is_blocked: isBlocked }
                                : u
                        )
                    );
                    return;
                }

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
            } catch {
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
        [router]
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

            if (await handleUnauthorized(response, router)) {
                return;
            }

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
        <main className="mx-auto max-w-6xl px-4 py-10 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <h1 className="text-3xl font-extrabold mb-8 text-gray-900 dark:text-gray-100">
                Administration des Utilisateurs
            </h1>

            {/* Notification Bar */}
            {notificationMessage && (
                <div
                    className={`mb-6 text-sm p-4 rounded-lg border ${
                        isNotificationError
                            ? "text-red-800 bg-red-100 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700"
                            : "text-emerald-800 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                    }`}
                    role="alert"
                >
                    {notificationMessage}
                </div>
            )}

            {/* Formulaire de Création */}
            <form
                onSubmit={handleFormSubmit}
                className="p-6 mb-12 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
            >
                <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
                    Inscrire un nouvel utilisateur
                </h2>

                <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
                    <input
                        type="email"
                        name="email"
                        required
                        placeholder="Email"
                        value={newUserData.email}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white p-2 text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />

                    <input
                        type="text"
                        name="display_name"
                        required
                        placeholder="Nom d'affichage"
                        value={newUserData.display_name}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white p-2 text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />

                    <input
                        type="password"
                        name="password"
                        required
                        placeholder="Mot de passe"
                        value={newUserData.password}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white p-2 text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />

                    <select
                        name="role"
                        value={newUserData.role}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white p-2 text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    >
                        <option value="user">Utilisateur standard</option>
                        <option value="admin">Administrateur</option>
                    </select>
                </div>

                <div className="mt-8 flex justify-end items-center">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition duration-150"
                    >
                        {isSubmitting
                            ? "Inscription en cours..."
                            : "Inscrire l'utilisateur"}
                    </button>
                </div>
            </form>

            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                Liste des Utilisateurs
            </h2>

            {loading ? (
                <div className="flex items-center justify-center h-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-2 text-sm font-medium leading-none text-center text-indigo-800 bg-indigo-200 rounded-full animate-pulse dark:bg-indigo-900 dark:text-indigo-200">
                        Chargement des utilisateurs...
                    </div>
                </div>
            ) : users.length === 0 ? (
                <div className="p-4 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    Aucun utilisateur trouvé.
                </div>
            ) : (
                <div className="relative overflow-x-auto shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
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
                                    className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-100"
                                >
                                    <th
                                        scope="row"
                                        className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
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
                                                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
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
                                            className={`font-medium rounded-lg text-sm px-4 py-2 transition duration-150 shadow-md ${
                                                user.is_blocked
                                                    ? "text-white bg-emerald-600 hover:bg-emerald-700"
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
