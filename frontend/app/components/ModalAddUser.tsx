import { useState } from "react";

export default function modalAddUser({ submitForm, setModalOpen }) {
   
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [role, setRole] = useState("");

    return (
        <div id="add-user-modal" tabindex="-1" class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
			<div class="relative p-4 w-full max-w-md max-h-full">
				<div class="relative bg-white rounded-lg shadow-sm dark:bg-gray-700">
					<div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
							Ajouter un utilisateur
						</h2>
						<button onClick={() => setModalOpen(false)} type="button" class="end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide="authentication-modal">
							<svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
								<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
							</svg>
							<span class="sr-only">Fermer le modal</span>
						</button>
					</div>
					<div class="p-4 md:p-5">
						<form class="space-y-4" onSubmit={ (e) => submitForm(e, {email, password, displayName, role}) }>
							<div>
								<label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Email de l'utilisateur</label>
								<input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white" placeholder="name@company.com" required />
							</div>
							<div>
								<label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Mot de passe</label>
								<input type="password" name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white" required />
							</div>
							<div>
								<label for="display_name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nom de l'utilisateur</label>
								<input type="text" name="display_name" id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white" placeholder="Antoine" required />
							</div>
							<div>
								<label for="category" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Rôle de l'utilisateur</label>
								<select id="category" value={role} onChange={(e) => setRole(e.target.value)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500">
									<option selected="">Sélectionner le rôle</option>
									<option value="admin">Admin</option>
									<option value="user">Utilisateur</option>
								</select>
							</div>
							<button type="submit" class="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Ajouter l'utilisateur</button>
						</form>
					</div>
				</div>
			</div>
		</div>
    )
}
