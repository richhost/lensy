<script lang="ts">
	import { fade, blur } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	// Create derived states so they react to navigation changes gracefully
	let photo = $derived(data.photo);
	let prevId = $derived(data.prevId);
	let nextId = $derived(data.nextId);

	let isZoomed = $state(false);

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
	{#if !isZoomed}
		<div
			transition:fade={{ duration: 300 }}
			class="pointer-events-none absolute bottom-8 left-1/2 z-50 grid w-[90%] max-w-fit -translate-x-1/2 place-items-center [&>*]:col-start-1 [&>*]:row-start-1"
		>
			{#key photo.id}
				<div class="flex flex-col items-center justify-center gap-3">
					<!-- EXIF Pill -->
					<div
						class="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/40 bg-white/70 px-5 py-3 text-[10px] font-medium tracking-wide text-[#111] shadow-[0_16px_48px_rgba(0,0,0,0.08)] backdrop-blur-2xl transition-all hover:bg-white/80 hover:shadow-[0_24px_64px_rgba(0,0,0,0.12)] sm:gap-4 sm:px-6 sm:text-[11px]"
						in:fade={{ duration: 600, delay: 400 }}
						out:fade={{ duration: 200 }}
					>
						<div class="flex items-center gap-1.5 opacity-80">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								class="h-3.5 w-3.5 scale-110"
								stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
								/><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
								/></svg
							>
							<span class="hidden sm:inline">{photo.make}</span>
							{photo.model}
						</div>
						{#if photo.lens}
							<div class="h-3 w-px bg-black/10"></div>
							<div class="flex items-center gap-1.5 opacity-80">
								<span class="max-w-30 truncate sm:max-w-60" title={photo.lens}>{photo.lens}</span>
							</div>
						{/if}
						<div class="h-3 w-px bg-black/10"></div>
						<div class="flex items-center gap-1.5 opacity-80">
							<span>{photo.focalLength}mm</span>
						</div>
						<div class="h-3 w-px bg-black/10"></div>
						<div class="flex items-center gap-1.5 opacity-80">
							<span>{photo.aperture}</span>
						</div>
						<div class="h-3 w-px bg-black/10"></div>
						<div class="flex items-center gap-1.5 opacity-80">
							<span>{photo.shutterSpeed}</span>
						</div>
						<div class="h-3 w-px bg-black/10"></div>
						<div class="flex items-center gap-1.5 opacity-80">
							<span>ISO {photo.iso}</span>
						</div>
					</div>
				</div>
			{/key}
		</div>
	{/if}
</div>
