import { getPhotos } from '$lib/remotes/photos.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const photos = await getPhotos();

	return {
		photos
	};
};
