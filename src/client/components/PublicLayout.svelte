<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import Brand from './Brand.svelte'
  import { dict } from '../i18n'
  import type { Locale, SharedPageProps } from '../../shared/types'

  let { children }: { children: Snippet } = $props()

  const page = usePage<SharedPageProps>()
  const url = $derived(page.url)
  const currentPath = $derived(url?.split('?')[0] ?? '')

  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
  const isAr = $derived(locale === 'ar')

  const NAV = $derived([
    { href: '/today', label: t.nav.today },
    { href: '/calendar', label: t.nav.calendar },
    { href: '/contribute', label: t.nav.contribute },
    { href: '/methodology', label: t.nav.methodology },
    { href: '/sources', label: t.nav.sources },
    { href: '/docs', label: t.nav.docs },
  ])

  const isActive = (href: string) =>
    href === '/today' ? currentPath === '/' || currentPath === '/today' : currentPath.startsWith(href)
</script>

<div
  class={`min-h-screen bg-gh-sky text-gh-ink flex flex-col antialiased ${isAr ? 'font-arabic' : 'font-display'}`}
>
  <header class="sticky top-0 z-30 border-b border-gh-line bg-gh-sky/90 backdrop-blur">
    <div class="w-full max-w-[1020px] mx-auto px-4 py-3 flex items-center gap-5 flex-wrap">
      <Brand href="/" class="text-[1.05rem]" />
      <nav class="flex items-center gap-1 flex-wrap" aria-label={t.nav.aria}>
        {#each NAV as item (item.href)}
          {@const active = isActive(item.href)}
          <Link
            href={item.href}
            class={`px-3 py-1.5 rounded-md text-sm transition-colors hover:no-underline ${active ? 'bg-gh-gold-soft text-gh-gold font-bold' : 'text-gh-soft hover:text-gh-ink hover:bg-gh-panel'}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        {/each}
      </nav>
      <div class="ms-auto flex items-center gap-3 text-sm">
        <form method="post" action="/locale" class="flex items-center">
          <input type="hidden" name="redirectTo" value={url ?? '/'} />
          <label class="sr-only" for="locale-select">{t.header.language}</label>
          <select
            id="locale-select"
            name="locale"
            value={locale}
            class="h-8 ps-2 pe-6 border border-gh-line rounded-md bg-gh-sky text-gh-ink text-sm cursor-pointer"
            onchange={(e) => e.currentTarget.form?.submit()}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
          <noscript>
            <button type="submit" class="ms-1 h-8 px-2 border border-gh-line rounded-md bg-gh-panel text-gh-ink text-sm cursor-pointer">
              OK
            </button>
          </noscript>
        </form>
      </div>
    </div>
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
          <li><Link href="/today">{t.footer.todayDate}</Link></li>
          <li><Link href="/calendar">{t.footer.calendar}</Link></li>
          <li><Link href="/methodology">{t.footer.methodology}</Link></li>
        </ul>
      </nav>
      <div>
        <p class="m-0 mb-2 text-xs font-bold uppercase tracking-widest text-gh-soft">{t.footer.developers}</p>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5 text-sm">
          <li><Link href="/docs">{t.footer.freeApi}</Link></li>
          <li><Link href="/sources">{t.footer.sources}</Link></li>
          <li><Link href="/contribute">{t.footer.reportSighting}</Link></li>
        </ul>
      </div>
    </div>
  </footer>
</div>
