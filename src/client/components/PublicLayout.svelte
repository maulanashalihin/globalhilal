<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import Brand from './Brand.svelte'
  import { dict, switchLocalePath, withLocale } from '../i18n'
  import type { Locale, SharedPageProps } from '../../shared/types'

  let { children }: { children: Snippet } = $props()

  const page = usePage<SharedPageProps>()
  const url = $derived(page.url)
  const currentPath = $derived(url?.split('?')[0] ?? '')

  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
  const isAr = $derived(locale === 'ar')

  const NAV = $derived([
    { path: '/today', label: t.nav.today },
    { path: '/calendar', label: t.nav.calendar },
    { path: '/contribute', label: t.nav.contribute },
    { path: '/methodology', label: t.nav.methodology },
    { path: '/sources', label: t.nav.sources },
    { path: '/docs', label: t.nav.docs },
  ])

  const isActive = (path: string) =>
    path === '/today'
      ? currentPath === withLocale(locale, '/') || currentPath === withLocale(locale, '/today')
      : currentPath.startsWith(withLocale(locale, path))

  let menuOpen = $state(false)
  let headerRef = $state<HTMLElement | null>(null)

  // Close the mobile menu on every navigation.
  $effect(() => {
    url // track
    menuOpen = false
  })

  // Close on outside click / Escape (same pattern as Layout.svelte).
  $effect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (headerRef && !headerRef.contains(e.target as Node)) menuOpen = false
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (menuOpen = false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  })
</script>

{#snippet langSwitch()}
  <Link
    href={switchLocalePath(url ?? '/', 'en')}
    class={`px-2.5 py-1.5 rounded-md transition-colors hover:no-underline ${locale === 'en' ? 'bg-gh-gold-soft text-gh-gold font-bold' : 'text-gh-soft hover:text-gh-ink hover:bg-gh-panel'}`}
    aria-current={locale === 'en' ? 'page' : undefined}
  >
    English
  </Link>
  <Link
    href={switchLocalePath(url ?? '/', 'ar')}
    class={`px-2.5 py-1.5 rounded-md transition-colors hover:no-underline ${locale === 'ar' ? 'bg-gh-gold-soft text-gh-gold font-bold' : 'text-gh-soft hover:text-gh-ink hover:bg-gh-panel'}`}
    aria-current={locale === 'ar' ? 'page' : undefined}
  >
    العربية
  </Link>
{/snippet}

<div
  class={`min-h-screen bg-gh-sky text-gh-ink flex flex-col antialiased ${isAr ? 'font-arabic' : 'font-display'}`}
>
  <header bind:this={headerRef} class="sticky top-0 z-30 border-b border-gh-line bg-gh-sky/90 backdrop-blur">
    <div class="w-full max-w-[1020px] mx-auto px-4 py-3 flex items-center gap-3">
      <Brand href={withLocale(locale, '/')} class="text-[1.05rem]" />
      <nav class="hidden md:flex items-center gap-1" aria-label={t.nav.aria}>
        {#each NAV as item (item.path)}
          {@const active = isActive(item.path)}
          <Link
            href={withLocale(locale, item.path)}
            class={`px-3 py-1.5 rounded-md text-sm transition-colors hover:no-underline ${active ? 'bg-gh-gold-soft text-gh-gold font-bold' : 'text-gh-soft hover:text-gh-ink hover:bg-gh-panel'}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        {/each}
      </nav>
      <div class="ms-auto hidden md:flex items-center gap-1 text-sm" aria-label={t.header.language}>
        {@render langSwitch()}
      </div>
      <button
        type="button"
        class="ms-auto md:hidden inline-flex items-center justify-center w-10 h-10 border border-gh-line rounded-lg bg-transparent text-gh-ink cursor-pointer transition-colors hover:bg-gh-panel"
        aria-label={menuOpen ? t.nav.close : t.nav.menu}
        aria-expanded={menuOpen}
        aria-controls="public-nav"
        onclick={() => (menuOpen = !menuOpen)}
      >
        {#if menuOpen}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        {/if}
      </button>
    </div>
    {#if menuOpen}
      <div class="md:hidden border-t border-gh-line animate-[menu-in_120ms_ease]">
        <nav id="public-nav" aria-label={t.nav.aria} class="w-full max-w-[1020px] mx-auto px-4 py-2">
          <ul class="m-0 p-0 list-none flex flex-col">
            {#each NAV as item (item.path)}
              {@const active = isActive(item.path)}
              <li>
                <Link
                  href={withLocale(locale, item.path)}
                  class={`flex items-center px-3 py-3 rounded-md text-[0.95rem] transition-colors hover:no-underline ${active ? 'bg-gh-gold-soft text-gh-gold font-bold' : 'text-gh-ink hover:bg-gh-panel'}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            {/each}
          </ul>
          <div class="flex items-center gap-2 px-3 pt-2 pb-3 mt-1 border-t border-gh-line text-sm" aria-label={t.header.language}>
            <span class="text-gh-soft text-xs font-bold uppercase tracking-widest">{t.header.language}</span>
            {@render langSwitch()}
          </div>
        </nav>
      </div>
    {/if}
  </header>

  <main class="flex-1 w-full max-w-[1020px] mx-auto px-4 py-10">
    {@render children()}
  </main>

  <footer class="border-t border-gh-line">
    <div class="w-full max-w-[1020px] mx-auto px-4 py-8 grid gap-6 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <p class="m-0 mb-1 font-bold">GlobalHilal</p>
        <p class="m-0 text-sm text-gh-soft max-w-[38ch]">
          {t.footer.tagline}
        </p>
      </div>
      <nav aria-label={t.footer.site}>
        <p class="m-0 mb-2 text-xs font-bold uppercase tracking-widest text-gh-soft">{t.footer.site}</p>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5 text-sm">
          <li><Link href={withLocale(locale, '/today')}>{t.footer.todayDate}</Link></li>
          <li><Link href={withLocale(locale, '/calendar')}>{t.footer.calendar}</Link></li>
          <li><Link href={withLocale(locale, '/methodology')}>{t.footer.methodology}</Link></li>
        </ul>
      </nav>
      <div>
        <p class="m-0 mb-2 text-xs font-bold uppercase tracking-widest text-gh-soft">{t.footer.developers}</p>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5 text-sm">
          <li><Link href={withLocale(locale, '/docs')}>{t.footer.freeApi}</Link></li>
          <li><Link href={withLocale(locale, '/sources')}>{t.footer.sources}</Link></li>
          <li><Link href={withLocale(locale, '/contribute')}>{t.footer.reportSighting}</Link></li>
        </ul>
      </div>
    </div>
  </footer>
</div>
