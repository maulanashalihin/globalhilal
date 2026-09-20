<script lang="ts">
  import Brand from './Brand.svelte'

  let { children }: { children: import('svelte').Snippet } = $props()
</script>

<main
  class="min-h-screen flex items-center justify-center p-6 bg-gh-sky"
>
  <div
    class="w-full max-w-[400px] bg-gh-panel border border-gh-line rounded-lg shadow-card p-8"
  >
    <div class="flex justify-center mb-6">
      <Brand href="/" />
    </div>
    {@render children()}
  </div>
</main>
