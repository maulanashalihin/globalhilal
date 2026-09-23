<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import Crescent from '../components/Crescent.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import Stars from '../components/Stars.svelte'
  import StatusBadge from '../components/StatusBadge.svelte'
  import { dict, fmtDate, fmtNum, placeLabel } from '../i18n'
  import type { Locale, SharedPageProps, TodayData } from '../../shared/types'

  let { today }: { today: TodayData | null } = $props()

  const page = usePage<SharedPageProps>()
  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
  const isAr = $derived(locale === 'ar')

  // Arabic pages lead with the Arabic month name; English pages with the
  // English one. The other name stays visible as a cross-reference.
  const monthPrimary = $derived(today ? (isAr ? today.hijri.month_ar : today.hijri.month_en) : '')
  const monthSecondary = $derived(today ? (isAr ? today.hijri.month_en : today.hijri.month_ar) : '')

  const title = $derived(
    today
      ? `${fmtNum(today.hijri.day, locale)} ${monthPrimary} ${fmtNum(today.hijri.year, locale)} — GlobalHilal`
      : 'GlobalHilal — Global moon-sighting Hijri calendar',
  )
  const canonical = 'https://globalhilal.org/'
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={t.meta.homeDescription} />
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
        <div class="min-w-[240px] flex-1 text-center md:text-start">
          <p class="m-0 mb-3 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#e3b93e]">
            {t.home.kicker(fmtDate(today.gregorian.date, locale), fmtNum(today.hijri.day, locale))}
          </p>
          <p class="m-0 font-bold leading-none tracking-tight tabular-nums text-[3.4rem] md:text-[4.6rem]">
            {fmtNum(today.hijri.day, locale)} {monthPrimary}
          </p>
          <p
            class={`m-0 mt-2 text-[1.7rem] leading-snug ${isAr ? '' : 'font-arabic'}`}
            lang={isAr ? 'en' : 'ar'}
            dir={isAr ? 'ltr' : 'rtl'}
          >
            {monthSecondary} {fmtNum(today.hijri.year, locale)}
          </p>
          <p class="mt-4 mb-0">
            <StatusBadge status={today.determination.status} {locale} />
          </p>
        </div>
      </div>
    </section>

    {#if today.warning}
      <p class="px-4 py-3 mt-4 text-sm font-medium rounded-md border border-gh-gold bg-gh-gold-soft text-gh-gold">
        {t.warnings.provisional}
      </p>
    {/if}

    <section class="mt-8 grid gap-8 md:grid-cols-[1.5fr_1fr]">
      <div>
        <p class="m-0 mb-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">
          {t.home.evidence}
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
                <span><strong>{t.home.sightedIn(placeLabel(place, locale))}</strong>{t.home.sightedInNote}</span>
              </li>
            {/each}
          </ul>
        {/if}
        <p class="m-0 text-sm">
          <Link href={`/hijri/${today.hijri.month_key}`} class="font-semibold">
            {t.common.readRuling}
          </Link>
        </p>
      </div>
      <aside class="border-s-4 border-gh-gold bg-gh-panel rounded-e-md p-5 h-fit">
        <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">
          {t.common.nextWatching}
        </p>
        <p class="m-0 mb-1 text-[1.5rem] font-bold tabular-nums">{fmtDate(today.next_observation_date, locale)}</p>
        <p class="m-0 text-sm text-gh-soft">
          {t.home.nextWatchingNote}
        </p>
      </aside>
    </section>

    <section class="mt-10 border-t border-gh-line pt-6 flex gap-4 items-baseline flex-wrap">
      <p class="m-0 text-sm text-gh-soft">
        {t.home.apiCta}
        <Link href="/docs" class="font-semibold">{t.home.apiCtaLink}</Link>.
      </p>
    </section>
  {:else}
    <section class="relative overflow-hidden rounded-lg bg-gh-night text-[#f2ede0] px-6 py-14 md:px-12 text-center">
      <div class="absolute inset-0 text-[#e3b93e]">
        <Stars count={110} />
      </div>
      <h1 class="relative m-0 mb-3 tracking-tight text-[2.4rem] font-bold">GlobalHilal</h1>
      <p class="relative m-0 text-[#e3b93e]">
        {t.home.empty}
      </p>
    </section>
  {/if}
</PublicLayout>
