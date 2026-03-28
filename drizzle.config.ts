import { defineConfig } from 'drizzle-kit';

// const isLocal = !process.env.CLOUDFLARE_ACCOUNT_ID;
const isLocal = true;

if (!isLocal) {
	if (!process.env.CLOUDFLARE_DATABASE_ID) throw new Error('CLOUDFLARE_DATABASE_ID is not set');
	if (!process.env.CLOUDFLARE_D1_TOKEN) throw new Error('CLOUDFLARE_D1_TOKEN is not set');
}

export default isLocal
	? defineConfig({
			schema: './src/lib/server/db/schema.ts',
			dialect: 'sqlite',
			out: './drizzle',
			verbose: true,
			strict: true
		})
	: defineConfig({
			schema: './src/lib/server/db/schema.ts',
			dialect: 'sqlite',
			driver: 'd1-http',
			dbCredentials: {
				accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
				databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
				token: process.env.CLOUDFLARE_D1_TOKEN!
			},
			verbose: true,
			strict: true
		});
