<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import PublicLayout from '../components/PublicLayout.svelte'
</script>

<svelte:head>
  <title>Methodology — GlobalHilal</title>
  <meta
    name="description"
    content="How GlobalHilal sets Hijri months: testimony-based global moon-sighting. One valid sighting anywhere starts the month for all."
  />
  <link rel="canonical" href="https://globalhilal.org/methodology" />
</svelte:head>

<PublicLayout>
  <p class="m-0 mb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gh-gold">Methodology</p>
  <h1 class="m-0 mb-3 tracking-tight text-[2rem] font-bold max-w-[20ch]">
    Five rules decide every date on this site.
  </h1>
  <p class="mt-0 mb-10 text-gh-soft max-w-[62ch]">
    Applied the same way every month, with no exceptions for any country.
    If a date here surprises you, these rules explain why.
  </p>

  <ol class="m-0 p-0 list-none">
    <li class="grid gap-2 md:grid-cols-[72px_1fr] py-7 border-t-2 border-gh-gold">
      <span class="font-bold tabular-nums text-[2rem] leading-none text-gh-gold" aria-hidden="true">01</span>
      <div>
        <h2 class="m-0 mb-2 text-[1.25rem] font-bold">A month begins with testimony</h2>
        <p class="m-0 leading-relaxed text-gh-soft max-w-[64ch]">
          Following the hadith of the Messenger of Allah ﷺ — fast when you
          see it, break fast when you see it — a new month is declared when
          there is credible testimony that the crescent was seen. Without
          valid testimony, the month completes thirty days.
        </p>
      </div>
    </li>
    <li class="grid gap-2 md:grid-cols-[72px_1fr] py-7 border-t border-gh-line">
      <span class="font-bold tabular-nums text-[2rem] leading-none text-gh-gold" aria-hidden="true">02</span>
      <div>
        <h2 class="m-0 mb-2 text-[1.25rem] font-bold">One sighting counts for the whole world</h2>
        <p class="m-0 leading-relaxed text-gh-soft max-w-[64ch]">
          A single global horizon: one valid sighting anywhere on Earth
          starts the month for all Muslims. We are not bound to any single
          country — Saudi Arabia is one source among equals, and a village
          committee's testimony can carry the ummah.
        </p>
      </div>
    </li>
    <li class="grid gap-2 md:grid-cols-[72px_1fr] py-7 border-t border-gh-line">
      <span class="font-bold tabular-nums text-[2rem] leading-none text-gh-gold" aria-hidden="true">03</span>
      <div>
        <h2 class="m-0 mb-2 text-[1.25rem] font-bold">Testimony only — never forecasts</h2>
        <p class="m-0 leading-relaxed text-gh-soft max-w-[64ch]">
          We publish no predicted months. The only forward-looking date is
          the next observation evening, the 29th night. Ask for any date
          beyond confirmed testimony and the API answers: out of range.
        </p>
      </div>
    </li>
    <li class="grid gap-2 md:grid-cols-[72px_1fr] py-7 border-t border-gh-line">
      <span class="font-bold tabular-nums text-[2rem] leading-none text-gh-gold" aria-hidden="true">04</span>
      <div>
        <h2 class="m-0 mb-2 text-[1.25rem] font-bold">No day boundary</h2>
        <p class="m-0 leading-relaxed text-gh-soft max-w-[64ch]">
          A late testimony still counts for the same day. If Indonesia is
          past sunrise when a valid sighting arrives from a continent whose
          night falls later, that day is the 1st — revised on the same
          Gregorian date. Rulings can move from provisional to confirmed
          intraday.
        </p>
      </div>
    </li>
    <li class="grid gap-2 md:grid-cols-[72px_1fr] py-7 border-y border-gh-line">
      <span class="font-bold tabular-nums text-[2rem] leading-none text-gh-gold" aria-hidden="true">05</span>
      <div>
        <h2 class="m-0 mb-2 text-[1.25rem] font-bold">Evidence stays public</h2>
        <p class="m-0 leading-relaxed text-gh-soft max-w-[64ch]">
          Each month names its witnesses and links its rulings — see any
          <Link href="/calendar">month in the archive</Link>. Corrections
          append history; they never rewrite it.
        </p>
      </div>
    </li>
  </ol>
</PublicLayout>
