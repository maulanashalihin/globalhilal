<script lang="ts">
  import { usePage } from '@inertiajs/svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import { dict, fmtNum } from '../i18n'
  import type { Locale, SharedPageProps } from '../../shared/types'

  let { total }: { total: number } = $props()

  const page = usePage<SharedPageProps>()
  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
</script>

<svelte:head>
  <title>{t.docs.title} — GlobalHilal</title>
  <meta name="description" content={t.meta.docsDescription} />
  <link rel="canonical" href={`https://globalhilal.org/${locale}/docs`} />
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">{t.docs.kicker}</p>
  <h1 class="m-0 mb-3 tracking-tight text-[2rem] font-bold">{t.docs.h1}</h1>
  <p class="mt-0 mb-2 text-gh-soft max-w-[64ch]">
    {t.docs.intro}
    <code dir="ltr" class="font-mono text-[0.85em] bg-gh-panel border border-gh-line rounded px-1.5 py-0.5">https://globalhilal.org/api/v1</code>.
  </p>
  <p class="mt-0 mb-10 text-sm text-gh-soft">{t.docs.published(fmtNum(total, locale))}</p>

  <div class="flex flex-col">
    {#each t.docs.endpoints as e (e.method)}
      <section class="grid gap-3 md:grid-cols-[240px_1fr] py-6 border-t border-gh-line">
        <h2 dir="ltr" class="m-0 font-mono text-[0.95rem] font-bold">{e.method}</h2>
        <div>
          <p class="m-0 mb-3 text-[0.95rem] text-gh-soft">{e.desc}</p>
          <pre dir="ltr" class="m-0 text-xs bg-gh-night text-[#f2ede0] rounded-md p-4 overflow-x-auto">{e.curl}</pre>
        </div>
      </section>
    {/each}
  </div>

  <section class="mt-4 border-s-4 border-gh-gold bg-gh-panel rounded-e-md p-5 text-sm leading-relaxed max-w-[68ch]">
    <p class="m-0">
      {t.docs.errorsLead} <code dir="ltr" class="font-mono text-[0.85em]">{t.docs.errorsEnvelope}</code>
      {t.docs.errorsCodes}
      {t.docs.errorsTail}
    </p>
  </section>
</PublicLayout>
