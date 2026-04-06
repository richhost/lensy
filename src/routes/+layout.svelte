<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children } = $props();

	const siteName = 'Lensy';
	const siteDescription = 'An editorial photography gallery capturing brutalist horizons, delicate glass layers, and the profound depth of human stillness.';
</script>

<svelte:head>
	<!-- Favicon -->
	<link rel="icon" href={favicon} />

	<!-- Global SEO Defaults -->
	<meta name="author" content="Lensy" />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={$page.url.href} />

	<!-- Open Graph Defaults -->
	<meta property="og:site_name" content={siteName} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:type" content="website" />

	<!-- Twitter Card Defaults -->
	<meta name="twitter:card" content="summary_large_image" />

	<!-- Structured Data: WebSite -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: siteName,
		description: siteDescription,
		url: $page.url.origin
	})}</script>`}
</svelte:head>
{@render children()}
