<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import Crescent from '../components/Crescent.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import Stars from '../components/Stars.svelte'
  import StatusBadge from '../components/StatusBadge.svelte'
  import type { TodayData } from '../../shared/types'

  let { today }: { today: TodayData | null } = $props()

  const title = $derived(
    today
      ? `${today.hijri.day} ${today.hijri.month_en} ${today.hijri.year} — GlobalHilal`
      : 'GlobalHilal — Global moon-sighting Hijri calendar',
  )
  const canonical = 'https://globalhilal.org/'
</script>

<svelte:head>
  <title>{title}</title>
  <meta
    name="description"
    content="Today's Hijri date by global moon-sighting testimony. One valid sighting anywhere starts the month for all."
  />
  <link rel="canonical" href={canonical} />
  <meta property="og:title" content={title} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonical} />
</svelte:head>

<PublicLayout>
  {#if today}
    <section class="relative overflow-hidden rounded-lg bg-gh-night text-[#f2ede0] px-6 py-10 md:px-12 md:py-14">
      <div class="absolute inset-0 text-[#e3b93e]">
        <Stars count={110} />
      </div>
      <div class="relative flex gap-8 items-center flex-wrap md:flex-nowrap">
        <div class="text-[#e3b93e] shrink-0 mx-auto md:mx-0">
          <Crescent day={today.hijri.day} size={168} id="home-moon" />
        </div>
        <div class="min-w-[240px] flex-1 text-center md:text-left">
          <p class="m-0 mb-3 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#e3b93e]">
            {today.gregorian.date} · day {today.hijri.day} of the month
          </p>
          <p class="m-0 font-bold leading-none tracking-tight tabular-nums text-[3.4rem] md:text-[4.6rem]">
            {today.hijri.day} {today.hijri.month_en}
          </p>
          <p class="m-0 mt-2 font-arabic text-[1.7rem] leading-snug" lang="ar" dir="rtl">
            {today.hijri.month_ar} {today.hijri.year}
          </p>
          <p class="mt-4 mb-0">
            <StatusBadge status={today.determination.status} />
          </p>
        </div>
      </div>
    </section>

    {#if today.warning}
      <p class="px-4 py-3 mt-4 text-sm font-medium rounded-md border border-gh-gold bg-gh-gold-soft text-gh-gold">
        {today.warning}
      </p>
    {/if}

    <section class="mt-8 grid gap-8 md:grid-cols-[1.5fr_1fr]">
      <div>
        <p class="m-0 mb-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">
          The evidence
        </p>
        <p class="m-0 mb-4 text-[1.05rem] leading-relaxed">
          {today.determination.decision_summary}
        </p>
        {#if today.determination.sighted_in.length > 0}
          <ul class="m-0 mb-5 p-0 list-none flex flex-col">
            {#each today.determination.sighted_in as place (place)}
              <li class="flex gap-3 py-2 border-t border-gh-line text-sm">
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" class="text-gh-gold shrink-0 mt-0.5" aria-hidden="true">
                  <path d="M8 14s5-4.6 5-8a5 5 0 1 0-10 0c0 3.4 5 8 5 8Z" />
                  <circle cx="8" cy="6" r="1.8" />
                </svg>
                <span><strong>Sighted in {place}</strong> — testimony received and verified.</span>
              </li>
            {/each}
          </ul>
        {/if}
        <p class="m-0 text-sm">
          <Link href={`/hijri/${today.hijri.month_key}`} class="font-semibold">
            Read the full ruling, testimonies and references
          </Link>
        </p>
      </div>
      <aside class="border-l-4 border-gh-gold bg-gh-panel rounded-r-md p-5 h-fit">
        <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">
          Next moon watching
        </p>
        <p class="m-0 mb-1 text-[1.5rem] font-bold tabular-nums">{today.next_observation_date}</p>
        <p class="m-0 text-sm text-gh-soft">
          On the 29th evening the ummah looks up. One valid sighting
          anywhere opens the new month for everyone.
        </p>
      </aside>
    </section>

    <section class="mt-10 border-t border-gh-line pt-6 flex gap-4 items-baseline flex-wrap">
      <p class="m-0 text-sm text-gh-soft">
        Building a prayer timetable or a masjid display? Take the date from the free API —
        <Link href="/docs" class="font-semibold">read the docs</Link>.
      </p>
    </section>
  {:else}
    <section class="relative overflow-hidden rounded-lg bg-gh-night text-[#f2ede0] px-6 py-14 md:px-12 text-center">
      <div class="absolute inset-0 text-[#e3b93e]">
        <Stars count={110} />
      </div>
      <h1 class="relative m-0 mb-3 tracking-tight text-[2.4rem] font-bold">GlobalHilal</h1>
      <p class="relative m-0 text-[#e3b93e]">
        No moon-sighting determinations published yet. Check back after the
        next observation evening.
      </p>
    </section>
  {/if}
</PublicLayout>
