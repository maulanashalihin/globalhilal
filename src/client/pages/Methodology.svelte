<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import { dict, withLocale } from '../i18n'
  import type { Locale, SharedPageProps } from '../../shared/types'

  const page = usePage<SharedPageProps>()
  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
</script>

<svelte:head>
  <title>{t.methodology.title} — GlobalHilal</title>
  <meta name="description" content={t.meta.methodologyDescription} />
  <link rel="canonical" href={`https://globalhilal.org/${locale}/methodology`} />
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">{t.methodology.kicker}</p>
  <h1 class="m-0 mb-3 tracking-tight text-[2rem] font-bold max-w-[20ch]">
    {t.methodology.h1}
  </h1>
  <p class="mt-0 mb-10 text-gh-soft max-w-[62ch]">
    {t.methodology.intro}
  </p>

  <ol class="m-0 p-0 list-none">
    {#each t.methodology.rules as rule, i (rule.n)}
      <li class={`grid gap-2 md:grid-cols-[72px_1fr] py-7 ${i === 0 ? 'border-t-2 border-gh-gold' : i === t.methodology.rules.length - 1 ? 'border-y border-gh-line' : 'border-t border-gh-line'}`}>
        <span class="font-bold tabular-nums text-[2rem] leading-none text-gh-gold" aria-hidden="true">{rule.n}</span>
        <div>
          <h2 class="m-0 mb-2 text-[1.25rem] font-bold">{rule.title}</h2>
          <p class="m-0 leading-relaxed text-gh-soft max-w-[64ch]">
            {rule.body}
          </p>
          {#if i === t.methodology.rules.length - 1}
            <p class="mt-2 mb-0 leading-relaxed text-gh-soft max-w-[64ch]">
              {t.methodology.archiveLead}<Link href={withLocale(locale, '/calendar')}>{t.methodology.archiveLink}</Link>{t.methodology.archiveTail}
            </p>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
</PublicLayout>
