"use client"
import "../../app/globals.css";
import { useEffect, useState } from "react";
import ModalAddUser from "@/app/components/ModalAddUser";

export default function Page() {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
  	const [error, setError] = useState<string | null>(null);
  	const [modalOpen, setModalOpen] = useState(false);


	useEffect(() => {
		fetch(`/admin/users`)
			.then((res) => res.json())
			.then((data) => {
				setUsers(data)
				setLoading(false)
			})
	}, [])

	async function addUser(e: React.FormEvent, {email, password, displayName, role}: {email: string, password : string, displayName: string, role: "user"|"admin"}) {
		e.preventDefault();
    	setError(null);

		if (!email || !password || !displayName || !role) {
			setError("Please enter all the informations.");
			return;
		}

		try {
			fetch(`/admin/users`, {
				method: 'POST',
				body: JSON.stringify({
					"email": email,
					"password": password,
					"display_name": displayName,
					"role": role
				})
			})
			.then((res) => res.json())
			.then((data) => {
				setUsers(
					[
						...users,
						data
					]
				);
				setModalOpen(false)
			})
		} catch (err) {
			setError("Network error");
		}
	}

	async function blockUser(userId) {
		setError(null);
		fetch(`/admin/users/${userId}/block`)
			.then((res) => res.json())
			.then((data) => {
				setUsers(data)
			})
	}

	return (<>
		<h1 className="relative overflow-x-auto my-10 mx-auto">Admin</h1>
		<button onClick={() => setModalOpen(true) } data-modal-target="add-user-modal" data-modal-toggle="authentication-modal" className="block text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" type="button">
			Ajouter un utilisateur
		</button>
		{loading && (
			<div className="flex items-center justify-center w-56 h-56 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
				<div className="px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">chargement...</div>
			</div>
		)}
		<div className="relative overflow-x-auto">
			<table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
				<thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
					<tr>
						<th scope="col" className="px-6 py-3">
							Username
						</th>
						<th scope="col" className="px-6 py-3">
							mail
						</th>
						<th scope="col" className="px-6 py-3">
						</th>
					</tr>
				</thead>
				<tbody>
					{users.map( (user, index) => (
					<tr key={"user-" + index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
						<th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
							{user.display_name}
						</th>
						<td className="px-6 py-4">
							{user.email}
						</td>
						{user.is_blocked ? (
							<td className="px-6 py-4">
								<button type="button" userId={user.id} className="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900">Unblock</button>
							</td>) : (
							<td className="px-6 py-4">
								<button type="button" onClick={() => this.blockUser(user.id)} className="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900">Block</button>
							</td>
						)}
					</tr>
					))}
				</tbody>
			</table>
		</div>

		{/* modal */}
		{modalOpen && 
			<ModalAddUser submitForm={addUser}/>
		}
	</>)
}