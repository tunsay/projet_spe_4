"use client"
import "../../app/globals.css";
import { useEffect, useState } from "react";

export default function Page() {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch(process.env.NEXT_API_URL + '/admin/users')
			.then((res) => res.json())
			.then((data) => {
				setUsers(data)
				setLoading(false)
			})
	}, [])



	return (<>
		<h1 class="relative overflow-x-auto my-10 mx-auto">Admin</h1>
		{loading && (
			<div class="flex items-center justify-center w-56 h-56 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
				<div class="px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">loading...</div>
			</div>
		)}
		<div class="relative overflow-x-auto">
			<table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
				<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
					<tr>
						<th scope="col" class="px-6 py-3">
							Username
						</th>
						<th scope="col" class="px-6 py-3">
							mail
						</th>
						<th scope="col" class="px-6 py-3">
						</th>
					</tr>
				</thead>
				<tbody>
					{users.map( (user, index) => (
					<tr key={"user-" + index} class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
						<th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
							{user.display_name}
						</th>
						<td class="px-6 py-4">
							{user.email}
						</td>
						{user.is_blocked ? (
							<td class="px-6 py-4">
								<button type="button" class="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900">Unblock</button>
							</td>) : (
							<td class="px-6 py-4">
								<button type="button" class="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900">Block</button>
							</td>
						)}
					</tr>
					))}
				</tbody>
			</table>
		</div>

	</>)
}