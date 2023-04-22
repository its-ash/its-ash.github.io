import colors from "vuetify/es5/util/colors";
import { getHighlighter } from "shiki";


export default {
  ssr: false,
  target: "static",
  head: {
    titleTemplate: "%s - itsAsh",
    title: "itsAsh",
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { hid: "description", name: "description", content: "" },
      { name: "format-detection", content: "telephone=no" }
    ],
    link: [
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Crete+Round:ital@0;1&family=Fira+Code:wght@300;400;500&family=Noto+Sans:ital,wght@0,100;0,300;0,400;0,600;1,300;1,400;1,600&display=swap"
      }

    ]
  },

  css: ["assets/style.scss"],

  plugins: [],

  components: true,

  buildModules: [
    "@nuxtjs/vuetify"
  ],

  modules: [
    "@nuxtjs/axios",
    "@nuxtjs/pwa",
    "@nuxt/content",
    "@vueuse/nuxt"
  ],


  axios: {
    baseURL: "/"
  },

  pwa: {
    manifest: {
      lang: "en"
    }
  },

  content: {
    highlight: {
      theme: "dark-plus"
    },
    markdown: {
      async highlighter() {
        const highlighter = await getHighlighter({
          theme: "dracula"
        });
        return (rawCode, lang) => {
          return highlighter.codeToHtml(rawCode, lang);
        };
      }
    }
  },

  router: {
    base: "/"
  },

  vuetify: {
    customVariables: ["~/assets/variables.scss"],
    theme: {
      dark: false,
      themes: {
        dark: {
          primary: colors.blue.darken2,
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3
        }
      }
    }
  },

  build: {},
  robots: {
    UserAgent: "*",
    Disallow: "/"
  },
  generate: {
    async routes() {
      const { $content } = require("@nuxt/content");
      const files = await $content({ deep: true })
        .where({ extension: { $eq: ".md" } })
        .only(["path"]).fetch();
      return files.map(file => file.path === "/index" ? "/" : file.path);
    }
  }
};
