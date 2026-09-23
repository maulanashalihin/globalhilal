<script lang="ts">
  import { Link, router, usePage } from '@inertiajs/svelte'
  import Crescent from '../components/Crescent.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import StatusBadge from '../components/StatusBadge.svelte'
  import { dict, fmtDate, fmtNum, withLocale } from '../i18n'
  import type { CalendarMonthSlot, Locale, SharedPageProps } from '../../shared/types'

  let { years, selectedYear, months }: { years: number[]; selectedYear: number | null; months: CalendarMonthSlot[] } = $props()

  const page = usePage<SharedPageProps>()
  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
  const isAr = $derived(locale === 'ar')

  function pickYear(e: Event) {
    const y = (e.target as HTMLSelectElement).value
    router.get(withLocale(locale, '/calendar'), y ? { hijri_year: y } : {})
  }
</script>

<svelte:head>
  <title>{selectedYear ? t.calendar.title(fmtNum(selectedYear, locale)) : t.calendar.titleFallback} — GlobalHilal</title>
  <meta name="description" content={t.meta.calendarDescription} />
  <link rel="canonical" href={`https://globalhilal.org/${locale}/calendar`} />
</svelte:head>

<PublicLayout>
  <div class="flex items-end gap-4 flex-wrap mb-2">
    <div>
      <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">{t.calendar.kicker}</p>
      <h1 class="m-0 tracking-tight text-[1.9rem] font-bold">{t.calendar.h1}</h1>
    </div>
    {#if years.length > 0}
      <label class="ms-auto flex items-center gap-2 text-sm text-gh-soft">
        {t.calendar.year}
        <select
          class="h-10 px-3 border border-gh-line rounded-md bg-gh-sky text-gh-ink text-sm cursor-pointer"
          value={selectedYear ?? ''}
          onchange={pickYear}
        >
          {#each years as y (y)}
            <option value={y}>{t.common.hijriYear(fmtNum(y, locale))}</option>
          {/each}
        </select>
      </label>
    {/if}
  </div>
  <p class="mt-0 mb-7 text-sm text-gh-soft max-w-[64ch]">
    {t.calendar.intro}
  </p>

  {#if selectedYear === null}
    <p class="text-gh-soft">{t.calendar.noData}</p>
  {:else}
    <ol class="m-0 p-0 list-none grid gap-px bg-gh-line border border-gh-line rounded-lg overflow-hidden md:grid-cols-2">
      {#each months as m, i (m.hijri_month)}
        {@const monthPrimary = isAr ? m.month_ar : m.month_en}
        {@const monthSecondary = isAr ? m.month_en : m.month_ar}
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
              <span class="text-gh-soft font-semibold tabular-nums me-2">{fmtNum(String(i + 1).padStart(2, '0'), locale)}</span>{#if m.month_key}<Link href={withLocale(locale, `/hijri/${m.month_key}`)}>{monthPrimary}</Link>{:else}{monthPrimary}{/if}
            </p>
            <p
              class={`m-0 mb-2 text-gh-soft ${isAr ? '' : 'font-arabic'}`}
              lang={isAr ? 'en' : 'ar'}
              dir={isAr ? 'ltr' : 'rtl'}
            >
              {monthSecondary}
            </p>
            {#if m.start_gregorian}
              <p class="m-0 mb-2 text-sm text-gh-soft">
                {fmtDate(m.start_gregorian, locale)}{#if m.length_days} · {t.common.days(fmtNum(m.length_days, locale))}{/if}
              </p>
              <StatusBadge status={m.status} {locale} />
            {:else}
              <p class="m-0 text-sm text-gh-soft">{t.calendar.awaiting}</p>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</PublicLayout>
