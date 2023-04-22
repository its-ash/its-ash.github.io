<template>
  <h1>Searching .........</h1>
</template>

<script>
export default {
  name: "_.vue",
  mounted() {
    const query = this.$route.path.slice(1);
    this.$router.replace({ name: "index", query: { search: query } });
  }
};
</script>

<style>

</style>
