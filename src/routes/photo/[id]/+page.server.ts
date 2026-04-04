import { getPhoto, getPhotos } from '$lib/remotes/photos.remote';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [photo, allPhotos] = await Promise.all([getPhoto(params.id), getPhotos()]);

	if (!photo) {
		error(404, 'Photo not found');
	}

	const index = allPhotos.findIndex((p) => p.id === params.id);
	const prevId = index > 0 ? allPhotos[index - 1].id : allPhotos[allPhotos.length - 1].id;
	const nextId = index < allPhotos.length - 1 ? allPhotos[index + 1].id : allPhotos[0].id;

	return {
		photo,
		prevId,
		nextId
	};
};
