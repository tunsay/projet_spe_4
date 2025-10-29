"use client";

export default function Page() {
    return (
        <main className="min-h-screen bg-gray-50 py-16">
            <div className="mx-auto max-w-5xl px-4">
                <section className="rounded-2xl border border-slate-200 bg-white px-8 py-12 shadow-sm">
                    <h1 className="text-3xl font-semibold text-slate-900">
                        Bienvenue dans l&apos;espace collaboratif
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm text-slate-600">
                        Retrouvez vos documents, organisez vos dossiers et
                        collaborez avec votre équipe en temps réel. Utilisez la
                        barre de navigation pour rejoindre rapidement la liste
                        des documents, vos paramètres de profil ou l&apos;espace
                        d’administration.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <a
                            href="/documents"
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Accéder aux documents
                        </a>
                        <a
                            href="/profile"
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                        >
                            Gérer mon profil
                        </a>
                    </div>
                </section>
            </div>
        </main>
    );
}
