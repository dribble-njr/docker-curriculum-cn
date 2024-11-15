import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "docker-curriculum-cn",
  base: '/docker-curriculum-cn',
  description: "docker 基础教程",
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
          { text: "安装", link: "02-installation" },
          { text: "Docker 基础", link: "03-docker-basics" },
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
