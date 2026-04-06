<script lang="ts">
	import { fade, blur } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import ExifInfo from '$lib/components/exif-info.svelte';

	let { data }: { data: PageData } = $props();

	// Create derived states so they react to navigation changes gracefully
	let photo = $derived(data.photo);
	let prevId = $derived(data.prevId);
	let nextId = $derived(data.nextId);

	let isZoomed = $state(false);

	// SEO derived values
	let photoTitle = $derived(photo.title || 'Abiee');
	let pageTitle = $derived(`${photoTitle}`);
	let photoDescription = $derived(
		photo.description ||
			[
				photo.make,
				photo.model,
				photo.lens,
				photo.focalLength ? `${photo.focalLength}mm` : null,
				photo.aperture,
				photo.shutterSpeed,
				photo.iso ? `ISO ${photo.iso}` : null
			]
				.filter(Boolean)
				.join(' · ')
	);
	let siteUrl = $derived(page.url.origin);
	let ogImageUrl = $derived(
		`${siteUrl}/og?title=${encodeURIComponent(photoTitle)}&description=${encodeURIComponent(photoDescription)}&image=${encodeURIComponent(photo.url)}`
	);

	// Handle keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') {
			goto(`/photo/${nextId}`);
		} else if (e.key === 'ArrowLeft') {
			goto(`/photo/${prevId}`);
		} else if (e.key === 'Escape') {
			if (isZoomed) {
				isZoomed = false;
			} else {
				goto('/');
			}
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={photoDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={photoDescription} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:type" content="article" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={photoDescription} />
	<meta name="twitter:image" content={ogImageUrl} />

	<!-- Structured Data: ImageObject -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'ImageObject',
		name: photoTitle,
		description: photoDescription,
		contentUrl: photo.url,
		width: photo.width,
		height: photo.height,
		...(photo.takenAt && { dateCreated: new Date(photo.takenAt).toISOString() }),
		exifData: [
			photo.make && { '@type': 'PropertyValue', name: 'cameraMake', value: photo.make },
			photo.model && { '@type': 'PropertyValue', name: 'cameraModel', value: photo.model },
			photo.lens && { '@type': 'PropertyValue', name: 'lens', value: photo.lens },
			photo.focalLength && {
				'@type': 'PropertyValue',
				name: 'focalLength',
				value: `${photo.focalLength}mm`
			},
			photo.aperture && { '@type': 'PropertyValue', name: 'fNumber', value: photo.aperture },
			photo.iso && { '@type': 'PropertyValue', name: 'isoSpeed', value: String(photo.iso) },
			photo.shutterSpeed && {
				'@type': 'PropertyValue',
				name: 'exposureTime',
				value: photo.shutterSpeed
			}
		].filter(Boolean),
		isPartOf: {
			'@type': 'ImageGallery',
			name: 'Lensy',
			url: siteUrl
		}
	})}</script>`}
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div
	class="relative flex h-dvh w-full items-center justify-center overflow-hidden font-sans text-[#111] antialiased transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] {isZoomed
		? 'bg-black'
		: 'bg-[#FDFBF7]'}"
>
	<!-- Top Navigation -->
	{#if !isZoomed}
		<header
			transition:fade={{ duration: 300 }}
			class="pointer-events-none absolute top-0 right-0 left-0 z-50 flex items-center justify-between p-6"
		>
			<a
				href="/"
				class="group pointer-events-auto inline-flex h-10 items-center justify-center rounded-full border border-black/5 bg-white/60 px-4 text-sm font-medium shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all hover:bg-white hover:shadow-[0_16px_48px_rgba(0,0,0,0.1)] active:scale-95"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					class="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
				>
					<path
						d="M19 12H5M5 12L12 19M5 12L12 5"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				Gallery
			</a>
		</header>
	{/if}

	<!-- Main Image Area -->
	<button
		onclick={() => (isZoomed = !isZoomed)}
		aria-label="Toggle zoom"
		class="relative grid h-full w-full place-items-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none *:col-start-1 *:row-start-1 {isZoomed
			? 'cursor-zoom-out p-0'
			: 'cursor-zoom-in p-4 pb-28 lg:p-24 lg:pb-32'}"
	>
		{#key photo.id}
			<img
				src={photo.url}
				alt={photo.title}
				class="max-w-full object-contain transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] {isZoomed
					? 'max-h-dvh scale-100 drop-shadow-none'
					: 'max-h-[calc(100dvh-12rem)] -translate-y-4 drop-shadow-2xl lg:max-h-[calc(100dvh-14rem)]'}"
				in:blur={{ amount: 10, duration: 800, delay: 100 }}
				out:fade={{ duration: 300 }}
			/>
		{/key}
	</button>

	<!-- Navigation Areas (Clickable sides) -->
	{#if !isZoomed}
		<a
			transition:fade={{ duration: 300 }}
			href={`/photo/${prevId}`}
			class="absolute top-0 bottom-0 left-0 z-40 flex w-[20vw] cursor-w-resize items-center justify-start opacity-0 transition-opacity duration-300 hover:opacity-100"
			aria-label="Previous photo"
		>
			<div
				class="ml-6 flex h-12 w-12 items-center justify-center rounded-full border border-black/5 bg-white/80 text-[#111] shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all hover:scale-110 hover:bg-white hover:shadow-[0_16px_48px_rgba(0,0,0,0.1)]"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5"
					><path
						d="M15 18l-6-6 6-6"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/></svg
				>
			</div>
		</a>

		<a
			transition:fade={{ duration: 300 }}
			href={`/photo/${nextId}`}
			class="absolute top-0 right-0 bottom-0 z-40 flex w-[20vw] cursor-e-resize items-center justify-end opacity-0 transition-opacity duration-300 hover:opacity-100"
			aria-label="Next photo"
		>
			<div
				class="mr-6 flex h-12 w-12 items-center justify-center rounded-full border border-black/5 bg-white/80 text-[#111] shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all hover:scale-110 hover:bg-white hover:shadow-[0_16px_48px_rgba(0,0,0,0.1)]"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5"
					><path
						d="M9 18l6-6-6-6"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/></svg
				>
			</div>
		</a>
	{/if}

	<!-- Floating Bottom EXIF Info (Camarts style) -->
	<ExifInfo {photo} {isZoomed} />
</div>
