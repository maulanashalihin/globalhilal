<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
</script>

<svelte:head>
  <title>Sources — GlobalHilal</title>
  <meta
    name="description"
    content="Where GlobalHilal rulings come from: official announcements, state news agencies, ministries and hilal committees worldwide."
  />
  <link rel="canonical" href="https://globalhilal.org/sources" />
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">Sources</p>
  <h1 class="m-0 mb-3 tracking-tight text-[2rem] font-bold max-w-[22ch]">
    Every ruling links to what actually happened.
  </h1>
  <p class="mt-0 mb-10 text-gh-soft max-w-[62ch]">
    Each month we look for what truly occurred: official announcements,
    state news agencies, ministries of religious affairs, and hilal
    committees — in any country. Aggregators and blogs are supplementary
    only, never the sole basis.
  </p>

  <div class="grid gap-8 md:grid-cols-2">
    <section>
      <h2 class="m-0 mb-3 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">We accept</h2>
      <ul class="m-0 p-0 list-none border-t border-gh-line text-[0.95rem]">
        <li class="py-3 border-b border-gh-line">Moon-sighting committee announcements with named witnesses</li>
        <li class="py-3 border-b border-gh-line">State news agencies reporting an official decision</li>
        <li class="py-3 border-b border-gh-line">Ministries of religious affairs (Indonesia, Malaysia, Brunei, Morocco, Jordan, …)</li>
        <li class="py-3 border-b border-gh-line">Recognised hilal committees publishing their testimony</li>
      </ul>
    </section>
    <section>
      <h2 class="m-0 mb-3 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">How to check us</h2>
      <div class="border-l-4 border-gh-gold bg-gh-panel rounded-r-md p-5 text-[0.95rem] leading-relaxed">
        <p class="m-0 mb-3">
          Each reference lists its publisher, publication date and the exact
          quoted sentence. Dead links are replaced with an archived copy.
        </p>
        <p class="m-0">
          Saw the crescent yourself?
          <Link href="/contribute" class="font-semibold">Send your testimony</Link> —
          editors verify every report, and corrections are published, never
          silently edited.
        </p>
      </div>
    </section>
  </div>
</PublicLayout>
