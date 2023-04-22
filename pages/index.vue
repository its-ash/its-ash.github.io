<template>
  <v-row justify="start" align="center">
    <div class="col-12 row py-5 px-11">
      <div class="col-12">
        <v-text-field placeholder="Search..." clearable outlined dense hide-details v-model="search"></v-text-field>
      </div>
    </div>
    <div v-if="loading" class="d-flex justify-center col-12">
      <Loader></Loader>
    </div>

    <template v-else>

      <article v-for="post of posts" :key="post.slug" class="col-xl-4 col-md-6 col-12 ma-0">
        <v-card elevation="1" :class="[getClass(post.lang)]">
          <div class="px-4 py-2">
            <img v-if="post.lang" class="language" :src="getIcon(post.lang)" :alt="post.lang">
            <h2 class="font-weight-bold">
              <nuxt-link
                class="black--text text-decoration-none"
                :to="{name: 'slug',params: {slug:post.slug}}">
                {{ post.title }}
              </nuxt-link>
            </h2>
            <span>
            {{ post.description }}
          </span>
          </div>
        </v-card>

      </article>
      <h2 v-if="posts.length === 0">No Blog Found ...</h2>
    </template>

  </v-row>
</template>

<script>
export default {
  name: "IndexPage",
  data: () => ({
    search: "",
    postsDataList: [],
    loading: true
  }),
  computed: {
    posts() {
      if (this.search) {
        const search = this.search.toLowerCase();
        const filterFunction = (post) => {
          return post?.description?.toLowerCase()?.includes(search) ||
            post?.tag?.join()?.toLowerCase()?.includes(search) ||
            post?.lang?.toLowerCase()?.includes(search);
        };


        return this.postsDataList
          .filter(post => filterFunction(post));

      }
      return this.postsDataList;
    }
  },
  methods: {
    getClass(lang) {
      const language = (lang ?? "").toString().toLowerCase();
      let className = "text";
      switch (language) {
        case "js":
          className = "javascript";
          break;
        case "python":
          className = "python";
          break;
      }
      return className;
    },
    getIcon(lang) {
      const language = (lang ?? "").toString().toLowerCase();
      let icon = "";
      switch (language) {
        case "js":
          icon = "/icons/javascript.svg";
          break;
        case "python":
          icon = "/icons/python.svg";
          break;
      }
      return icon;

    }
  },
  async fetch() {
    this.postsDataList = await this.$content().fetch();
    this.loading = false;
  },
  mounted() {
    // const search = this.$route.query?.search ?? "";
    // if (search) {
    //   this.search = search;
    // }

  },
  watch: {
    // search(value) {
    //   if (this.$route.query?.search !== value && value) {
    //     this.$router.replace({ name: "index", query: { search: value } });
    //   } else {
    //     this.$router.replace({ name: "index" });
    //   }
    // }
  }
};
</script>

<style lang="scss">
.language {
  position: absolute;
  right: 0;
  top: 0;
  padding: 4px 5px 0 5px;
  height: 30px;
}

.javascript {
  background-color: #f6df1d85 !important;
}

.python {
  background-color: rgb(55 116 167 / 29%) !important;
}

.text {
  background-color: rgb(55 91 167 / 29%) !important;
}

.v-card.v-sheet {
  box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px !important;
}
</style>
