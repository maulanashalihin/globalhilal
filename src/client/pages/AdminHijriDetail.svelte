<script lang="ts">
  import { Link, router, useForm } from '@inertiajs/svelte'
  import Layout from '../components/Layout.svelte'
  import type { MonthDetailJson } from '../../shared/types'

  type AdminSighting = MonthDetailJson['sightings'][number] & { id: number }
  type AdminReference = MonthDetailJson['references'][number] & { id: number }
  type AdminDetail = Omit<MonthDetailJson, 'sightings' | 'references'> & {
    sightings: AdminSighting[]
    references: AdminReference[]
  }

  let { id, detail, nextKey, expectedEnd }: { id: number; detail: AdminDetail; nextKey: string | null; expectedEnd: string | null } = $props()

  const m = $derived(detail.month)
  const hasTestimony = $derived(detail.sightings.some((s) => s.result === 'seen' && s.verified))

  const edit = useForm(`EditMonth:${id}`, {
    startGregorian: m.start_gregorian,
    endGregorian: m.end_gregorian ?? '',
    lengthDays: m.length_days === null ? '' : String(m.length_days),
    status: m.status,
    decisionSummaryEn: m.decision_summary,
  })
  edit.transform((data) => ({
    ...data,
    endGregorian: data.endGregorian === '' ? null : data.endGregorian,
    lengthDays: data.lengthDays === '' ? null : Number(data.lengthDays),
  }))

  function submitEdit(e: SubmitEvent) {
    e.preventDefault()
    edit.patch(`/admin/hijri/months/${id}`)
  }

  const sight = useForm({
    country: '',
    city: '',
    sightedOn: '',
    result: 'seen',
    method: 'naked_eye',
    witnessOrg: '',
    verified: false,
    noteEn: '',
  })

  function submitSighting(e: SubmitEvent) {
    e.preventDefault()
    sight.transform((d) => ({
      ...d,
      city: d.city === '' ? null : d.city,
      witnessOrg: d.witnessOrg === '' ? null : d.witnessOrg,
    }))
    sight.post(`/admin/hijri/months/${id}/sightings`, {
      onSuccess: () => sight.reset(),
    })
  }

  const ref = useForm({
    titleEn: '',
    publisher: '',
    url: 'https://',
    publishedAt: '',
    quoteEn: '',
    kind: 'official',
  })

  function submitRef(e: SubmitEvent) {
    e.preventDefault()
    ref.transform((d) => ({ ...d, publishedAt: d.publishedAt === '' ? null : d.publishedAt }))
    ref.post(`/admin/hijri/months/${id}/references`, {
      onSuccess: () => ref.reset(),
    })
  }

  function remove(url: string, label: string, e: MouseEvent) {
    e.preventDefault()
    if (window.confirm(`Remove ${label}?`)) router.delete(url)
  }

  const back = `/admin/hijri/${m.month_key}`
  const inputClass =
    'w-full px-3 py-2 border border-gh-line rounded-lg bg-gh-sky text-gh-ink text-sm focus:outline-2 focus:outline-gh-gold'
  const btnPrimary =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gh-ink rounded-lg bg-gh-ink text-gh-sky font-semibold text-sm cursor-pointer transition-colors hover:opacity-85 hover:no-underline disabled:opacity-60 disabled:cursor-not-allowed'
  const labelClass = 'flex flex-col gap-1 text-sm font-medium'
  const errClass = 'text-danger text-xs m-0'
</script>

<svelte:head><title>Edit {m.month_key}</title></svelte:head>

