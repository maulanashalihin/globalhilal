<script lang="ts">
  import { Link, router, usePage } from '@inertiajs/svelte'
  import Crescent from '../components/Crescent.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import StatusBadge from '../components/StatusBadge.svelte'
  import { dict, fmtDate, fmtNum, placeLabel } from '../i18n'
  import type { Locale, SharedPageProps, TodayData } from '../../shared/types'

  let { tz, today, tzFallback }: { tz: string; today: TodayData | null; tzFallback: string | null } = $props()

  const page = usePage<SharedPageProps>()
  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
  const isAr = $derived(locale === 'ar')

  const monthPrimary = $derived(today ? (isAr ? today.hijri.month_ar : today.hijri.month_en) : '')
  const monthSecondary = $derived(today ? (isAr ? today.hijri.month_en : today.hijri.month_ar) : '')

  let tzInput = $state(tz)

  function applyTz(e: SubmitEvent) {
    e.preventDefault()
    router.get('/today', { tz: tzInput.trim() || 'UTC' })
  }

  const COMMON_ZONES = ['UTC', 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Dubai', 'Asia/Riyadh', 'Europe/London', 'America/New_York']
</script>

<svelte:head>
  <title>{today ? `${fmtNum(today.hijri.day, locale)} ${monthPrimary} ${fmtNum(today.hijri.year, locale)}` : t.today.titleFallback} — GlobalHilal</title>
  <meta name="description" content={t.meta.todayDescription} />
  <link rel="canonical" href="https://globalhilal.org/today" />
</svelte:head>

<PublicLayout>
  <div class="flex items-end gap-4 flex-wrap mb-6">
    <div>
      <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">{t.today.kicker}</p>
      <h1 class="m-0 tracking-tight text-[1.9rem] font-bold">{t.today.h1}</h1>
    </div>
    <form class="ms-auto flex gap-2 items-center" onsubmit={applyTz}>
      <label class="text-sm text-gh-soft">
        <span class="sr-only">{t.today.timezone}</span>
        <input
          type="text"
          bind:value={tzInput}
          list="tz-list"
          aria-label={t.today.timezone}
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
        {t.today.show}
      </button>
    </form>
  </div>

  {#if tzFallback}
    <p class="px-4 py-3 text-sm font-medium rounded-md border border-gh-gold bg-gh-gold-soft text-gh-gold">
      {t.warnings.unknownTz(tzFallback)}
    </p>
  {/if}

  {#if today}
    <section class="rounded-lg bg-gh-night text-[#f2ede0] px-6 py-8 md:px-10 flex gap-7 items-center flex-wrap">
      <div class="text-[#e3b93e] shrink-0">
        <Crescent day={today.hijri.day} size={128} id="today-moon" />
      </div>
      <div>
        <p class="m-0 mb-1 text-sm text-[#e3b93e]">{fmtDate(today.gregorian.date, locale)} · {today.gregorian.timezone}</p>
        <p class="m-0 font-bold tracking-tight leading-none tabular-nums text-[2.8rem]">
          {fmtNum(today.hijri.day, locale)} {monthPrimary} {fmtNum(today.hijri.year, locale)}
        </p>
        <p
          class={`m-0 mt-2 text-[1.4rem] ${isAr ? '' : 'font-arabic'}`}
          lang={isAr ? 'en' : 'ar'}
          dir={isAr ? 'ltr' : 'rtl'}
        >
          {monthSecondary}
        </p>
      </div>
      <p class="w-full m-0"><StatusBadge status={today.determination.status} {locale} /></p>
    </section>

    {#if today.warning}
      <p class="px-4 py-3 mt-4 text-sm font-medium rounded-md border border-gh-gold bg-gh-gold-soft text-gh-gold">
        {t.warnings.provisional}
      </p>
    {/if}

    <section class="mt-6 border-t-2 border-gh-gold pt-4">
      <p class="m-0 mb-2 leading-relaxed">{today.determination.decision_summary}</p>
      {#if today.determination.sighted_in.length > 0}
        <p class="m-0 mb-2 text-sm">
          <strong>{t.today.sightedIn}</strong> {today.determination.sighted_in.map((p) => placeLabel(p, locale)).join('; ')}
        </p>
      {/if}
      <p class="m-0 text-sm text-gh-soft">
        {t.common.nextWatching}: <strong class="text-gh-ink">{fmtDate(today.next_observation_date, locale)}</strong> ·
        <Link href={`/hijri/${today.hijri.month_key}`} class="font-semibold">{t.common.monthDetail}</Link>
      </p>
    </section>
  {:else}
    <p class="text-gh-soft">{t.today.noCoverage}</p>
  {/if}

  <p class="mt-8 text-sm text-gh-soft max-w-[62ch]">
    {t.today.explainer}
  </p>
</PublicLayout>
