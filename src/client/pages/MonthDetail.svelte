<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import Crescent from '../components/Crescent.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import StatusBadge from '../components/StatusBadge.svelte'
  import type { MonthDetailJson } from '../../shared/types'

  let { detail }: { detail: MonthDetailJson } = $props()

  const m = $derived(detail.month)
  const pageUrl = $derived(`https://globalhilal.org/hijri/${m.month_key}`)
  const jsonLd = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${m.month_en} ${m.hijri_year} started ${m.start_gregorian}`,
      datePublished: m.published_at,
      about: `Hijri month determination by global moon-sighting for ${m.month_en} ${m.hijri_year}`,
    }),
  )
</script>

<svelte:head>
  <title>{m.month_en} {m.hijri_year} started {m.start_gregorian} — GlobalHilal</title>
  <meta
    name="description"
    content={`${m.month_en} ${m.hijri_year}: crescent sighted in ${detail.sighted_in.join('; ') || '—'}. ${m.decision_summary}`}
  />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:title" content={`${m.month_en} ${m.hijri_year} — GlobalHilal`} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={pageUrl} />
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-3 text-sm text-gh-soft">
    <Link href="/calendar">Calendar</Link> · {m.hijri_year} H
  </p>

  <header class="flex gap-6 items-center flex-wrap pb-6 mb-6 border-b-2 border-gh-gold">
    <span class="text-gh-gold" aria-hidden="true">
      <Crescent day={m.length_days ?? 29} size={96} id="detail-moon" />
    </span>
    <div>
      <h1 class="m-0 tracking-tight leading-none font-bold text-[2.4rem]">{m.month_en}</h1>
      <p class="m-0 mt-1 font-arabic text-[1.5rem] text-gh-soft" lang="ar" dir="rtl">{m.month_ar} {m.hijri_year}</p>
      <p class="m-0 mt-3 flex gap-3 items-center flex-wrap">
        <StatusBadge status={m.status} />
        <span class="text-sm text-gh-soft tabular-nums">
          {m.start_gregorian}{#if m.length_days} → {m.length_days} days{/if}
        </span>
      </p>
    </div>
  </header>

  <p class="m-0 mb-8 text-[1.15rem] leading-relaxed max-w-[62ch]">{m.decision_summary}</p>

  <h2 class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">
    Testimonies · {detail.sightings.length}
  </h2>
  {#if detail.sightings.length === 0}
    <p class="text-sm text-gh-soft">No testimony records published for this month.</p>
  {:else}
    <ol class="m-0 mt-3 mb-8 p-0 list-none border-t border-gh-line">
      {#each detail.sightings as s (`${s.country}-${s.city}-${s.sighted_on}`)}
        <li class="py-4 border-b border-gh-line grid gap-1 md:grid-cols-[180px_1fr]">
          <div>
            <p class="m-0 font-bold">{s.country}{s.city ? ` · ${s.city}` : ''}</p>
            <p class="m-0 text-sm text-gh-soft tabular-nums">Evening of {s.sighted_on}</p>
          </div>
          <div class="text-sm">
            <p class="m-0 mb-1">
              <strong class="capitalize">{s.result.replace('_', ' ')}</strong>
              <span class="text-gh-soft"> by {s.method.replace('_', ' ')}{s.verified ? ' · verified' : ''}</span>
            </p>
            {#if s.witness_org}<p class="m-0 mb-1 text-gh-soft">Witness: {s.witness_org}</p>{/if}
            {#if s.note}<p class="m-0 text-gh-soft">{s.note}</p>{/if}
          </div>
        </li>
      {/each}
    </ol>
  {/if}

  <h2 class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">
    References · {detail.references.length}
  </h2>
  {#if detail.references.length === 0}
    <p class="text-sm text-gh-soft">References are being collected.</p>
  {:else}
    <ul class="m-0 mt-3 mb-8 p-0 list-none flex flex-col">
      {#each detail.references as r (r.url)}
        <li class="py-3 border-b border-gh-line text-sm">
          <a href={r.url} rel="noopener noreferrer" target="_blank" class="font-semibold">{r.title}</a>
          <span class="text-gh-soft"> — {r.publisher}</span>
          {#if r.quote}
            <p class="m-1 mb-0 pl-3 border-l-2 border-gh-gold text-gh-soft">{r.quote}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <p class="m-0 text-sm text-gh-soft">
    Next moon watching: <strong class="text-gh-ink">{detail.next_observation_date}</strong>
  </p>
</PublicLayout>
