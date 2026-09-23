<script lang="ts">
  type Lang = "en" | "ar";

  let {
    value = $bindable<Lang>("en"),
    missingAr = false,
    label = "Language",
  }: {
    value?: Lang;
    missingAr?: boolean;
    label?: string;
  } = $props();

  const btnBase =
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-gh-gold";

  function select(lang: Lang) {
    value = lang;
  }
</script>

<div
  role="group"
  aria-label={label}
  class="inline-flex items-center gap-0.5 rounded-lg border border-gh-line bg-gh-sky p-0.5"
>
  <button
    type="button"
    aria-pressed={value === "en"}
    onclick={() => select("en")}
    class={value === "en" ? `${btnBase} bg-gh-ink text-gh-sky` : `${btnBase} text-gh-soft hover:text-gh-ink`}
  >
    English
  </button>
  <button
    type="button"
    aria-pressed={value === "ar"}
    onclick={() => select("ar")}
    title={missingAr ? "Arabic translation missing" : undefined}
    class={value === "ar" ? `${btnBase} bg-gh-ink text-gh-sky` : `${btnBase} text-gh-soft hover:text-gh-ink`}
  >
    العربية
    {#if missingAr}
      <span aria-hidden="true" class="h-1.5 w-1.5 rounded-full bg-gh-gold"></span>
      <span class="sr-only">(Arabic missing)</span>
    {/if}
  </button>
</div>
