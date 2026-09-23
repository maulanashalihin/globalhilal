<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import Crescent from '../components/Crescent.svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import StatusBadge from '../components/StatusBadge.svelte'
  import { cityName, dict, fmtDate, fmtNum, placeLabel, placeName, withLocale } from '../i18n'
  import type { Locale, MonthDetailJson, SharedPageProps } from '../../shared/types'

  let { detail }: { detail: MonthDetailJson } = $props()

  const page = usePage<SharedPageProps>()
  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
  const isAr = $derived(locale === 'ar')

  const m = $derived(detail.month)
  const monthPrimary = $derived(isAr ? m.month_ar : m.month_en)
  const monthSecondary = $derived(isAr ? m.month_en : m.month_ar)
  const year = $derived(fmtNum(m.hijri_year, locale))
  const sightedLabel = $derived(detail.sighted_in.map((p) => placeLabel(p, locale)).join('; '))
  const pageUrl = $derived(`https://globalhilal.org/${locale}/hijri/${m.month_key}`)
  const jsonLd = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${monthPrimary} ${m.hijri_year} — ${m.start_gregorian}`,
      datePublished: m.published_at,
      about: `${monthPrimary} ${m.hijri_year}${sightedLabel ? ` — ${sightedLabel}` : ''}`,
    }),
  )
</script>

<svelte:head>
  <title>{t.month.title(monthPrimary, year, fmtDate(m.start_gregorian, locale))} — GlobalHilal</title>
  <meta
    name="description"
    content={`${monthPrimary} ${year}: ${sightedLabel || '—'}. ${m.decision_summary}`}
  />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:title" content={`${monthPrimary} ${year} — GlobalHilal`} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={pageUrl} />
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-3 text-sm text-gh-soft">
    <Link href={withLocale(locale, '/calendar')}>{t.month.calendarCrumb}</Link> · {t.common.hijriYear(year)}
  </p>

  <header class="flex gap-6 items-center flex-wrap pb-6 mb-6 border-b-2 border-gh-gold">
    <span class="text-gh-gold" aria-hidden="true">
      <Crescent day={m.length_days ?? 29} size={96} id="detail-moon" />
    </span>
    <div>
      <h1 class="m-0 tracking-tight leading-none font-bold text-[2.4rem]">{monthPrimary}</h1>
      <p
        class={`m-0 mt-1 text-[1.5rem] text-gh-soft ${isAr ? '' : 'font-arabic'}`}
        lang={isAr ? 'en' : 'ar'}
        dir={isAr ? 'ltr' : 'rtl'}
      >
        {monthSecondary} {year}
      </p>
      <p class="m-0 mt-3 flex gap-3 items-center flex-wrap">
        <StatusBadge status={m.status} {locale} />
        <span class="text-sm text-gh-soft tabular-nums">
          {fmtDate(m.start_gregorian, locale)}{#if m.length_days} → {t.common.days(fmtNum(m.length_days, locale))}{/if}
        </span>
      </p>
    </div>
  </header>

  <p class="m-0 mb-8 text-[1.15rem] leading-relaxed max-w-[62ch]">{m.decision_summary}</p>

  <h2 class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">
    {t.month.testimonies} · {fmtNum(detail.sightings.length, locale)}
  </h2>
  {#if detail.sightings.length === 0}
    <p class="text-sm text-gh-soft">{t.month.noTestimonies}</p>
  {:else}
    <ol class="m-0 mt-3 mb-8 p-0 list-none border-t border-gh-line">
      {#each detail.sightings as s (`${s.country}-${s.city}-${s.sighted_on}`)}
        <li class="py-4 border-b border-gh-line grid gap-1 md:grid-cols-[180px_1fr]">
          <div>
            <p class="m-0 font-bold">{placeName(s.country, locale)}{s.city ? ` · ${cityName(s.city, locale)}` : ''}</p>
            <p class="m-0 text-sm text-gh-soft tabular-nums">{t.common.eveningOf(fmtDate(s.sighted_on, locale))}</p>
          </div>
          <div class="text-sm">
            <p class="m-0 mb-1">
              <strong>{t.result[s.result] ?? s.result}</strong>
              <span class="text-gh-soft"> {t.common.by} {t.method[s.method] ?? s.method}{s.verified ? ` · ${t.common.verified}` : ''}</span>
            </p>
            {#if s.witness_org}<p class="m-0 mb-1 text-gh-soft">{t.common.witness}: {s.witness_org}</p>{/if}
            {#if s.note}<p class="m-0 text-gh-soft">{s.note}</p>{/if}
          </div>
        </li>
      {/each}
    </ol>
  {/if}

  <h2 class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">
    {t.month.references} · {fmtNum(detail.references.length, locale)}
  </h2>
  {#if detail.references.length === 0}
    <p class="text-sm text-gh-soft">{t.month.referencesPending}</p>
  {:else}
    <ul class="m-0 mt-3 mb-8 p-0 list-none flex flex-col">
      {#each detail.references as r (r.url)}
        <li class="py-3 border-b border-gh-line text-sm">
          <a href={r.url} rel="noopener noreferrer" target="_blank" class="font-semibold">{r.title}</a>
          <span class="text-gh-soft"> — {r.publisher}</span>
          {#if r.quote}
            <p class="m-1 mb-0 ps-3 border-s-2 border-gh-gold text-gh-soft">{r.quote}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <p class="m-0 text-sm text-gh-soft">
    {t.common.nextWatching}: <strong class="text-gh-ink">{fmtDate(detail.next_observation_date, locale)}</strong>
  </p>
</PublicLayout>
