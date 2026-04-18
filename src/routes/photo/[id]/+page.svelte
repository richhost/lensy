<script lang="ts">
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import ExifInfo from '$lib/components/exif-info.svelte';

	let { data }: { data: PageData } = $props();

	let photo = $derived(data.photo);
	let prevId = $derived(data.prevId);
	let nextId = $derived(data.nextId);
	let prevPhoto = $derived(data.prevPhoto);
	let nextPhoto = $derived(data.nextPhoto);

	// ─── SEO ─────────────────────────────────────────────────────────────────────
	let photoTitle = $derived(photo.title || 'Abiee');
	let pageTitle = $derived(photoTitle);
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
	let structuredData = $derived(
		JSON.stringify({
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
			isPartOf: { '@type': 'ImageGallery', name: 'Lensy', url: siteUrl }
		})
	);

	// ─── Gallery ──────────────────────────────────────────────────────────────────
	let isZoomed = $state(false);
	let scrollerEl: HTMLElement | null = $state(null);

	// Guard against scrollend firing again while SvelteKit navigation is in flight
	let isNavigating = false;

	// Whenever the photo changes (SvelteKit soft-nav), snap back to center slot instantly
	$effect(() => {
		if (!scrollerEl) return;
		void photo.id; // reactive dependency
		isNavigating = false;
		isZoomed = false;
		scrollerEl.scrollTo({ left: scrollerEl.clientWidth, behavior: 'instant' });
	});

	// Wire scrollend via addEventListener — avoids TS attr issues with newer DOM events
	$effect(() => {
		const el = scrollerEl;
		if (!el) return;

		// Center on mount
		el.scrollTo({ left: el.clientWidth, behavior: 'instant' });

		function onScrollEnd() {
			if (isNavigating || !el) return;
			const vw = el.clientWidth;
			const { scrollLeft } = el;
			if (scrollLeft < vw * 0.5) {
				isNavigating = true;
				goto(`/photo/${prevId}`);
			} else if (scrollLeft > vw * 1.5) {
				isNavigating = true;
				goto(`/photo/${nextId}`);
			}
		}

		el.addEventListener('scrollend', onScrollEnd);
		return () => el.removeEventListener('scrollend', onScrollEnd);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') goto(`/photo/${nextId}`);
		else if (e.key === 'ArrowLeft') goto(`/photo/${prevId}`);
		else if (e.key === 'Escape') {
			if (isZoomed) isZoomed = false;
			else goto('/');
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
	<script type="application/ld+json">
		{structuredData}
	</script>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div
	class="relative h-dvh w-full font-sans text-[#111] antialiased transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] {isZoomed
		? 'bg-black'
		: 'bg-[#FDFBF7]'}"
>
	<!-- Back button -->
	{#if !isZoomed}
		<header
			transition:fade={{ duration: 300 }}
			class="pointer-events-none absolute top-0 right-0 left-0 z-50 flex items-center p-6"
		>
			<a
				href="/"
				class="group pointer-events-auto inline-flex h-10 items-center justify-center rounded-full border border-black/8 bg-white/70 px-4 text-sm font-medium backdrop-blur-xl transition-all hover:bg-white active:scale-95"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					class="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5"
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

	<!--
		CSS Scroll Snap strip: [prev | current | next]
		Starts scrolled to center (scrollLeft = clientWidth).
		scrollend detects which slot won and calls goto().
		overflow:hidden when zoomed prevents accidental swipe.
	-->
	<div
		bind:this={scrollerEl}
		class="gallery-scroller h-full w-full {isZoomed ? 'overflow-hidden' : ''}"
	>
		<!-- Prev slot -->
		<div class="gallery-slot">
			<img
				src={prevPhoto.url}
				alt={prevPhoto.title}
				loading="eager"
				class="max-h-[calc(100dvh-12rem)] max-w-full -translate-y-4 object-contain drop-shadow-2xl lg:max-h-[calc(100dvh-14rem)]"
			/>
		</div>

		<!-- Current slot — tap to toggle zoom -->
		<button
			class="gallery-slot outline-none {isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}"
			onclick={() => (isZoomed = !isZoomed)}
			aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
		>
			<img
				src={photo.url}
				alt={photo.title}
				class="max-w-full object-contain transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] {isZoomed
					? 'max-h-dvh'
					: 'max-h-[calc(100dvh-12rem)] -translate-y-4 drop-shadow-2xl lg:max-h-[calc(100dvh-14rem)]'}"
			/>
		</button>

		<!-- Next slot -->
		<div class="gallery-slot">
			<img
				src={nextPhoto.url}
				alt={nextPhoto.title}
				loading="eager"
				class="max-h-[calc(100dvh-12rem)] max-w-full -translate-y-4 object-contain drop-shadow-2xl lg:max-h-[calc(100dvh-14rem)]"
			/>
		</div>
	</div>

	<!-- Desktop nav arrows -->
	{#if !isZoomed}
		<a
			transition:fade={{ duration: 300 }}
			href={`/photo/${prevId}`}
			class="pointer-events-none absolute top-0 bottom-0 left-0 z-40 hidden w-[15vw] cursor-w-resize items-center justify-start opacity-0 transition-opacity duration-300 hover:pointer-events-auto hover:opacity-100 md:flex"
			aria-label="Previous photo"
		>
			<div
				class="ml-6 flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/80 backdrop-blur-xl transition-transform hover:scale-110"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4">
					<path
						d="M15 18l-6-6 6-6"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>
		</a>

		<a
			transition:fade={{ duration: 300 }}
			href={`/photo/${nextId}`}
			class="pointer-events-none absolute top-0 right-0 bottom-0 z-40 hidden w-[15vw] cursor-e-resize items-center justify-end opacity-0 transition-opacity duration-300 hover:pointer-events-auto hover:opacity-100 md:flex"
			aria-label="Next photo"
		>
			<div
				class="mr-6 flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/80 backdrop-blur-xl transition-transform hover:scale-110"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4">
					<path
						d="M9 18l6-6-6-6"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>
		</a>
	{/if}

	<!-- EXIF overlay -->
	<ExifInfo {photo} {isZoomed} />
</div>

<style>
	.gallery-scroller {
		display: flex;
		overflow-x: scroll;
		scroll-snap-type: x mandatory;
		overscroll-behavior-x: contain;
		touch-action: pan-x;
		scrollbar-width: none;
	}

	.gallery-scroller::-webkit-scrollbar {
		display: none;
	}

	.gallery-slot {
		flex: 0 0 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem 1rem 7rem;
		scroll-snap-align: center;
		scroll-snap-stop: always;
	}

	@media (min-width: 1024px) {
		.gallery-slot {
			padding: 6rem 6rem 8rem;
		}
	}
</style>
