<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import Layout from '../components/Layout.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import { dict } from '../i18n'
  import type { Locale, SharedPageProps } from '../../shared/types'

  const page = usePage<SharedPageProps>()
  // Public renders omit `auth` from props — use the public chrome then.
  const isPublic = $derived(!('auth' in (page.props as Record<string, unknown>)))
  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
</script>

<svelte:head><title>{t.common.notFoundTitle}</title></svelte:head>

{#snippet body()}
  <h1 class="text-[1.6rem] m-0 mb-1 tracking-tight">{t.common.notFoundTitle}</h1>
  <p class="text-gh-soft">{t.common.notFoundBody}</p>
  <p>
    <Link
      href="/"
      class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gh-ink rounded-lg bg-gh-ink text-gh-sky font-semibold text-sm cursor-pointer transition-colors hover:opacity-85 hover:no-underline"
    >
      {t.common.goHome}
    </Link>
  </p>
{/snippet}

{#if isPublic}
  <PublicLayout>{@render body()}</PublicLayout>
{:else}
  <Layout>{@render body()}</Layout>
{/if}
