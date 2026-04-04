<script lang="ts">
	import type { PageData } from './$types';
	import { deletePhoto, updatePhoto } from '$lib/remotes/photos.remote';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		IconPhoto,
		IconUpload,
		IconTrash,
		IconLoader2,
		IconX,
		IconCamera,
		IconPencil,
		IconTag,
		IconCheck
	} from '@tabler/icons-svelte-runes';
	import { untrack } from 'svelte';
	import ExifReader from 'exifreader';

	let { data }: { data: PageData } = $props();

	type Photo = (typeof data.photos)[number];
	type Tag = (typeof data.tags)[number];

	let photoList = $state<Photo[]>(untrack(() => [...data.photos]));
	let allTags = $derived(data.tags as Tag[]);

	// ── Types ──────────────────────────────────────────────────────────────────
	interface ParsedExif {
		width: number;
		height: number;
		make?: string;
		model?: string;
		lens?: string;
		focalLength?: number;
		aperture?: string;
		iso?: number;
		shutterSpeed?: string;
		takenAt?: string;
	}

	interface FileEntry {
		id: string;
		file: File;
		preview: string;
		exif: ParsedExif;
		status: 'pending' | 'uploading' | 'done' | 'error';
		error?: string;
	}

	// ── EXIF parsing (browser) ─────────────────────────────────────────────────
	async function parseExif(file: File): Promise<ParsedExif> {
		const buffer = await file.arrayBuffer();
		let tags: ExifReader.Tags | null = null;
		try {
			tags = ExifReader.load(buffer);
		} catch {
			/* no EXIF or unsupported format */
		}
		if (!tags) {
			const bmp = await createImageBitmap(file);
			return {
				width: bmp.width,
				height: bmp.height
			};
		}

		// Image dimensions from EXIF, fallback to createImageBitmap
		let width = 0;
		let height = 0;
		const w = tags['PixelXDimension']?.value ?? tags['ImageWidth']?.value;
		const h = tags['PixelYDimension']?.value ?? tags['ImageLength']?.value;
		if (w && h) {
			width = typeof w === 'number' ? w : parseInt(String(w), 10);
			height = typeof h === 'number' ? h : parseInt(String(h), 10);
		}
		if (!width || !height) {
			const bmp = await createImageBitmap(file);
			width = bmp.width;
			height = bmp.height;
			bmp.close();
		}

		// Focal length: description is "35 mm", parse the number
		const focalDesc = tags['FocalLength']?.description;
		const focalMatch = focalDesc?.match(/(\d+(?:\.\d+)?)/);
		const focalLength = focalMatch ? Math.round(Number(focalMatch[1])) : undefined;

		// DateTimeOriginal: "2024:01:15 12:30:00" → ISO string
		const dtRaw = tags['DateTimeOriginal']?.description;
		let takenAt: string | undefined;
		if (dtRaw) {
			const normalized = dtRaw.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
			const d = new Date(normalized);
			if (!isNaN(d.getTime())) takenAt = d.toISOString();
		}

		const isoRaw = tags['ISOSpeedRatings']?.value;
		const iso = isoRaw != null ? parseInt(String(isoRaw), 10) || undefined : undefined;

		return {
			width,
			height,
			make: tags['Make']?.description,
			model: tags['Model']?.description,
			lens: tags['LensModel']?.description,
			focalLength,
			aperture: tags['FNumber']?.description,
			iso,
			shutterSpeed: tags['ExposureTime']?.description,
			takenAt
		};
	}

	// ── Upload state ───────────────────────────────────────────────────────────
	let uploadOpen = $state(false);
	let fileEntries = $state<FileEntry[]>([]);
	let uploading = $state(false);
	let dragOver = $state(false);
	let fileInput = $state<HTMLInputElement | undefined>();

	let pendingCount = $derived(fileEntries.filter((f) => f.status === 'pending').length);

	function setEntryStatus(id: string, status: FileEntry['status'], error?: string) {
		const idx = fileEntries.findIndex((f) => f.id === id);
		if (idx >= 0) {
			fileEntries[idx] = { ...fileEntries[idx], status, error };
		}
	}

	async function addFiles(list: FileList | File[]) {
		for (const file of Array.from(list)) {
			if (!file.type.startsWith('image/')) continue;
			const preview = URL.createObjectURL(file);
			const exif = await parseExif(file);
			fileEntries = [
				...fileEntries,
				{ id: crypto.randomUUID(), file, preview, exif, status: 'pending' }
			];
		}
	}

	function removeEntry(id: string) {
		const entry = fileEntries.find((f) => f.id === id);
		if (entry) URL.revokeObjectURL(entry.preview);
		fileEntries = fileEntries.filter((f) => f.id !== id);
	}

	function retryEntry(id: string) {
		setEntryStatus(id, 'pending', undefined);
	}

	function closeUploadDialog() {
		if (uploading) return;
		fileEntries.forEach((f) => URL.revokeObjectURL(f.preview));
		fileEntries = [];
		uploadOpen = false;
	}

	async function uploadAll() {
		uploading = true;

		for (const entry of [...fileEntries]) {
			if (entry.status !== 'pending') continue;
			setEntryStatus(entry.id, 'uploading');

			try {
				const fd = new FormData();
				fd.append('file', entry.file);
				fd.append('exif', JSON.stringify(entry.exif));

				const res = await fetch('/darkroom/photos', { method: 'POST', body: fd });
				if (res.ok) {
					const photo = (await res.json()) as Omit<Photo, 'tags'>;
					photoList = [{ ...photo, tags: [] }, ...photoList];
					setEntryStatus(entry.id, 'done');
				} else {
					const err = await res.json().catch(() => ({}));
					setEntryStatus(
						entry.id,
						'error',
						(err as { message?: string }).message ?? 'Upload failed'
					);
				}
			} catch {
				setEntryStatus(entry.id, 'error', 'Network error');
			}
		}

		uploading = false;

		if (fileEntries.every((f) => f.status === 'done')) {
			fileEntries.forEach((f) => URL.revokeObjectURL(f.preview));
			fileEntries = [];
			uploadOpen = false;
		} else {
			fileEntries = fileEntries.filter((f) => f.status !== 'done');
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}
	function handleDragLeave() {
		dragOver = false;
	}
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
	}

	// ── Edit ───────────────────────────────────────────────────────────────────
	let editOpen = $state(false);
	let editingPhoto = $state<Photo | null>(null);
	let editSaving = $state(false);
	let editError = $state('');

	// Form fields
	let eTitle = $state('');
	let eDescription = $state('');
	let eMake = $state('');
	let eModel = $state('');
	let eLens = $state('');
	let eFocalLength = $state('');
	let eAperture = $state('');
	let eIso = $state('');
	let eShutterSpeed = $state('');
	let eTakenAt = $state('');
	let eIsVisible = $state(true);
	let eTagIds = $state<string[]>([]);

	function openEdit(photo: Photo) {
		editingPhoto = photo;
		eTitle = photo.title ?? '';
		eDescription = photo.description ?? '';
		eMake = photo.make ?? '';
		eModel = photo.model ?? '';
		eLens = photo.lens ?? '';
		eFocalLength = photo.focalLength != null ? String(photo.focalLength) : '';
		eAperture = photo.aperture ?? '';
		eIso = photo.iso != null ? String(photo.iso) : '';
		eShutterSpeed = photo.shutterSpeed ?? '';
		eTakenAt = photo.takenAt ? new Date(photo.takenAt).toISOString().slice(0, 16) : '';
		eIsVisible = photo.isVisible ?? true;
		eTagIds = photo.tags.map((t) => t.tagId);
		editError = '';
		editOpen = true;
	}

	function toggleTag(tagId: string) {
		if (eTagIds.includes(tagId)) {
			eTagIds = eTagIds.filter((id) => id !== tagId);
		} else {
			eTagIds = [...eTagIds, tagId];
		}
	}

	async function handleSave() {
		if (!editingPhoto) return;
		editSaving = true;
		editError = '';
		try {
			const updated = await updatePhoto({
				id: editingPhoto.id,
				title: eTitle || null,
				description: eDescription || null,
				make: eMake || null,
				model: eModel || null,
				lens: eLens || null,
				focalLength: eFocalLength ? parseInt(eFocalLength, 10) : null,
				aperture: eAperture || null,
				iso: eIso ? parseInt(eIso, 10) : null,
				shutterSpeed: eShutterSpeed || null,
				takenAt: eTakenAt ? new Date(eTakenAt).toISOString() : null,
				isVisible: eIsVisible,
				tagIds: eTagIds
			});

			const tagObjects = eTagIds.map((tagId) => ({
				tagId,
				photoId: updated.id,
				tag: allTags.find((t) => t.id === tagId)!
			}));

			photoList = photoList.map((p) =>
				p.id === updated.id ? { ...updated, tags: tagObjects } : p
			);
			editOpen = false;
		} catch (e) {
			editError = e instanceof Error ? e.message : 'Failed to save';
		} finally {
			editSaving = false;
		}
	}

	// ── Delete ─────────────────────────────────────────────────────────────────
	let deleteOpen = $state(false);
	let deletingPhoto = $state<Photo | null>(null);
	let deleteLoading = $state(false);

	function openDelete(photo: Photo) {
		deletingPhoto = photo;
		deleteOpen = true;
	}

	async function handleDelete() {
		if (!deletingPhoto) return;
		deleteLoading = true;
		try {
			await deletePhoto({ id: deletingPhoto.id });
			photoList = photoList.filter((p) => p.id !== deletingPhoto!.id);
			deleteOpen = false;
		} catch {
			deleteOpen = false;
		} finally {
			deleteLoading = false;
			deletingPhoto = null;
		}
	}

	// ── Helpers ────────────────────────────────────────────────────────────────
	function formatDate(date: Date | null): string {
		if (!date) return '';
		return new Date(date).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function exifSummary(exif: ParsedExif): string {
		return [
			exif.aperture,
			exif.shutterSpeed,
			exif.iso ? `ISO ${exif.iso}` : undefined,
			exif.focalLength ? `${exif.focalLength}mm` : undefined
		]
			.filter(Boolean)
			.join(' · ');
	}
</script>

<svelte:head>
	<title>Photos · Darkroom</title>
</svelte:head>

<div class="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
	<!-- Page header -->
	<div class="mb-8 flex items-center justify-between gap-4">
		<div>
			<h1 class="text-lg font-semibold tracking-tight text-foreground">Photos</h1>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{photoList.length}
				{photoList.length === 1 ? 'photo' : 'photos'}
			</p>
		</div>
		<Button size="sm" onclick={() => (uploadOpen = true)}>
			<IconUpload size={14} />
			Upload
		</Button>
	</div>

	<!-- Empty state -->
	{#if photoList.length === 0}
		<div class="py-20 text-center">
			<div
				class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/40"
			>
				<IconPhoto size={20} stroke={1.5} class="text-muted-foreground" />
			</div>
			<p class="text-sm font-medium text-foreground">No photos yet</p>
			<p class="mt-1 text-xs text-pretty text-muted-foreground">
				Upload your first photo to get started
			</p>
			<Button class="mt-5" variant="outline" size="sm" onclick={() => (uploadOpen = true)}>
				<IconUpload size={13} />
				Upload photos
			</Button>
		</div>

		<!-- Photo grid -->
	{:else}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each photoList as photo (photo.id)}
				<div class="group relative overflow-hidden rounded-lg bg-muted/40">
					<div class="aspect-3/2 overflow-hidden">
						<img
							src={photo.url}
							alt={photo.title ?? ''}
							class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
							loading="lazy"
						/>
					</div>
					<!-- Overlay: gradient always on mobile, full dark on desktop hover -->
					<div
						class="absolute inset-0 flex flex-col justify-between bg-linear-to-t from-black/60 via-transparent to-black/30 p-2 sm:bg-black/0 sm:bg-none sm:transition-colors sm:duration-200 sm:group-hover:bg-black/50"
					>
						<!-- Top: action buttons — always visible on mobile, hover-only on desktop -->
						<div
							class="flex justify-end gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
						>
							<button
								onclick={() => openEdit(photo)}
								class="rounded-md bg-black/50 p-2.5 text-white transition-colors hover:bg-white/20 sm:p-1.5"
								aria-label="Edit photo"
							>
								<IconPencil size={13} />
							</button>
							<button
								onclick={() => openDelete(photo)}
								class="rounded-md bg-black/50 p-2.5 text-white transition-colors hover:bg-red-600 sm:p-1.5"
								aria-label="Delete photo"
							>
								<IconTrash size={13} />
							</button>
						</div>
						<!-- Bottom: metadata — always visible on mobile, hover-only on desktop -->
						<div class="sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
							{#if photo.model}
								<p class="flex items-center gap-1 truncate text-[10px] font-medium text-white/90">
									<IconCamera size={10} />
									{photo.model}
								</p>
							{/if}
							{#if photo.takenAt}
								<p class="mt-0.5 text-[10px] text-white/70">{formatDate(photo.takenAt)}</p>
							{/if}
							{#if photo.tags.length > 0}
								<div class="mt-1 flex flex-wrap gap-0.5">
									{#each photo.tags as t}
										<span class="rounded bg-white/20 px-1 py-0.5 text-[9px] text-white/80">
											{t.tag.name}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- ── Upload dialog ─────────────────────────────────────────────────────────── -->
<Dialog.Root
	open={uploadOpen}
	onOpenChange={(v) => {
		if (!v) closeUploadDialog();
		else uploadOpen = true;
	}}
>
	<Dialog.Content class="flex h-[90dvh] flex-col sm:h-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Upload photos</Dialog.Title>
			<Dialog.Description>
				Drag & drop or click to select. EXIF metadata is read locally before upload.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-1 flex-col overflow-y-auto">
			{#if fileEntries.length === 0}
				<!-- Drop zone -->
				<div
					role="button"
					tabindex="0"
					class="flex h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors {dragOver
						? 'border-primary bg-primary/5'
						: 'border-border hover:border-primary/40 hover:bg-muted/30'}"
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
					onclick={() => fileInput?.click()}
					onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
				>
					<div class="flex size-11 items-center justify-center rounded-xl bg-muted/60">
						<IconUpload size={20} stroke={1.5} class="text-muted-foreground" />
					</div>
					<div class="text-center">
						<p class="text-sm font-medium text-foreground">Drop photos here</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
							JPEG, PNG, WebP, HEIC, TIFF · max 100 MB
						</p>
					</div>
				</div>
			{:else}
				<!-- File list -->
				<div class="max-h-[380px] space-y-2 overflow-y-auto pr-1">
					{#each fileEntries as entry (entry.id)}
						<div
							class="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-2 {entry.status ===
							'error'
								? 'border-destructive/30 bg-destructive/5'
								: ''}"
						>
							<!-- Thumbnail -->
							<div class="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
								<img src={entry.preview} alt="" class="size-full object-cover" />
							</div>

							<!-- Info -->
							<div class="min-w-0 flex-1 text-xs">
								<p class="truncate font-medium text-foreground">{entry.file.name}</p>
								<p class="text-muted-foreground">
									{entry.exif.width}×{entry.exif.height}{entry.exif.model
										? ` · ${entry.exif.model}`
										: ''}
								</p>
								{#if exifSummary(entry.exif)}
									<p class="text-muted-foreground/80">{exifSummary(entry.exif)}</p>
								{/if}
								{#if entry.error}
									<p class="text-destructive">{entry.error}</p>
								{/if}
							</div>

							<!-- Status / action -->
							<div class="shrink-0">
								{#if entry.status === 'uploading'}
									<IconLoader2 size={15} class="animate-spin text-muted-foreground" />
								{:else if entry.status === 'done'}
									<span class="text-[11px] text-green-600 dark:text-green-400">Done</span>
								{:else if entry.status === 'error'}
									<button
										onclick={() => retryEntry(entry.id)}
										class="text-[11px] text-destructive hover:underline"
									>
										Retry
									</button>
								{:else}
									<button
										onclick={() => removeEntry(entry.id)}
										disabled={uploading}
										aria-label="Remove"
										class="text-muted-foreground hover:text-foreground disabled:opacity-40"
									>
										<IconX size={14} />
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				{#if !uploading}
					<button
						onclick={() => fileInput?.click()}
						class="w-full rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/20"
					>
						+ Add more photos
					</button>
				{/if}
			{/if}
		</div>

		<!-- Hidden file input -->
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			multiple
			class="hidden"
			onchange={(e) => e.currentTarget.files && addFiles(e.currentTarget.files)}
		/>

		<Dialog.Footer>
			<Button variant="outline" onclick={closeUploadDialog} disabled={uploading}>Cancel</Button>
			{#if fileEntries.length > 0}
				<Button onclick={uploadAll} disabled={uploading || pendingCount === 0}>
					{#if uploading}
						<IconLoader2 size={14} class="animate-spin" />
						Uploading…
					{:else}
						<IconUpload size={14} />
						Upload {pendingCount}
						{pendingCount === 1 ? 'photo' : 'photos'}
					{/if}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ── Edit dialog ────────────────────────────────────────────────────────────── -->
<Dialog.Root bind:open={editOpen}>
	<Dialog.Content class="flex h-[90dvh] flex-col gap-0 p-0 sm:max-w-lg">
		<Dialog.Header class="border-b border-border px-5 py-4">
			<Dialog.Title>Edit photo</Dialog.Title>
			<Dialog.Description>Update EXIF metadata and tags.</Dialog.Description>
		</Dialog.Header>

		{#if editingPhoto}
			<div class="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-5">
				<!-- Thumbnail -->
				<div class="aspect-[3/2] overflow-hidden rounded-lg bg-muted/40">
					<img src={editingPhoto.url} alt="" class="size-full object-cover" />
				</div>

				<!-- Info section -->
				<section>
					<p class="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
						Info
					</p>
					<div class="space-y-2.5">
						<div class="flex flex-col gap-1">
							<label for="edit-title" class="text-xs text-muted-foreground">Title</label>
							<Input id="edit-title" bind:value={eTitle} placeholder="Untitled" />
						</div>
						<div class="flex flex-col gap-1">
							<label for="edit-desc" class="text-xs text-muted-foreground">Description</label>
							<Textarea
								id="edit-desc"
								bind:value={eDescription}
								placeholder="Add a description…"
								rows={3}
							/>
						</div>
						<div class="flex items-center gap-2">
							<Switch id="edit-visible" bind:checked={eIsVisible} size="sm" />
							<label for="edit-visible" class="cursor-pointer text-xs">Visible</label>
						</div>
					</div>
				</section>

				<!-- EXIF section -->
				<section>
					<p class="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
						Camera
					</p>
					<div class="grid grid-cols-2 gap-2.5">
						<div class="flex flex-col gap-1">
							<label for="edit-make" class="text-xs text-muted-foreground">Make</label>
							<Input id="edit-make" bind:value={eMake} placeholder="e.g. Sony" />
						</div>
						<div class="flex flex-col gap-1">
							<label for="edit-model" class="text-xs text-muted-foreground">Model</label>
							<Input id="edit-model" bind:value={eModel} placeholder="e.g. A7 IV" />
						</div>
						<div class="col-span-2 flex flex-col gap-1">
							<label for="edit-lens" class="text-xs text-muted-foreground">Lens</label>
							<Input id="edit-lens" bind:value={eLens} placeholder="e.g. FE 24-70mm F2.8" />
						</div>
					</div>
				</section>

				<section>
					<p class="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
						Exposure
					</p>
					<div class="grid grid-cols-2 gap-2.5">
						<div class="flex flex-col gap-1">
							<label for="edit-focal" class="text-xs text-muted-foreground">Focal length (mm)</label
							>
							<Input
								id="edit-focal"
								type="number"
								bind:value={eFocalLength}
								placeholder="50"
								min="1"
							/>
						</div>
						<div class="flex flex-col gap-1">
							<label for="edit-aperture" class="text-xs text-muted-foreground">Aperture</label>
							<Input id="edit-aperture" bind:value={eAperture} placeholder="f/1.8" />
						</div>
						<div class="flex flex-col gap-1">
							<label for="edit-iso" class="text-xs text-muted-foreground">ISO</label>
							<Input id="edit-iso" type="number" bind:value={eIso} placeholder="400" min="1" />
						</div>
						<div class="flex flex-col gap-1">
							<label for="edit-ss" class="text-xs text-muted-foreground">Shutter speed</label>
							<Input id="edit-ss" bind:value={eShutterSpeed} placeholder="1/200" />
						</div>
						<div class="col-span-2 flex flex-col gap-1">
							<label for="edit-takenat" class="text-xs text-muted-foreground">Date taken</label>
							<Input id="edit-takenat" type="datetime-local" bind:value={eTakenAt} />
						</div>
					</div>
				</section>

				<!-- Tags section -->
				<section>
					<p class="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
						Tags
					</p>
					{#if allTags.length === 0}
						<p class="flex items-center gap-1.5 text-xs text-muted-foreground">
							<IconTag size={12} />
							No tags yet — create some in the Tags page.
						</p>
					{:else}
						<div class="flex flex-wrap gap-1.5">
							{#each allTags as tag (tag.id)}
								{@const selected = eTagIds.includes(tag.id)}
								<button
									type="button"
									onclick={() => toggleTag(tag.id)}
									class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors
										{selected
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'}"
								>
									{#if selected}
										<IconCheck size={10} />
									{/if}
									{tag.name}
								</button>
							{/each}
						</div>
					{/if}
				</section>

				{#if editError}
					<p class="text-xs text-destructive">{editError}</p>
				{/if}
			</div>

			<Dialog.Footer class="border-t border-border px-5 py-4">
				<Button variant="outline" onclick={() => (editOpen = false)} disabled={editSaving}>
					Cancel
				</Button>
				<Button onclick={handleSave} disabled={editSaving}>
					{#if editSaving}
						<IconLoader2 size={14} class="animate-spin" />
					{/if}
					Save
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- ── Delete dialog ─────────────────────────────────────────────────────────── -->
<Dialog.Root bind:open={deleteOpen}>
	<Dialog.Content class="sm:max-w-xs">
		<Dialog.Header>
			<Dialog.Title>Delete photo?</Dialog.Title>
			<Dialog.Description>
				This will permanently remove the photo from storage and cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteOpen = false)} disabled={deleteLoading}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={handleDelete} disabled={deleteLoading}>
				{#if deleteLoading}
					<IconLoader2 size={14} class="animate-spin" />
				{/if}
				Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
