<script lang="ts">
  import { Link, useForm, usePage } from '@inertiajs/svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
  import { dict } from '../i18n'
  import type { Locale, SharedPageProps } from '../../shared/types'

  let { months, submitted }: { months: { month_key: string; month_en: string; month_ar: string }[]; submitted: boolean } = $props()

  const page = usePage<SharedPageProps>()
  const locale = $derived((page.props.locale ?? 'en') as Locale)
  const t = $derived(dict(locale))

  const form = useForm({
    monthKey: months[0]?.month_key ?? '',
    country: '',
    city: '',
    sightedOn: '',
    result: 'seen',
    method: 'naked_eye',
    reporterName: '',
    contact: '',
    note: '',
  })

  function submit(e: SubmitEvent) {
    e.preventDefault()
    form.transform((d) => ({
      ...d,
      city: d.city === '' ? null : d.city,
      contact: d.contact === '' ? null : d.contact,
    }))
    form.post('/contribute')
  }

  const inputClass =
    'w-full px-3 py-2.5 border border-gh-line rounded-md bg-gh-sky text-gh-ink text-[0.95rem] focus:outline-2 focus:outline-gh-gold'
  const labelClass = 'flex flex-col gap-1 text-sm font-medium'
  const errClass = 'text-danger text-xs m-0'
</script>

<svelte:head>
  <title>{t.contribute.title} — GlobalHilal</title>
  <meta name="description" content={t.meta.contributeDescription} />
  <link rel="canonical" href="https://globalhilal.org/contribute" />
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">{t.contribute.kicker}</p>
  <h1 class="m-0 mb-3 tracking-tight text-[2rem] font-bold max-w-[22ch]">{t.contribute.h1}</h1>
  <p class="mt-0 mb-8 text-gh-soft max-w-[62ch]">
    {t.contribute.intro}
  </p>

  {#if submitted}
    <p class="px-4 py-3 mb-6 text-sm font-medium rounded-md border border-green-200 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
      {t.contribute.success}
    </p>
  {/if}

  <form onsubmit={submit} novalidate class="grid gap-4 max-w-[640px]">
    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <label class={labelClass}>
        {t.contribute.month}
        <select bind:value={form.monthKey} onchange={() => form.clearErrors('monthKey')} class={inputClass}>
          {#each months as m (m.month_key)}
            <option value={m.month_key}>{locale === 'ar' ? m.month_ar : m.month_en} ({m.month_key})</option>
          {/each}
        </select>
        {#if form.errors.monthKey}<p class={errClass}>{form.errors.monthKey}</p>{/if}
      </label>
      <label class={labelClass}>
        {t.contribute.evening}
        <input type="date" bind:value={form.sightedOn} onchange={() => form.clearErrors('sightedOn')} class={inputClass} />
        {#if form.errors.sightedOn}<p class={errClass}>{form.errors.sightedOn}</p>{/if}
      </label>
    </div>
    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <label class={labelClass}>
        {t.contribute.country}
        <input type="text" bind:value={form.country} onchange={() => form.clearErrors('country')} class={inputClass} />
        {#if form.errors.country}<p class={errClass}>{form.errors.country}</p>{/if}
      </label>
      <label class={labelClass}>
        {t.contribute.city}
        <input type="text" bind:value={form.city} class={inputClass} />
      </label>
    </div>
    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <label class={labelClass}>
        {t.contribute.result}
        <select bind:value={form.result} class={inputClass}>
          <option value="seen">{t.contribute.resultOptions.seen}</option>
          <option value="not_seen">{t.contribute.resultOptions.not_seen}</option>
          <option value="cloudy">{t.contribute.resultOptions.cloudy}</option>
        </select>
      </label>
      <label class={labelClass}>
        {t.contribute.method}
        <select bind:value={form.method} class={inputClass}>
          <option value="naked_eye">{t.contribute.methodOptions.naked_eye}</option>
          <option value="telescope">{t.contribute.methodOptions.telescope}</option>
          <option value="both">{t.contribute.methodOptions.both}</option>
          <option value="unknown">{t.contribute.methodOptions.unknown}</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <label class={labelClass}>
        {t.contribute.name}
        <input type="text" bind:value={form.reporterName} onchange={() => form.clearErrors('reporterName')} class={inputClass} />
        {#if form.errors.reporterName}<p class={errClass}>{form.errors.reporterName}</p>{/if}
      </label>
      <label class={labelClass}>
        {t.contribute.contact}
        <input type="text" placeholder={t.contribute.contactPlaceholder} bind:value={form.contact} class={inputClass} />
      </label>
    </div>
    <label class={labelClass}>
      {t.contribute.note}
      <textarea rows="4" placeholder={t.contribute.notePlaceholder} bind:value={form.note} onchange={() => form.clearErrors('note')} class={inputClass}></textarea>
      {#if form.errors.note}<p class={errClass}>{form.errors.note}</p>{/if}
    </label>
    <div>
      <button
        type="submit"
        class="inline-flex items-center justify-center px-5 py-2.5 border border-gh-ink rounded-md bg-gh-ink text-gh-sky font-semibold text-sm cursor-pointer transition-colors hover:opacity-85 hover:no-underline disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={form.processing}
      >
        {form.processing ? t.contribute.sending : t.contribute.submit}
      </button>
    </div>
    <p class="m-0 text-sm text-gh-soft">
      {t.contribute.readMethodologyLead}<Link href="/methodology" class="font-semibold">{t.contribute.readMethodologyLink}</Link>{t.contribute.readMethodologyTail}
    </p>
  </form>
</PublicLayout>
