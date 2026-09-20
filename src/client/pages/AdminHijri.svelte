<script lang="ts">
  import { Link, useForm } from '@inertiajs/svelte'
  import Layout from '../components/Layout.svelte'

  interface MonthRow {
    id: number
    month_key: string | null
    month_en: string
    start_gregorian: string | null
    length_days: number | null
    status: string
    sighted_in: string[]
  }

  let { months, defaultYear, defaultMonth }: { months: MonthRow[]; defaultYear: number; defaultMonth: number } = $props()

  const create = useForm({ hijriYear: defaultYear, hijriMonth: defaultMonth })

  function submitCreate(e: SubmitEvent) {
    e.preventDefault()
    create.post('/admin/hijri/months')
  }

  function remove(id: number, key: string | null, e: MouseEvent) {
    e.preventDefault()
    if (window.confirm(`Delete ${key ?? id} and all its testimony? This cannot be undone.`)) {
      create.delete(`/admin/hijri/months/${id}`)
    }
  }

  const btnPrimary =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gh-ink rounded-lg bg-gh-ink text-gh-sky font-semibold text-sm cursor-pointer transition-colors hover:opacity-85 hover:no-underline disabled:opacity-60 disabled:cursor-not-allowed'
  const inputClass =
    'px-3 py-2 border border-gh-line rounded-lg bg-gh-sky text-gh-ink text-sm focus:outline-2 focus:outline-gh-gold'
</script>

<svelte:head><title>Hijri admin</title></svelte:head>

<Layout>
  <div class="flex items-center gap-3 flex-wrap mb-1">
    <h1 class="text-[1.6rem] m-0 tracking-tight">Hijri months</h1>
    <span class="text-sm text-gh-soft">{months.length} records</span>
  </div>
  <p class="text-gh-soft text-sm mt-0 mb-5">
    New months start as drafts dated today — set the real testimony date
    when publishing. Publishing requires a verified sighting.
  </p>

  <section class="bg-gh-panel border border-gh-line rounded-lg p-5 mb-6">
    <h2 class="text-[1.05rem] m-0 mb-3">New draft month</h2>
    <form class="flex gap-2 items-end flex-wrap" onsubmit={submitCreate} novalidate>
      <label class="flex flex-col gap-1 text-sm">
        Hijri year
        <input type="number" min="1" max="9999" bind:value={create.hijriYear} onchange={() => create.clearErrors('hijriYear')} class={inputClass} />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Month (1–12)
        <input type="number" min="1" max="12" bind:value={create.hijriMonth} onchange={() => create.clearErrors('hijriMonth')} class={inputClass} />
      </label>
      <button type="submit" class={btnPrimary} disabled={create.processing}>
        {create.processing ? 'Creating…' : 'Create draft'}
      </button>
    </form>
    {#if create.errors.hijriMonth}<p class="text-danger text-sm mt-2 mb-0">{create.errors.hijriMonth}</p>{/if}
    {#if create.errors.hijriYear}<p class="text-danger text-sm mt-2 mb-0">{create.errors.hijriYear}</p>{/if}
  </section>

  <section class="bg-gh-panel border border-gh-line rounded-lg p-6">
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap text-gh-soft text-xs uppercase tracking-wider bg-gh-sky">Month</th>
            <th scope="col" class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap text-gh-soft text-xs uppercase tracking-wider bg-gh-sky">Start</th>
            <th scope="col" class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap text-gh-soft text-xs uppercase tracking-wider bg-gh-sky">Days</th>
            <th scope="col" class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap text-gh-soft text-xs uppercase tracking-wider bg-gh-sky">Status</th>
            <th scope="col" class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap text-gh-soft text-xs uppercase tracking-wider bg-gh-sky"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody class="[&>tr:last-child>td]:border-b-0">
          {#each months as m (m.id)}
            <tr class="transition-colors hover:bg-gh-gold-soft">
              <td class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap font-semibold">
                <Link href={`/admin/hijri/${m.month_key}`}>{m.month_en} ({m.month_key})</Link>
              </td>
              <td class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap tabular-nums">{m.start_gregorian ?? '—'}</td>
              <td class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap">{m.length_days ?? '—'}</td>
              <td class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap capitalize">{m.status}</td>
              <td class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap">
                <button
                  type="button"
                  class="text-danger text-sm cursor-pointer bg-transparent border-none p-0 hover:underline"
                  onclick={(e) => remove(m.id, m.month_key, e)}
                >
                  Delete
                </button>
              </td>
            </tr>
          {/each}
          {#if months.length === 0}
            <tr><td colspan={5} class="text-center text-gh-soft p-6">No months yet — create the first draft above.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</Layout>
