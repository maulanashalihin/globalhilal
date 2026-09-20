<script lang="ts">
  import { Link, useForm } from '@inertiajs/svelte'
  import PublicLayout from '../components/PublicLayout.svelte'

  let { months, submitted }: { months: { month_key: string; month_en: string }[]; submitted: boolean } = $props()

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
  <title>Report a moon sighting — GlobalHilal</title>
  <meta
    name="description"
    content="Saw the crescent? Send your moon-sighting testimony to GlobalHilal. Editors verify every report before it counts."
  />
  <link rel="canonical" href="https://globalhilal.org/contribute" />
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">Contribute</p>
  <h1 class="m-0 mb-3 tracking-tight text-[2rem] font-bold max-w-[22ch]">Saw the crescent? Tell the ummah.</h1>
  <p class="mt-0 mb-8 text-gh-soft max-w-[62ch]">
    One valid testimony anywhere opens the month for everyone — yours could
    be the one. Editors verify every report before it counts, and
    needless details stay private. One report per person per day.
  </p>

  {#if submitted}
    <p class="px-4 py-3 mb-6 text-sm font-medium rounded-md border border-green-200 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
      Jazakum Allahu khayran — your report was received and is awaiting editor review.
    </p>
  {/if}

  <form onsubmit={submit} novalidate class="grid gap-4 max-w-[640px]">
    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <label class={labelClass}>
        Month observed
        <select bind:value={form.monthKey} onchange={() => form.clearErrors('monthKey')} class={inputClass}>
          {#each months as m (m.month_key)}
            <option value={m.month_key}>{m.month_en} ({m.month_key})</option>
          {/each}
        </select>
        {#if form.errors.monthKey}<p class={errClass}>{form.errors.monthKey}</p>{/if}
      </label>
      <label class={labelClass}>
        Evening observed
        <input type="date" bind:value={form.sightedOn} onchange={() => form.clearErrors('sightedOn')} class={inputClass} />
        {#if form.errors.sightedOn}<p class={errClass}>{form.errors.sightedOn}</p>{/if}
      </label>
    </div>
    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <label class={labelClass}>
        Country
        <input type="text" bind:value={form.country} onchange={() => form.clearErrors('country')} class={inputClass} />
        {#if form.errors.country}<p class={errClass}>{form.errors.country}</p>{/if}
      </label>
      <label class={labelClass}>
        City (optional)
        <input type="text" bind:value={form.city} class={inputClass} />
      </label>
    </div>
    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <label class={labelClass}>
        Result
        <select bind:value={form.result} class={inputClass}>
          <option value="seen">Crescent seen</option>
          <option value="not_seen">Looked, not seen</option>
          <option value="cloudy">Cloudy — could not observe</option>
        </select>
      </label>
      <label class={labelClass}>
        Method
        <select bind:value={form.method} class={inputClass}>
          <option value="naked_eye">Naked eye</option>
          <option value="telescope">Telescope / binoculars</option>
          <option value="both">Both</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>
    </div>
    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <label class={labelClass}>
        Your name
        <input type="text" bind:value={form.reporterName} onchange={() => form.clearErrors('reporterName')} class={inputClass} />
        {#if form.errors.reporterName}<p class={errClass}>{form.errors.reporterName}</p>{/if}
      </label>
      <label class={labelClass}>
        Contact for follow-up (optional)
        <input type="text" placeholder="Email or phone" bind:value={form.contact} class={inputClass} />
      </label>
    </div>
    <label class={labelClass}>
      What did you see?
      <textarea rows="4" placeholder="Time after sunset, sky conditions, witnesses with you…" bind:value={form.note} onchange={() => form.clearErrors('note')} class={inputClass}></textarea>
      {#if form.errors.note}<p class={errClass}>{form.errors.note}</p>{/if}
    </label>
    <div>
      <button
        type="submit"
        class="inline-flex items-center justify-center px-5 py-2.5 border border-gh-ink rounded-md bg-gh-ink text-gh-sky font-semibold text-sm cursor-pointer transition-colors hover:opacity-85 hover:no-underline disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={form.processing}
      >
        {form.processing ? 'Sending…' : 'Submit testimony'}
      </button>
    </div>
    <p class="m-0 text-sm text-gh-soft">
      Read <Link href="/methodology" class="font-semibold">how rulings are made</Link> before reporting.
    </p>
  </form>
</PublicLayout>
