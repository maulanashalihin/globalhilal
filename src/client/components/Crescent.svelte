<script lang="ts">
  /**
   * Moon phase rendered from the Hijri day (1–30): a lit disc partially
   * covered by a shadow disc. Offset follows the illuminated fraction
   * f = (1 − cos 2π·age/29.53)/2 — waxing shadow exits left, waning
   * enters right. Pure geometry, no images.
   */
  let { day, size = 160, id = 'moon' }: { day: number; size?: number; id?: string } = $props()

  const R = 100
  const age = $derived(Math.min(29.53, Math.max(0, day - 1)))
  const frac = $derived((1 - Math.cos((2 * Math.PI * age) / 29.53)) / 2)
  const waxing = $derived(age <= 29.53 / 2)
  // Shadow-centre offset from the lit disc centre (0 = new, 2R = full).
  const d = $derived(2 * R * frac)
  const shadowCx = $derived(waxing ? R - d : R + d)
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 200 200"
  role="img"
  aria-label={`Moon phase, day ${day} of the Hijri month`}
>
  <title>Moon phase, day {day} of the Hijri month</title>
  <defs>
    <mask id={id}>
      <rect width="200" height="200" fill="white" />
      <circle cx={shadowCx} cy={R} r={R - 1} fill="black" />
    </mask>
  </defs>
  <circle cx={R} cy={R} r={R - 1} fill="currentColor" opacity="0.16" />
  <circle cx={R} cy={R} r={R - 1} fill="currentColor" mask={`url(#${id})`} />
</svg>
