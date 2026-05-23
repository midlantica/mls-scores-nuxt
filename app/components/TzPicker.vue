<script setup lang="ts">
  import { useTimezone, TZ_OPTIONS } from '~/composables/useTimezone'

  const { selectedTz, setTz } = useTimezone()

  const open = ref(false)
  const wrapRef = ref<HTMLElement | null>(null)

  function choose(code: (typeof TZ_OPTIONS)[number]['code']) {
    setTz(code)
    open.value = false
  }

  onMounted(() => {
    document.addEventListener('click', (e) => {
      if (
        open.value &&
        wrapRef.value &&
        !wrapRef.value.contains(e.target as Node)
      ) {
        open.value = false
      }
    })
  })
</script>

<template>
  <div ref="wrapRef" class="tz-picker-wrap">
    <button
      class="tz-picker-btn"
      aria-label="Select time zone"
      @click.stop="open = !open"
    >
      <span class="tz-picker-label">Time Zone</span>
      <span class="tz-picker-code">{{ selectedTz }}</span>
    </button>
    <button
      class="tz-picker-caret-btn"
      aria-label="Change time zone"
      @click.stop="open = !open"
    >
      <span class="tz-picker-caret">▾</span>
    </button>
    <div v-if="open" class="tz-dropdown">
      <button
        v-for="tz in TZ_OPTIONS"
        :key="tz.code"
        class="tz-option"
        :class="{ selected: selectedTz === tz.code }"
        @click="choose(tz.code)"
      >
        {{ tz.code }}
      </button>
    </div>
  </div>
</template>

<style scoped>
  .tz-picker-wrap {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 1px;
    flex-shrink: 0;
  }

  .tz-picker-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.3rem;
    padding: 0.2rem 0.5rem;
    border-radius: 0.3rem 0 0 0.3rem;
    border: none;
    background: var(--color-theme-900);
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
    min-width: 5.2rem;
  }

  .tz-picker-btn:hover {
    background: color-mix(in oklab, var(--color-theme-900) 80%, white);
  }

  .tz-picker-label {
    font-family: var(--font-condensed);
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-theme-200);
    white-space: nowrap;
  }

  .tz-picker-code {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--color-theme-300);
  }

  .tz-picker-caret-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.2rem 0.3rem;
    border-radius: 0 0.3rem 0.3rem 0;
    border: none;
    background: var(--color-theme-900);
    cursor: pointer;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  .tz-picker-caret-btn:hover {
    background: color-mix(in oklab, var(--color-theme-900) 80%, white);
  }

  .tz-picker-caret {
    font-size: 1.1rem;
    color: var(--color-theme-400);
    line-height: 1;
    margin-top: -0.1rem;
  }

  .tz-dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 0;
    z-index: 200;
    background: oklch(18% 0.025 260);
    border: 1px solid var(--color-theme-800);
    border-radius: 0.4rem;
    box-shadow: 0 6px 18px oklab(0% 0 0 / 0.5);
    overflow: hidden;
    min-width: 2.8rem;
  }

  .tz-option {
    display: block;
    width: 100%;
    text-align: center;
    padding: 0.25rem 0rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: oklab(80% 0 0);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      background 0.1s,
      color 0.1s;
    white-space: nowrap;
  }

  .tz-option + .tz-option {
    border-top: 1px solid oklab(100% 0 0 / 0.06);
  }

  .tz-option:hover {
    background: var(--color-theme-900);
    color: var(--color-theme-300);
  }

  .tz-option.selected {
    color: var(--color-theme-400);
    background: var(--color-theme-950);
  }
</style>
