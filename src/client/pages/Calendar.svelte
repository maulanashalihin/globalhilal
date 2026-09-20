<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import Crescent from '../components/Crescent.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import StatusBadge from '../components/StatusBadge.svelte'
  import type { CalendarMonthSlot } from '../../shared/types'

  let { years, selectedYear, months }: { years: number[]; selectedYear: number | null; months: CalendarMonthSlot[] } = $props()

  function pickYear(e: Event) {
    const y = (e.target as HTMLSelectElement).value
    router.get('/calendar', y ? { hijri_year: y } : {})
  }
</script>

<svelte:head>
  <title>{selectedYear ? `Hijri ${selectedYear} calendar` : 'Hijri calendar'} — GlobalHilal</title>
  <meta
    name="description"
    content="Hijri months by global moon-sighting testimony, with start dates, lengths and decision references."
  />
  <link rel="canonical" href="https://globalhilal.org/calendar" />
</svelte:head>

<PublicLayout>
  <div class="flex items-end gap-4 flex-wrap mb-2">
    <div>
      <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">Archive</p>
      <h1 class="m-0 tracking-tight text-[1.9rem] font-bold">Hijri calendar</h1>
    </div>
    {#if years.length > 0}
      <label class="ml-auto flex items-center gap-2 text-sm text-gh-soft">
        Year
        <select
          class="h-10 px-3 border border-gh-line rounded-md bg-gh-sky text-gh-ink text-sm cursor-pointer"
          value={selectedYear ?? ''}
          onchange={pickYear}
        >
          {#each years as y (y)}
            <option value={y}>{y} H</option>
          {/each}
        </select>
      </label>
    {/if}
  </div>
  <p class="mt-0 mb-7 text-sm text-gh-soft max-w-[64ch]">
    Every month below began with a witnessed crescent — or is still waiting
    for one. Nothing here is calculated in advance.
  </p>

  {#if selectedYear === null}
    <p class="text-gh-soft">No determinations published yet.</p>
  {:else}
    <ol class="m-0 p-0 list-none grid gap-px bg-gh-line border border-gh-line rounded-lg overflow-hidden md:grid-cols-2">
      {#each months as m, i (m.hijri_month)}
        <li class="bg-gh-sky p-5 flex gap-4 items-start transition-colors hover:bg-gh-panel">
          <span class="text-gh-gold shrink-0 mt-1" aria-hidden="true">
            {#if m.start_gregorian && m.length_days}
              <Crescent day={m.length_days} size={44} id={`cal-moon-${m.hijri_month}`} />
            {:else}
              <svg width="44" height="44" viewBox="0 0 200 200" aria-hidden="true">
                <circle cx="100" cy="100" r="99" fill="none" stroke="currentColor" stroke-width="10" stroke-dasharray="26 18" opacity="0.55" />
              </svg>
            {/if}
          </span>
          <div class="min-w-0">
            <p class="m-0 mb-0.5 font-bold text-[1.05rem]">
              <span class="text-gh-soft font-semibold tabular-nums mr-2">{String(i + 1).padStart(2, '0')}</span>{#if m.month_key}<Link href={`/hijri/${m.month_key}`}>{m.month_en}</Link>{:else}{m.month_en}{/if}
            </p>
            <p class="m-0 mb-2 font-arabic text-gh-soft" lang="ar">{m.month_ar}</p>
            {#if m.start_gregorian}
              <p class="m-0 mb-2 text-sm text-gh-soft">
                {m.start_gregorian}{#if m.length_days} · {m.length_days} days{/if}
              </p>
              <StatusBadge status={m.status} />
            {:else}
              <p class="m-0 text-sm text-gh-soft">Awaiting rukyat — no testimony yet.</p>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</PublicLayout>
