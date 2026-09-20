<script lang="ts">
  let { status }: { status: string } = $props()

  const style = $derived(
    status === 'confirmed'
      ? 'bg-gh-panel text-gh-ink border-gh-line border-l-4 border-l-green-600'
      : status === 'corrected'
        ? 'bg-gh-gold-soft text-gh-gold border-gh-gold'
        : 'bg-gh-gold-soft text-gh-gold border-gh-gold',
  )
</script>

<span class={`inline-block px-2.5 py-1 rounded-md text-[0.72rem] font-bold uppercase tracking-widest border ${style}`}>
  {status}
</span>
