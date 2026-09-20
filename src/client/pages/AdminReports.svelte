<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import Layout from '../components/Layout.svelte'

  interface Report {
    id: number
    monthKey: string
    country: string
    city: string | null
    sightedOn: string
    result: string
    method: string
    reporterName: string
    contact: string | null
    note: string
    status: string
  }

  let { pending, decided }: { pending: Report[]; decided: Report[] } = $props()

  function approve(id: number) {
    router.post(`/admin/reports/${id}/approve`)
  }

  function reject(id: number) {
    if (window.confirm('Reject this report?')) router.post(`/admin/reports/${id}/reject`)
  }
</script>

<svelte:head><title>Witness reports</title></svelte:head>

<Layout>
  <h1 class="text-[1.6rem] m-0 mb-1 tracking-tight">Witness reports</h1>
  <p class="text-gh-soft text-sm mt-0 mb-5">
    Public testimonies awaiting review. Approving records the report as a
    verified sighting on its month — the month draft must exist first.
  </p>

  <section class="bg-gh-panel border border-gh-line rounded-lg p-6 mb-6">
    <h2 class="text-[1.1rem] m-0 mb-4">Pending ({pending.length})</h2>
    {#if pending.length === 0}
      <p class="m-0 text-sm text-gh-soft">Queue is clear.</p>
    {:else}
      <ul class="m-0 p-0 list-none flex flex-col gap-3">
        {#each pending as r (r.id)}
          <li class="border border-gh-line rounded-lg p-4 text-sm">
            <p class="m-0 mb-1 font-bold">
              {r.country}{r.city ? ` (${r.city})` : ''} · evening of {r.sightedOn} ·
              <Link href={`/admin/hijri/${r.monthKey}`}>{r.monthKey}</Link>
            </p>
            <p class="m-0 mb-1 capitalize text-gh-soft">
              {r.result.replace('_', ' ')} · {r.method.replace('_', ' ')} — by {r.reporterName}{r.contact ? ` (${r.contact})` : ''}
            </p>
            <p class="m-0 mb-3 text-gh-soft">{r.note}</p>
            <div class="flex gap-2">
              <button
                type="button"
                class="inline-flex items-center px-3 py-1.5 rounded-md bg-gh-ink text-gh-sky font-semibold text-xs cursor-pointer hover:opacity-85"
                onclick={() => approve(r.id)}
              >
                Accept as testimony
              </button>
              <button
                type="button"
                class="inline-flex items-center px-3 py-1.5 rounded-md border border-gh-line bg-transparent text-gh-ink text-xs cursor-pointer hover:bg-gh-gold-soft"
                onclick={() => reject(r.id)}
              >
                Reject
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if decided.length > 0}
    <section class="bg-gh-panel border border-gh-line rounded-lg p-6">
      <h2 class="text-[1.1rem] m-0 mb-3">Recently decided</h2>
      <ul class="m-0 p-0 list-none text-sm">
        {#each decided as r (r.id)}
          <li class="py-2 border-b border-gh-line flex gap-3">
            <span class="capitalize font-semibold">{r.status}</span>
            <span>{r.country} · {r.sightedOn} · {r.monthKey}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</Layout>
