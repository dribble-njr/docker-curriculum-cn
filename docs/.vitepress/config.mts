import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "docker-curriculum-cn",
  base: "/docker-curriculum-cn",
  description: "docker 基础教程",

  head: [["link", { rel: "icon", href: "/docker-curriculum-cn/favicon.ico" }]],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "主页", link: "/" },
      { text: "基础教程", link: "/beginner/01-introduction" },
    ],

    outline: {
      level: [2, 4], // 显示 h2 到 h4 的标题
    },

    sidebar: [
      {
        text: "基础教程",
        base: "/beginner/",
        items: [
          { text: "介绍", link: "01-introduction" },
          { text: "开始", link: "02-getting-started" },
          { text: "Hello World", link: "03-hello-world" },
          { text: "使用 Docker 的 Web 应用", link: "04-webapps-with-docker" },
          { text: "多容器环境", link: "05-multi-container-environments" },
          { text: "总结", link: "06-conclusion" },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/dribble-njr/docker-curriculum-cn",
      },
    ],
  },
});
