<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  let { href, class: className = '' }: { href: string; class?: string } = $props()
</script>

<Link
  href={href}
  class={`inline-flex items-center gap-2 font-bold text-gh-ink tracking-tight hover:no-underline ${className}`}
>
  <svg
    class="text-gh-gold shrink-0"
    viewBox="0 0 32 32"
    width="28"
    height="28"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M20.5 4.5A13 13 0 1 0 27.5 20 10.5 10.5 0 0 1 20.5 4.5Z"
      fill="currentColor"
    />
    <circle cx="22.5" cy="10" r="1.6" fill="currentColor" opacity="0.7" />
  </svg>
  <span>GlobalHilal</span>
</Link>
