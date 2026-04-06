import { getPhotos } from '$lib/remotes/photos.remote';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const photos = await getPhotos();
	const origin = url.origin;

	const pages = [
		{
			loc: origin,
			lastmod: new Date().toISOString().split('T')[0],
			changefreq: 'daily',
			priority: '1.0'
		},
		...photos.map((photo) => ({
			loc: `${origin}/photo/${photo.id}`,
			lastmod: photo.updatedAt
				? new Date(photo.updatedAt).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0],
			changefreq: 'monthly' as const,
			priority: '0.8'
		}))
	];

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(page) => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
