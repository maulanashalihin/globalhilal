<script lang="ts">
  /**
   * Deterministic star field — positions derive from the index (no
   * Math.random), so SSR HTML and client hydration match exactly.
   */
  let { count = 90 }: { count?: number } = $props()

  function star(i: number) {
    let h = (i * 2654435761 + 11) % 4294967296
    const rnd = (salt: number) => {
      h = (h * 1664525 + 1013904223 + salt * 97) % 4294967296
      return h / 4294967296
    }
    return {
      x: rnd(1) * 100,
      y: rnd(2) * 100,
      r: 0.4 + rnd(3) * 1.1,
      dur: 2.5 + rnd(4) * 4,
      delay: rnd(5) * 5,
    }
  }

  const stars = $derived(Array.from({ length: count }, (_, i) => star(i)))
</script>

<svg aria-hidden="true" class="pointer-events-none absolute inset-0 h-full w-full" focusable="false">
  {#each stars as s (s.x)}
    <circle
      cx="{s.x}%"
      cy="{s.y}%"
      r={s.r}
      fill="currentColor"
      style="animation: gh-twinkle {s.dur}s ease-in-out {s.delay}s infinite"
    />
  {/each}
</svg>
