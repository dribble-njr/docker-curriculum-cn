---
title: 多容器环境
---

在上一节中，我们看到了使用 Docker 运行应用程序是多么简单有趣。我们从一个简单的静态网站开始，然后尝试了一个 Flask 应用程序。只需几条命令，我们就能在本地和云中运行这两个应用程序。这两个应用程序有一个共同点，那就是它们都在一个容器中运行。

有过在生产中运行服务经验的人都知道，如今的应用程序通常都没那么简单。几乎总会涉及到数据库（或任何其他类型的持久存储）。[Redis](https://redis.io/) 和 [Memcached](https://memcached.org/) 等系统已成为大多数网络应用程序架构的必备。因此，在本节中，我们将花一些时间学习如何将依赖不同服务运行的应用程序 Docker 化。

特别是，我们将了解如何运行和管理多容器 docker 环境。你可能会问，为什么是多容器？嗯，Docker 的关键点之一就是它提供隔离的方式。将一个进程与其依赖关系捆绑在一个沙箱（称为容器）中，正是这一理念使其如此强大。

就像将应用程序层解耦是一个好策略一样，将每个服务的容器分开也是明智之举。每个层都可能有不同的资源需求，而且这些需求可能以不同的速度增长。通过将层级分离到不同的容器中，我们可以根据不同的资源需求，使用最合适的实例类型来组成每个层级。这也很好地配合了整个 [微服务](http://martinfowler.com/articles/microservices.html) 运作，这也是 Docker（或其他容器技术）处于现代微服务架构 [前沿](https://medium.com/aws-activate-startup-blog/using-containers-to-build-a-microservices-architecture-6e1b8bacb7d1#.xl3wryr5z) 的主要原因之一。

## SF Food Trucks

我们要 Dockerize 的应用程序名为 SF Food Trucks。我创建这个应用程序的目的是希望它有用（因为它类似于现实世界中的应用程序），至少依赖于一个服务，但对于本教程的目的来说又不会太复杂。

![SF Food trucks](/assets/images/foodtrucks.webp)

首先，我们克隆应用程序的源代码。

```bash
$ git clone https://github.com/prakhar1989/FoodTrucks
$ cd FoodTrucks
$ tree -L 2
.
├── aws-ecs
│   └── docker-compose.yml
├── docker-compose.yml
├── Dockerfile
├── flask-app
│   ├── app.py
│   ├── package.json
│   ├── package-lock.json
│   ├── requirements.txt
│   ├── static
│   ├── templates
│   └── webpack.config.js
├── README.md
├── setup-aws-ecs.sh
├── setup-docker.sh
├── shot.png
└── utils
    ├── generate_geojson.py
    └── trucks.geojson
```

