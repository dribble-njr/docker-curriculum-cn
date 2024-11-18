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

    sidebar: [
      {
        text: "基础教程",
        base: "/beginner/",
        items: [
          { text: "介绍", link: "01-introduction" },
          { text: "开始", link: "02-getting-started" },
          { text: "Hello World", link: "03-hello-world" },
          { text: "Docker 命令", link: "04-docker-commands" },
          { text: "Docker 镜像", link: "05-docker-images" },
          { text: "Docker 容器", link: "06-docker-containers" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
