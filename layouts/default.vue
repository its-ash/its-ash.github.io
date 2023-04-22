<template>
  <v-app>
    <v-main class="body-container">
      <v-container>
        <Nuxt />
      </v-container>
    </v-main>
    <v-footer class="footer">
      <nuxt-link v-if="back" to="/" class="text-decoration-none">← Back to blog</nuxt-link>
      <h3 class="ms-auto font-weight-bold">&copy; {{ new Date().getFullYear() }} Ashvini Jangid</h3>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  name: "DefaultLayout",
  data() {
    return {
      back: false
    };
  },
  mounted() {
    this.back = this.$route.path.includes("blog");
  },
  watch: {
    $route(value) {
      this.back = value.path.includes("blog");
    }
  }
};
</script>

<style lang="scss">
.body-container {
  overflow: auto;
  margin-bottom: 40px;
}

.footer {
  background-color: #3bceac !important;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px !important;
}
</style>
