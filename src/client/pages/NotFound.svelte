<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import Layout from '../components/Layout.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'

  const page = usePage()
  // Public renders omit `auth` from props — use the public chrome then.
  const isPublic = $derived(!('auth' in (page.props as Record<string, unknown>)))
</script>

<svelte:head><title>Not found</title></svelte:head>

{#snippet body()}
  <h1 class="text-[1.6rem] m-0 mb-1 tracking-tight">404 — page not found</h1>
  <p class="text-gh-soft">The page you are looking for does not exist.</p>
  <p>
    <Link
      href="/"
      class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gh-ink rounded-lg bg-gh-ink text-gh-sky font-semibold text-sm cursor-pointer transition-colors hover:opacity-85 hover:no-underline"
    >
      Go home
    </Link>
  </p>
{/snippet}

{#if isPublic}
  <PublicLayout>{@render body()}</PublicLayout>
{:else}
  <Layout>{@render body()}</Layout>
{/if}
