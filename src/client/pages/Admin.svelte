<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import Layout from '../components/Layout.svelte'
  import type { Paginated, User } from '../../shared/types'

  let { users }: { users: Paginated<User> } = $props()

  const page = usePage()
  const user = $derived(page.props.auth.user)

  const { currentPage, lastPage } = $derived(users.meta)

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function pageUrl(p: number): string {
    return `/admin?page=${p}`
  }

  const btnGhost =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gh-line rounded-lg bg-transparent text-gh-ink font-semibold text-sm cursor-pointer transition-colors hover:bg-gh-gold-soft hover:no-underline'
</script>

<svelte:head><title>Admin</title></svelte:head>

{#if user && user.role === 'admin'}
  <Layout>
    <h1 class="text-[1.6rem] m-0 mb-1 tracking-tight">Users</h1>
    <p class="text-gh-soft mb-3">
      {users.meta.total} user{users.meta.total === 1 ? '' : 's'} total — page
      {currentPage} of {lastPage} ·
      <Link href="/admin/hijri" class="font-semibold">Hijri console</Link>
    </p>

    <section class="bg-gh-panel border border-gh-line rounded-lg p-6">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap text-gh-soft text-xs uppercase tracking-wider bg-gh-sky">
                Name
              </th>
              <th class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap text-gh-soft text-xs uppercase tracking-wider bg-gh-sky">
                Email
              </th>
              <th class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap text-gh-soft text-xs uppercase tracking-wider bg-gh-sky">
                Role
              </th>
              <th class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap text-gh-soft text-xs uppercase tracking-wider bg-gh-sky">
                Joined
              </th>
            </tr>
          </thead>
          <tbody class="[&>tr:last-child>td]:border-b-0">
            {#each users.data as u (u.id)}
              <tr class="transition-colors hover:bg-gh-gold-soft">
                <td class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap">
                  {u.name}
                </td>
                <td class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap">
                  {u.email}
                </td>
                <td class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap">
                  <span
                    class={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-gh-gold-soft text-gh-gold'}`}
                  >
                    {u.role}
                  </span>
                </td>
                <td class="text-left px-3 py-2.5 border-b border-gh-line whitespace-nowrap">
                  {formatDate(u.createdAt)}
                </td>
              </tr>
            {/each}
            {#if users.data.length === 0}
              <tr>
                <td colspan={4} class="text-center text-gh-soft p-6">
                  No users yet.
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </section>

    <nav class="flex items-center justify-between gap-4 mt-4" aria-label="Pagination">
      {#if currentPage > 1}
        <Link href={pageUrl(currentPage - 1)} class={btnGhost}>
          Previous
        </Link>
      {:else}
        <span class={`${btnGhost} opacity-35 cursor-not-allowed`} aria-disabled="true">
          Previous
        </span>
      {/if}
      <span class="text-gh-soft text-sm">
        Page {currentPage} of {lastPage}
      </span>
      {#if currentPage < lastPage}
        <Link href={pageUrl(currentPage + 1)} class={btnGhost}>
          Next
        </Link>
      {:else}
        <span class={`${btnGhost} opacity-35 cursor-not-allowed`} aria-disabled="true">
          Next
        </span>
      {/if}
    </nav>
  </Layout>
{/if}
