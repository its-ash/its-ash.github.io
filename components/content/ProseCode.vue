<template>
  <div class="container">
    <span v-if="filename" class="filename-text">
      {{ filename }}
    </span>
    <span
      v-if="languageText"
      class="language-text"
    >
      {{ languageText }}
    </span>
    <slot />
    <div class="bottom-container">
      <div class="copy-container">
        <span class="copied-text" v-if="copied">Copied code!</span>
        <button @click="copy(code)">Copy Code</button>
      </div>
    </div>
  </div>
</template>

<script>
import { useClipboard } from "@vueuse/core";


export default {
  name: "PorseCode",
  data: () => ({
    ...useClipboard()
  }),
  props: {
    code: { type: String },
    language: { type: String },
    filename: { type: String },
    highlights: { type: Array }
  },
  computed: {
    languageText() {
      return this.language;
    }
  }
};
</script>

<style scoped>

</style>
