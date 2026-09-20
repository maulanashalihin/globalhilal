<script lang="ts">
  import PublicLayout from '../components/PublicLayout.svelte'

  let { total }: { total: number } = $props()

  const endpoints = [
    {
      method: 'GET /today',
      desc: "Today's Hijri date. Query tz (IANA, default UTC) and date (YYYY-MM-DD, for testing).",
      curl: 'curl "https://globalhilal.org/api/v1/today?tz=Asia/Jakarta"',
    },
    {
      method: 'GET /convert',
      desc: 'Hijri date for any Gregorian date: ?gregorian=YYYY-MM-DD&tz=…',
      curl: 'curl "https://globalhilal.org/api/v1/convert?gregorian=2026-03-20"',
    },
    {
      method: 'GET /months',
      desc: 'History, newest first. Query hijri_year, status, perPage, page.',
      curl: 'curl "https://globalhilal.org/api/v1/months?hijri_year=1447"',
    },
    {
      method: 'GET /months/current · /months/:year/:month',
      desc: 'The running month, or full detail with testimonies and references.',
      curl: 'curl "https://globalhilal.org/api/v1/months/1447/9"',
    },
  ]
</script>

<svelte:head>
  <title>API Docs — GlobalHilal</title>
  <meta
    name="description"
    content="Free public JSON API for testimony-based Hijri dates. No auth, CORS open, versioned at /api/v1."
  />
  <link rel="canonical" href="https://globalhilal.org/docs" />
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">Developers</p>
  <h1 class="m-0 mb-3 tracking-tight text-[2rem] font-bold">One endpoint answers “what Hijri date is it?”</h1>
  <p class="mt-0 mb-2 text-gh-soft max-w-[64ch]">
    Free JSON API, no key, CORS open for GET. Base URL
    <code class="font-mono text-[0.85em] bg-gh-panel border border-gh-line rounded px-1.5 py-0.5">https://globalhilal.org/api/v1</code>.
  </p>
  <p class="mt-0 mb-10 text-sm text-gh-soft">{total} month{total === 1 ? '' : 's'} published — and counting by testimony, never by forecast.</p>

  <div class="flex flex-col">
    {#each endpoints as e (e.method)}
      <section class="grid gap-3 md:grid-cols-[240px_1fr] py-6 border-t border-gh-line">
        <h2 class="m-0 font-mono text-[0.95rem] font-bold">{e.method}</h2>
        <div>
          <p class="m-0 mb-3 text-[0.95rem] text-gh-soft">{e.desc}</p>
          <pre class="m-0 text-xs bg-gh-night text-[#f2ede0] rounded-md p-4 overflow-x-auto">{e.curl}</pre>
        </div>
      </section>
    {/each}
  </div>

  <section class="mt-4 border-l-4 border-gh-gold bg-gh-panel rounded-r-md p-5 text-sm leading-relaxed max-w-[68ch]">
    <p class="m-0">
      Errors look like <code class="font-mono text-[0.85em]">{'{ error: { code, message } }'}</code>
      — <code class="font-mono text-[0.85em]">INVALID_TZ</code>, <code class="font-mono text-[0.85em]">INVALID_DATE</code>,
      <code class="font-mono text-[0.85em]">NOT_FOUND</code>, <code class="font-mono text-[0.85em]">OUT_OF_RANGE</code>.
      Dates beyond confirmed testimony return <code class="font-mono text-[0.85em]">OUT_OF_RANGE</code>:
      the API will not guess the future. Breaking changes ship as
      <code class="font-mono text-[0.85em]">/v2</code>; <code class="font-mono text-[0.85em]">/v1</code> stays for at least 12 months.
    </p>
  </section>
</PublicLayout>
