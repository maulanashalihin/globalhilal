<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import Brand from './Brand.svelte'
  import { session } from '../session'

  let { children }: { children: Snippet } = $props()

  const page = usePage()
  const url = $derived(page.url)
  const currentPath = $derived(url?.split('?')[0] ?? '')
  const { user, loading } = $derived($session)

  const NAV = [
    { href: '/today', label: 'Today' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/contribute', label: 'Contribute' },
    { href: '/methodology', label: 'Methodology' },
    { href: '/sources', label: 'Sources' },
    { href: '/docs', label: 'API Docs' },
  ]

  const isActive = (href: string) =>
    href === '/today' ? currentPath === '/' || currentPath === '/today' : currentPath.startsWith(href)
</script>

<div class="min-h-screen bg-gh-sky text-gh-ink font-display flex flex-col antialiased">
  <header class="sticky top-0 z-30 border-b border-gh-line bg-gh-sky/90 backdrop-blur">
    <div class="w-full max-w-[1020px] mx-auto px-4 py-3 flex items-center gap-5 flex-wrap">
      <Brand href="/" class="text-[1.05rem]" />
      <nav class="flex items-center gap-1 flex-wrap" aria-label="Primary">
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
      <div class="ml-auto text-sm">
        {#if !loading}
          {#if user}
            <Link href="/dashboard" class="font-semibold text-gh-gold">
              Dashboard
            </Link>
          {:else}
            <Link href="/login" class="font-semibold text-gh-gold">
              Sign in
            </Link>
          {/if}
        {/if}
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
          One valid crescent sighting anywhere starts the month for all.
          Testimony-based, never predicted.
        </p>
      </div>
      <nav aria-label="Site">
        <p class="m-0 mb-2 text-xs font-bold uppercase tracking-widest text-gh-soft">Site</p>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5 text-sm">
          <li><Link href="/today">Today's date</Link></li>
          <li><Link href="/calendar">Calendar</Link></li>
          <li><Link href="/methodology">Methodology</Link></li>
        </ul>
      </nav>
      <div>
        <p class="m-0 mb-2 text-xs font-bold uppercase tracking-widest text-gh-soft">Developers</p>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5 text-sm">
          <li><Link href="/docs">Free API</Link></li>
          <li><Link href="/sources">Sources</Link></li>
          <li><Link href="/contribute">Report a sighting</Link></li>
        </ul>
      </div>
    </div>
  </footer>
</div>
