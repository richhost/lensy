import { getRequestEvent, query } from '$app/server';
import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

async function getSession() {
	const event = getRequestEvent();
	return auth.api.getSession({ headers: event.request.headers });
}

export const requireAuth = query(async () => {
	const session = await getSession();
	if (!session?.user) redirect(302, '/login');
	return session.user;
});
