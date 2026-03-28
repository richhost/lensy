import { command, getRequestEvent } from '$app/server';
import * as v from 'valibot';
import { APIError } from 'better-auth/api';

export const signUp = command(
	v.object({ name: v.string(), email: v.string(), password: v.string() }),
	async ({ name, email, password }) => {
		const { auth } = getRequestEvent()!.locals;
		try {
			await auth.api.signUpEmail({ body: { name, email, password } });
		} catch (error) {
			if (error instanceof APIError) {
				throw new Error(error.message || 'This email is already registered');
			}
			console.error(error);
			throw new Error('Registration failed, please try again later');
		}
		return { success: true };
	}
);
