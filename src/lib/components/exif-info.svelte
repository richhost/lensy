<script lang="ts">
	import { fade } from 'svelte/transition';
	import { IconMenu, IconAperture, IconClock, IconFocus2 } from '@tabler/icons-svelte-runes';
	import * as Drawer from '$lib/components/ui/drawer';
	import { pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';

	let { photo, isZoomed }: { photo: any; isZoomed: boolean } = $props();

	let open = $derived(!!(page.state as App.PageState).exifDrawer);

	function openDrawer() {
		pushState('', { exifDrawer: true });
	}

	function onOpenChange(value: boolean) {
		if (!value && (page.state as App.PageState).exifDrawer) {
			replaceState('', {});
		}
	}
</script>

{#if !isZoomed}
	<div
		transition:fade={{ duration: 300 }}
		class="pointer-events-none absolute right-0 bottom-0 left-0 z-50 flex justify-center px-4 pb-8"
	>
		<div class="pointer-events-auto w-full max-w-5xl text-[#111] transition-all">
			<!-- Desktop Layout -->
			<div class="hidden justify-center md:flex">
				<div
					class="flex items-center gap-6 rounded-full border border-black/10 bg-white/70 px-6 py-3 text-[11px] font-medium text-black/70 backdrop-blur-xl"
				>
					<span class="flex items-center gap-1.5">
						<IconFocus2 size={13} class="stroke-[1.5] text-black/40" />
						{photo.focalLength ? `${photo.focalLength}mm` : '-'}
					</span>
					<div class="h-3 w-px bg-black/15"></div>
					<span class="flex items-center gap-1.5">
						<IconAperture size={13} class="stroke-[1.5] text-black/40" />
						ƒ/{photo.aperture?.replace('f/', '') || '-'}
					</span>
					<div class="h-3 w-px bg-black/15"></div>
					<span class="flex items-center gap-1.5">
						<IconClock size={13} class="stroke-[1.5] text-black/40" />
						{photo.shutterSpeed || '-'}s
					</span>
					<div class="h-3 w-px bg-black/15"></div>
					<span class="flex items-center gap-1.5">
						<span
							class="rounded-[3px] border border-black/25 px-0.5 py-px text-[8px] leading-none font-bold text-black/40"
							>ISO</span
						>
						{photo.iso || '-'}
					</span>
					{#if photo.make || photo.model}
						<div class="h-3 w-px bg-black/15"></div>
						<span class="text-black/50">{photo.make || ''} {photo.model || ''}</span>
					{/if}
					{#if photo.lens}
						<div class="h-3 w-px bg-black/15"></div>
						<span class="max-w-48 truncate text-black/50" title={photo.lens}>{photo.lens}</span>
					{/if}
				</div>
			</div>

			<!-- Mobile Layout Trigger -->
			<div class="flex justify-center md:hidden">
				<Drawer.Root {open} {onOpenChange}>
					<Drawer.Trigger>
						{#snippet child({ props }: { props: Record<string, unknown> })}
							<button
								{...props}
								onclick={openDrawer}
								class="flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-[11px] font-medium tracking-wide text-black/60 backdrop-blur-xl transition-colors hover:bg-white/90 hover:text-black/80"
							>
								<IconMenu size={13} class="stroke-2" />
								Metadata
							</button>
						{/snippet}
					</Drawer.Trigger>
					<Drawer.Content class="rounded-t-3xl border-0 bg-[#F3EBE1] p-0 before:hidden">
						<Drawer.Header class="pb-4">
							<Drawer.Title
								class="text-left text-sm font-semibold tracking-widest text-black/60 uppercase"
								>Metadata</Drawer.Title
							>
						</Drawer.Header>
						<div class="grid grid-cols-2 gap-3 px-4 pb-10">
							<!-- Aperture -->
							<div class="flex aspect-square flex-col justify-between rounded-2xl bg-white p-5">
								<span class="text-[10px] font-bold tracking-widest text-black/40 uppercase"
									>Aperture</span
								>
								<div class="text-2xl font-medium text-black">
									ƒ/{photo.aperture?.replace('f/', '') || '-'}
								</div>
								<IconAperture size={24} class="stroke-[1.5] text-black/40" />
							</div>
							<!-- Shutter Speed -->
							<div class="flex aspect-square flex-col justify-between rounded-2xl bg-white p-5">
								<span class="text-[10px] font-bold tracking-widest text-black/40 uppercase"
									>Shutter Speed</span
								>
								<div class="text-2xl font-medium text-black">{photo.shutterSpeed || '-'}s</div>
								<IconClock size={24} class="stroke-[1.5] text-black/40" />
							</div>
							<!-- Focal Length -->
							<div class="flex aspect-square flex-col justify-between rounded-2xl bg-white p-5">
								<span class="text-[10px] font-bold tracking-widest text-black/40 uppercase"
									>Focal Length</span
								>
								<div class="text-2xl font-medium text-black">
									{photo.focalLength ? `${photo.focalLength}mm` : '-'}
								</div>
								<IconFocus2 size={24} class="stroke-[1.5] text-black/40" />
							</div>
							<!-- ISO -->
							<div class="flex aspect-square flex-col justify-between rounded-2xl bg-white p-5">
								<span class="text-[10px] font-bold tracking-widest text-black/40 uppercase"
									>ISO</span
								>
								<div class="text-2xl font-medium text-black">{photo.iso || '-'}</div>
								<div
									class="w-fit rounded-lg border-2 border-black/30 px-1 py-0.5 text-[10px] font-bold text-black/40"
								>
									ISO
								</div>
							</div>
						</div>
					</Drawer.Content>
				</Drawer.Root>
			</div>
		</div>
	</div>
{/if}
