<script lang="ts">
  import { dict } from '../i18n'
  import type { Locale } from '../../shared/types'

  let { status, locale = 'en' }: { status: string; locale?: Locale } = $props()

  const style = $derived(
    status === 'confirmed'
      ? 'bg-gh-panel text-gh-ink border-gh-line border-s-4 border-s-green-600'
      : status === 'corrected'
        ? 'bg-gh-gold-soft text-gh-gold border-gh-gold'
        : 'bg-gh-gold-soft text-gh-gold border-gh-gold',
  )
  const label = $derived(dict(locale).status[status] ?? status)
</script>

<span class={`inline-block px-2.5 py-1 rounded-md text-[0.72rem] font-bold uppercase tracking-widest border ${style}`}>
  {label}
</span>
