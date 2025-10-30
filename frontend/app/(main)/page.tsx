"use client";

export default function Page() {
    return (
        // Arrière-plan global adapté au dark mode
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
            <div className="mx-auto max-w-5xl px-4">
                <section className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-8 py-12 shadow-xl">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        Bienvenue dans l&apos;espace collaboratif 🚀
                    </h1>
                    <p className="mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-400">
                        Retrouvez vos documents, organisez vos dossiers et
                        collaborez avec votre équipe en temps réel. Utilisez la
                        barre de navigation pour rejoindre rapidement la liste
                        des documents, vos paramètres de profil ou l&apos;espace
                        d’administration.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                        {/* Bouton Primaire (Accéder aux documents) */}
                        <a
                            href="/documents"
                            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition duration-150"
                        >
                            Accéder aux documents
                        </a>
                        {/* Bouton Secondaire (Gérer mon profil) */}
                        <a
                            href="/profile"
                            className="rounded-lg border border-slate-300 dark:border-gray-600 px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition duration-150"
                        >
                            Gérer mon profil
                        </a>
                    </div>
                </section>
            </div>
        </main>
    );
}
