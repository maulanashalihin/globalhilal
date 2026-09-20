<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import Crescent from '../components/Crescent.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import StatusBadge from '../components/StatusBadge.svelte'
  import type { TodayData } from '../../shared/types'

  let { tz, today, tzFallback }: { tz: string; today: TodayData | null; tzFallback: string | null } = $props()

  let tzInput = $state(tz)

  function applyTz(e: SubmitEvent) {
    e.preventDefault()
    router.get('/today', { tz: tzInput.trim() || 'UTC' })
  }

  const COMMON_ZONES = ['UTC', 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Dubai', 'Asia/Riyadh', 'Europe/London', 'America/New_York']
</script>

<svelte:head>
  <title>{today ? `${today.hijri.day} ${today.hijri.month_en} ${today.hijri.year}` : 'Today'} — GlobalHilal</title>
  <meta
    name="description"
    content="Today's Hijri date by global moon-sighting testimony, in your timezone."
  />
  <link rel="canonical" href="https://globalhilal.org/today" />
</svelte:head>

<PublicLayout>
  <div class="flex items-end gap-4 flex-wrap mb-6">
    <div>
      <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">Today</p>
      <h1 class="m-0 tracking-tight text-[1.9rem] font-bold">What date is it in Hijri?</h1>
    </div>
    <form class="ml-auto flex gap-2 items-center" onsubmit={applyTz}>
      <label class="text-sm text-gh-soft">
        <span class="sr-only">Timezone</span>
        <input
          type="text"
          bind:value={tzInput}
          list="tz-list"
          aria-label="Timezone"
          class="h-10 px-3 border border-gh-line rounded-md bg-gh-sky text-gh-ink text-sm w-[210px]"
        />
        <datalist id="tz-list">
          {#each COMMON_ZONES as z (z)}
            <option value={z}></option>
          {/each}
        </datalist>
      </label>
      <button
        type="submit"
        class="inline-flex items-center justify-center px-4 h-10 rounded-md bg-gh-ink text-gh-sky font-semibold text-sm cursor-pointer transition-colors hover:opacity-85"
      >
        Show
      </button>
    </form>
  </div>

  {#if tzFallback}
    <p class="px-4 py-3 text-sm font-medium rounded-md border border-gh-gold bg-gh-gold-soft text-gh-gold">
      Unknown timezone “{tzFallback}” — showing UTC instead.
    </p>
  {/if}

  {#if today}
    <section class="rounded-lg bg-gh-night text-[#f2ede0] px-6 py-8 md:px-10 flex gap-7 items-center flex-wrap">
      <div class="text-[#e3b93e] shrink-0">
        <Crescent day={today.hijri.day} size={128} id="today-moon" />
      </div>
      <div>
        <p class="m-0 mb-1 text-sm text-[#e3b93e]">{today.gregorian.date} · {today.gregorian.timezone}</p>
        <p class="m-0 font-bold tracking-tight leading-none tabular-nums text-[2.8rem]">
          {today.hijri.day} {today.hijri.month_en} {today.hijri.year}
        </p>
        <p class="m-0 mt-2 font-arabic text-[1.4rem]" lang="ar" dir="rtl">{today.hijri.month_ar}</p>
      </div>
      <p class="w-full m-0"><StatusBadge status={today.determination.status} /></p>
    </section>

    {#if today.warning}
      <p class="px-4 py-3 mt-4 text-sm font-medium rounded-md border border-gh-gold bg-gh-gold-soft text-gh-gold">
        {today.warning}
      </p>
    {/if}

    <section class="mt-6 border-t-2 border-gh-gold pt-4">
      <p class="m-0 mb-2 leading-relaxed">{today.determination.decision_summary}</p>
      {#if today.determination.sighted_in.length > 0}
        <p class="m-0 mb-2 text-sm">
          <strong>Sighted in:</strong> {today.determination.sighted_in.join('; ')}
        </p>
      {/if}
      <p class="m-0 text-sm text-gh-soft">
        Next moon watching: <strong class="text-gh-ink">{today.next_observation_date}</strong> ·
        <Link href={`/hijri/${today.hijri.month_key}`} class="font-semibold">Month detail</Link>
      </p>
    </section>
  {:else}
    <p class="text-gh-soft">No rukyat determination covers this date — future dates are never predicted.</p>
  {/if}

  <p class="mt-8 text-sm text-gh-soft max-w-[62ch]">
    The month is the same for the whole ummah — your timezone only selects
    which Gregorian civil date you are asking about. A testimony arriving
    late from another continent can still make today the 1st.
  </p>
</PublicLayout>
