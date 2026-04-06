<script lang="ts">
	import type { PageData } from './$types';
	import { fade, fly } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	const pageTitle = 'Lensy — Editorial Photography Gallery';
	const pageDescription =
		'Shapes in Light — An editorial curation of visual storytelling. Capturing brutalist horizons, delicate glass layers, and the profound depth of human stillness.';
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	{#if data.photos.length > 0}
		<meta property="og:image" content={data.photos[0].url} />
	{/if}
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	{#if data.photos.length > 0}
		<meta name="twitter:image" content={data.photos[0].url} />
	{/if}

	<!-- Structured Data: ImageGallery -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'ImageGallery',
		name: 'Lensy — Shapes in Light',
		description: pageDescription,
		image: data.photos.slice(0, 5).map((p) => ({
			'@type': 'ImageObject',
			contentUrl: p.url,
			name: p.title || 'Untitled',
			description: p.description || `${p.make || ''} ${p.model || ''} · ${p.focalLength}mm ${p.aperture}`.trim()
		}))
	})}</script>`}
</svelte:head>

<div
	class="min-h-dvh overflow-x-hidden bg-[#FDFBF7] font-sans text-[#111] antialiased selection:bg-black/10"
>
	<!-- Ambient Background Gradients -->
	<div
		class="pointer-events-none fixed inset-0 z-0 flex items-start justify-center overflow-hidden opacity-60"
	>
		<div
			class="h-[100vw] w-screen max-w-300 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03)_0,transparent_50%)] mix-blend-multiply blur-3xl"
		></div>
	</div>

	<main class="relative z-10 mx-auto max-w-400 px-4 py-16 md:px-8 lg:px-12 lg:py-24">
		<!-- Hero Section -->
		<section
			class="max-w-4xl animate-in duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] fill-mode-both fade-in slide-in-from-bottom-16"
		>
			<div
				class="mb-8 inline-flex items-center rounded-full border border-black/10 bg-black/5 px-4 py-1.5 backdrop-blur-md"
			>
				<div class="mr-2.5 h-1.5 w-1.5 rounded-full bg-black/60"></div>
				<span class="text-[10px] font-medium tracking-[0.2em] text-black/60 uppercase"
					>Soft Structuralism Design</span
				>
			</div>
			<h1 class="text-5xl leading-[0.95] font-medium tracking-tighter sm:text-7xl lg:text-[7rem]">
				Shapes<br />
				<span class="text-black/30">in Light.</span>
			</h1>
			<p class="mt-8 max-w-lg text-lg leading-relaxed font-light text-black/50">
				An editorial curation of visual storytelling. Capturing brutalist horizons, delicate glass
				layers, and the profound depth of human stillness.
			</p>
		</section>

		<!-- Ethereal Asymmetrical Bento Grid (Masonry) -->
		<section class="mt-32 columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4" aria-label="Photography collection">
			{#each data.photos as photo, i}
				<div
					class="group relative mb-6 break-inside-avoid overflow-hidden rounded-[2rem] border border-black/5 bg-white p-1.5 ring-1 ring-black/5 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/5"
					style="animation: fade-in-up 0.8s cubic-bezier(0.32, 0.72, 0, 1) forwards; animation-delay: {i *
						100}ms;"
				>
					<a
						href="/photo/{photo.id}"
						class="relative block overflow-hidden rounded-[calc(2rem-0.375rem)] bg-black/5"
					>
						<!-- Image -->
						<img
							src={photo.url}
							alt={photo.title}
							loading="lazy"
							class="h-auto w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 group-hover:rotate-1"
						/>

						<!-- Hover Overlay / Metadata Info -->
						<div
							class="absolute inset-0 z-10 bg-linear-to-t from-[#FDFBF7]/95 via-[#FDFBF7]/0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
						>
							<div
								class="absolute right-0 bottom-0 left-0 translate-y-4 p-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-y-0"
							>
								<h2 class="mb-1 text-xl font-medium tracking-tight text-[#111]">{photo.title}</h2>
								<div
									class="flex items-center space-x-3 font-mono text-xs tracking-wider text-black/60"
								>
									<span>{photo.focalLength}mm</span>
									<div class="h-1 w-1 rounded-full bg-black/20"></div>
									<span>{photo.aperture}</span>
								</div>
							</div>
						</div>

						<!-- "Button-in-button" Interaction Hint -->
						<div
							class="absolute top-4 right-4 isolate z-20 flex h-10 w-10 scale-90 items-center justify-center rounded-full border border-black/10 bg-white/90 opacity-0 shadow-sm backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-100 group-hover:opacity-100"
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								class="h-4 w-4 text-black transition-transform hover:translate-x-px hover:-translate-y-px"
							>
								<path
									d="M7 17L17 7M17 7H7M17 7V17"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</div>
					</a>
				</div>
			{/each}
		</section>
	</main>
</div>

<style>
	@keyframes fade-in-up {
		0% {
			opacity: 0;
			transform: translateY(40px);
			filter: blur(10px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
			filter: blur(0);
		}
	}
</style>
