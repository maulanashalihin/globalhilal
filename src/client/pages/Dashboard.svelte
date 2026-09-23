<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import Crescent from '../components/Crescent.svelte'
  import Layout from '../components/Layout.svelte'
  import type { DashboardStats } from '../../shared/types'

  let { stats }: { stats: DashboardStats } = $props()

  const page = usePage()
  const user = $derived(page.props.auth.user)
  const today = $derived(stats.today)
  const needsAttention = $derived(
    stats.draftCount + stats.provisionalCount + stats.monthsMissingReferences.length,
  )
</script>

<svelte:head><title>Dashboard — GlobalHilal console</title></svelte:head>

{#if user}
  <Layout>
    <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">Console</p>
    <h1 class="text-[1.7rem] m-0 mb-5 tracking-tight font-display font-bold">Assalamu'alaikum, {user.name}</h1>

    {#if today}
      <section class="rounded-lg bg-gh-night text-[#f2ede0] px-6 py-6 mb-6 flex gap-5 items-center flex-wrap">
        <span class="text-[#e3b93e]" aria-hidden="true">
          <Crescent day={today.hijri.day} size={72} id="dash-moon" />
        </span>
        <div>
          <p class="m-0 text-sm text-[#e3b93e]">{today.gregorian.date} (UTC) · next watching {today.next_observation_date}</p>
          <p class="m-0 font-bold tracking-tight tabular-nums text-[1.7rem]">
            {today.hijri.day} {today.hijri.month_en} {today.hijri.year}
          </p>
          <p class="m-0 text-sm capitalize">Live status: {today.determination.status}</p>
        </div>
        <p class="m-0 ml-auto">
          <Link
            href={`/en/hijri/${today.hijri.month_key}`}
            class="inline-flex items-center px-4 py-2.5 rounded-md bg-[#e3b93e] text-gh-night font-semibold text-sm cursor-pointer hover:no-underline hover:opacity-90"
          >
            View public page
          </Link>
        </p>
      </section>
    {:else}
      <section class="rounded-lg border border-gh-gold bg-gh-gold-soft text-gh-gold px-6 py-5 mb-6">
        <p class="m-0 font-semibold">No published month covers today.</p>
        <p class="m-0 text-sm">Create the draft in the <Link href="/admin/hijri" class="font-semibold">Hijri console</Link> and record tonight's testimony.</p>
      </section>
    {/if}

    <div class="grid gap-4 md:grid-cols-3 mb-6">
      <div class="bg-gh-sky border border-gh-line rounded-lg p-5">
        <p class="m-0 mb-1 text-[2rem] font-bold tabular-nums leading-none">{stats.monthCount}</p>
        <p class="m-0 text-sm text-gh-soft">Months in archive</p>
      </div>
      <div class="bg-gh-sky border border-gh-line rounded-lg p-5">
        <p class="m-0 mb-1 text-[2rem] font-bold tabular-nums leading-none">{needsAttention}</p>
        <p class="m-0 text-sm text-gh-soft">Need attention ({stats.draftCount} drafts, {stats.provisionalCount} provisional, {stats.monthsMissingReferences.length} missing references)</p>
      </div>
      <div class="bg-gh-sky border border-gh-line rounded-lg p-5">
        <p class="m-0 mb-1 text-[2rem] font-bold tabular-nums leading-none">{stats.userCount}</p>
        <p class="m-0 text-sm text-gh-soft">Registered users</p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 items-start">
      <section class="bg-gh-sky border border-gh-line rounded-lg p-6">
        <div class="flex items-center gap-3 mb-3">
          <h2 class="text-[1.1rem] m-0">Recent months</h2>
          <Link href="/admin/hijri" class="ml-auto text-sm font-semibold">Open Hijri console</Link>
        </div>
        <ul class="m-0 p-0 list-none border-t border-gh-line text-sm">
          {#each stats.recentMonths as m (m.month_key)}
            <li class="py-2.5 border-b border-gh-line flex gap-3 items-baseline">
              <Link href={`/admin/hijri/${m.month_key}`} class="font-semibold">{m.month_en}</Link>
              <span class="text-gh-soft tabular-nums">{m.start_gregorian}</span>
              <span class="ml-auto capitalize text-gh-soft">{m.status}</span>
            </li>
          {/each}
          {#if stats.recentMonths.length === 0}
            <li class="py-3 text-gh-soft">Nothing published yet.</li>
          {/if}
        </ul>
      </section>

      <section class="bg-gh-sky border border-gh-line rounded-lg p-6">
        <h2 class="text-[1.1rem] m-0 mb-3">Missing references</h2>
        {#if stats.monthsMissingReferences.length === 0}
          <p class="m-0 text-sm text-gh-soft">Every published month has at least one reference. Good.</p>
        {:else}
          <ul class="m-0 p-0 list-none border-t border-gh-line text-sm">
            {#each stats.monthsMissingReferences as m (m.month_key)}
              <li class="py-2.5 border-b border-gh-line">
                <Link href={`/admin/hijri/${m.month_key}`} class="font-semibold">{m.month_en} ({m.month_key})</Link>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>
  </Layout>
{/if}