<Layout>
  <p class="text-sm text-gh-soft m-0 mb-1"><Link href="/admin/hijri">Hijri months</Link> · {m.month_key}
    {#if m.status !== 'draft'}
      · <a href={`/hijri/${m.month_key}`} target="_blank" rel="noopener">View public page</a>
    {/if}
  </p>
  <h1 class="text-[1.6rem] m-0 mb-1 tracking-tight">{m.month_en} {m.hijri_year}</h1>
  {#if expectedEnd && m.end_gregorian !== expectedEnd}
    <p class="px-4 py-3 mb-6 text-sm font-medium rounded-lg border border-gh-gold bg-gh-gold-soft text-gh-gold">
      Chain check: the next month starts {nextKey}, so this one should end {expectedEnd} —
      currently {m.end_gregorian ?? 'open'}. Fix the End field below to keep dates continuous.
    </p>
  {/if}
  {#if !hasTestimony}
    <p class="px-4 py-3 mb-6 text-sm font-medium rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
      No verified sighting recorded — this month can only stay a draft until testimony is added below.
    </p>
  {/if}

  <section class="bg-gh-panel border border-gh-line rounded-lg p-6 mb-6">
    <h2 class="text-[1.1rem] m-0 mb-4">Determination</h2>
    <form onsubmit={submitEdit} novalidate class="grid gap-4 max-w-[640px]">
      <div class="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <label class={labelClass}>
          Start (Gregorian)
          <input type="date" bind:value={edit.startGregorian} onchange={() => edit.clearErrors('startGregorian')} class={inputClass} />
          {#if edit.errors.startGregorian}<p class={errClass}>{edit.errors.startGregorian}</p>{/if}
        </label>
        <label class={labelClass}>
          End (or empty)
          <input type="date" bind:value={edit.endGregorian} onchange={() => edit.clearErrors('endGregorian')} class={inputClass} />
          {#if edit.errors.endGregorian}<p class={errClass}>{edit.errors.endGregorian}</p>{/if}
        </label>
        <label class={labelClass}>
          Length
          <select bind:value={edit.lengthDays} class={inputClass}>
            <option value="">Unknown</option>
            <option value="29">29 days</option>
            <option value="30">30 days</option>
          </select>
        </label>
      </div>
      <label class={labelClass}>
        Status
        <select bind:value={edit.status} onchange={() => edit.clearErrors('status')} class={inputClass}>
          <option value="draft">draft</option>
          <option value="provisional">provisional</option>
          <option value="confirmed">confirmed</option>
          <option value="corrected">corrected</option>
        </select>
        {#if edit.errors.status}<p class={errClass}>{edit.errors.status}</p>{/if}
      </label>
      <label class={labelClass}>
        Decision summary (English, 2–5 sentences: where, when, who testified, why global)
        <textarea rows="4" bind:value={edit.decisionSummaryEn} class={inputClass}></textarea>
      </label>
      <div>
        <button type="submit" class={btnPrimary} disabled={edit.processing}>
          {edit.processing ? 'Saving…' : 'Save determination'}
        </button>
      </div>
    </form>
  </section>

  <div class="grid gap-6 md:grid-cols-2 items-start">
    <section class="bg-gh-panel border border-gh-line rounded-lg p-6">
      <h2 class="text-[1.1rem] m-0 mb-4">Testimonies ({detail.sightings.length})</h2>
      <ul class="m-0 mb-5 p-0 list-none flex flex-col gap-2 text-sm">
        {#each detail.sightings as s, i (i)}
          <li class="border border-gh-line rounded-lg p-3">
            <p class="m-0 font-semibold">{s.country}{s.city ? ` (${s.city})` : ''} · {s.sighted_on}</p>
            <p class="m-0 text-gh-soft capitalize">{s.result.replace('_', ' ')} · {s.method.replace('_', ' ')} · {s.verified ? 'verified' : 'unverified'}</p>
            <button type="button" class="text-danger text-xs cursor-pointer bg-transparent border-none p-0 hover:underline" onclick={(e) => remove(`/admin/hijri/sightings/${s.id}?back=${back}`, 'testimony', e)}>
              Remove
            </button>
          </li>
        {/each}
      </ul>
      <h3 class="text-[0.95rem] m-0 mb-3">Record testimony</h3>
      <form onsubmit={submitSighting} novalidate class="grid gap-3">
        <div class="grid grid-cols-2 gap-3">
          <label class={labelClass}>Country<input type="text" bind:value={sight.country} onchange={() => sight.clearErrors('country')} class={inputClass} />
            {#if sight.errors.country}<p class={errClass}>{sight.errors.country}</p>{/if}</label>
          <label class={labelClass}>City (optional)<input type="text" bind:value={sight.city} class={inputClass} /></label>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <label class={labelClass}>Evening<input type="date" bind:value={sight.sightedOn} onchange={() => sight.clearErrors('sightedOn')} class={inputClass} />
            {#if sight.errors.sightedOn}<p class={errClass}>{sight.errors.sightedOn}</p>{/if}</label>
          <label class={labelClass}>Result
            <select bind:value={sight.result} class={inputClass}>
              <option value="seen">seen</option>
              <option value="not_seen">not seen</option>
              <option value="cloudy">cloudy</option>
            </select></label>
          <label class={labelClass}>Method
            <select bind:value={sight.method} class={inputClass}>
              <option value="naked_eye">naked eye</option>
              <option value="telescope">telescope</option>
              <option value="both">both</option>
              <option value="unknown">unknown</option>
            </select></label>
        </div>
        <label class={labelClass}>Witness / committee (optional)<input type="text" bind:value={sight.witnessOrg} class={inputClass} /></label>
        <label class={labelClass}>Verification note<input type="text" bind:value={sight.noteEn} class={inputClass} /></label>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={sight.verified} /> Verified testimony</label>
        <div><button type="submit" class={btnPrimary} disabled={sight.processing}>{sight.processing ? 'Saving…' : 'Add testimony'}</button></div>
      </form>
    </section>

    <section class="bg-gh-panel border border-gh-line rounded-lg p-6">
      <h2 class="text-[1.1rem] m-0 mb-4">References ({detail.references.length})</h2>
      <ul class="m-0 mb-5 p-0 list-none flex flex-col gap-2 text-sm">
        {#each detail.references as r, i (i)}
          <li class="border border-gh-line rounded-lg p-3">
            <p class="m-0 font-semibold">{r.title}</p>
            <p class="m-0 text-gh-soft">{r.publisher} · {r.kind}</p>
            <button type="button" class="text-danger text-xs cursor-pointer bg-transparent border-none p-0 hover:underline" onclick={(e) => remove(`/admin/hijri/references/${r.id}?back=${back}`, 'reference', e)}>
              Remove
            </button>
          </li>
        {/each}
      </ul>
      <h3 class="text-[0.95rem] m-0 mb-3">Add reference</h3>
      <form onsubmit={submitRef} novalidate class="grid gap-3">
        <label class={labelClass}>Title<input type="text" bind:value={ref.titleEn} onchange={() => ref.clearErrors('titleEn')} class={inputClass} />
          {#if ref.errors.titleEn}<p class={errClass}>{ref.errors.titleEn}</p>{/if}</label>
        <div class="grid grid-cols-2 gap-3">
          <label class={labelClass}>Publisher<input type="text" bind:value={ref.publisher} onchange={() => ref.clearErrors('publisher')} class={inputClass} />
            {#if ref.errors.publisher}<p class={errClass}>{ref.errors.publisher}</p>{/if}</label>
          <label class={labelClass}>Kind
            <select bind:value={ref.kind} class={inputClass}>
              <option value="official">official</option>
              <option value="news">news</option>
              <option value="org">org</option>
              <option value="other">other</option>
            </select></label>
        </div>
        <label class={labelClass}>URL (https://)<input type="text" bind:value={ref.url} onchange={() => ref.clearErrors('url')} class={inputClass} />
          {#if ref.errors.url}<p class={errClass}>{ref.errors.url}</p>{/if}</label>
        <label class={labelClass}>Published (optional)<input type="date" bind:value={ref.publishedAt} class={inputClass} /></label>
        <label class={labelClass}>Quote<input type="text" bind:value={ref.quoteEn} class={inputClass} /></label>
        <div><button type="submit" class={btnPrimary} disabled={ref.processing}>{ref.processing ? 'Saving…' : 'Add reference'}</button></div>
      </form>
    </section>
  </div>

  {#if nextKey}
    <p class="mt-6 text-sm"><Link href={`/admin/hijri/${nextKey}`}>Next month: {nextKey}</Link></p>
  {/if}
</Layout>
