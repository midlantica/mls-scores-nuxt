<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      dismissible?: boolean
      message?: string
      title?: string
      showIcon?: boolean
    }>(),
    {
      dismissible: false,
      message:
        "The MLS season is on hiatus for the 2026 FIFA World Cup — but we'll be back soon! MLS play resumes July 22, 2026.",
      title: '',
      showIcon: true,
    }
  )

  const dismissed = ref(false)
</script>

<template>
  <div v-if="!dismissed" class="hiatus-banner" role="status">
    <img
      v-if="showIcon"
      src="/FIFA-WC-2026.svg"
      alt="FIFA World Cup 2026"
      class="hiatus-icon"
    />
    <span class="hiatus-text">
      <strong v-if="title" class="hiatus-title">{{ title }}</strong>
      <span>{{ message }}</span>
    </span>
    <button
      v-if="dismissible"
      class="hiatus-close"
      aria-label="Dismiss"
      @click="dismissed = true"
    >
      <CloseIcon />
    </button>
  </div>
</template>

<style scoped>
  .hiatus-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.4rem 0.7rem;
    border-radius: 0.2rem;
    background: oklab(22% 0.01 -0.02);
    border: 1px solid oklab(100% 0 0 / 0.1);
    font-size: 0.75rem;
    color: #e4e4e4;
    line-height: 1.5;
  }

  .hiatus-icon {
    height: 2lh;
    width: auto;
    flex-shrink: 0;
  }

  .hiatus-text {
    flex: 1;
  }

  .hiatus-title {
    display: block;
    font-weight: 600;
    margin-bottom: 0.1rem;
  }

  .hiatus-close {
    flex-shrink: 0;
    background: none;
    border: none;
    color: #e4e4e4;
    font-size: 0.7rem;
    cursor: pointer;
    padding: 0.1rem 0.2rem;
    border-radius: 0.2rem;
    opacity: 0.5;
    transition: opacity 0.15s;
    margin-top: 0.05em;
  }

  .hiatus-close:hover {
    opacity: 1;
  }
</style>
