<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import { dict } from '../i18n'
  import type { Locale, SharedPageProps } from '../../shared/types'

  const page = usePage<SharedPageProps>()
  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))
</script>

<svelte:head>
  <title>{t.sources.title} — GlobalHilal</title>
  <meta name="description" content={t.meta.sourcesDescription} />
  <link rel="canonical" href="https://globalhilal.org/sources" />
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">{t.sources.kicker}</p>
  <h1 class="m-0 mb-3 tracking-tight text-[2rem] font-bold max-w-[22ch]">
    {t.sources.h1}
  </h1>
  <p class="mt-0 mb-10 text-gh-soft max-w-[62ch]">
    {t.sources.intro}
  </p>

  <div class="grid gap-8 md:grid-cols-2">
    <section>
      <h2 class="m-0 mb-3 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">{t.sources.accept}</h2>
      <ul class="m-0 p-0 list-none border-t border-gh-line text-[0.95rem]">
        {#each t.sources.items as item (item)}
          <li class="py-3 border-b border-gh-line">{item}</li>
        {/each}
      </ul>
    </section>
    <section>
      <h2 class="m-0 mb-3 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">{t.sources.check}</h2>
      <div class="border-s-4 border-gh-gold bg-gh-panel rounded-e-md p-5 text-[0.95rem] leading-relaxed">
        <p class="m-0 mb-3">
          {t.sources.checkBody1}
        </p>
        <p class="m-0">
          {t.sources.checkBody2Lead}<Link href="/contribute" class="font-semibold">{t.sources.checkBody2Link}</Link>{t.sources.checkBody2Tail}
        </p>
      </div>
    </section>
  </div>
</PublicLayout>
