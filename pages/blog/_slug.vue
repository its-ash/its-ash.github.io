<template>
  <div class="max-w-3xl mx-auto min-h-screen my-12">
    <div v-if="post">
      <h1 class="font-weight-bold">{{ post.title }}</h1>
      <nuxt-content :document="post" />
      <div class="mt-8">
        <nuxt-link to="/" class="text-decoration-none">← Back to blog</nuxt-link>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: "_slug",
  data: () => ({
    post: {}
  }),
  methods: {},
  async fetch() {
    this.post = (
      await this.$content()
        .where({ slug: this.$route.params.slug })
        .limit(1)
        .fetch()
    )?.[0];
  }
};
</script>

<style lang="scss">
pre {
  padding: 10px;
  border-radius: 3px;
}
</style>
