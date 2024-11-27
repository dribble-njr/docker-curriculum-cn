---
title: 多容器环境
---

在上一节中，我们看到了使用 Docker 运行应用程序是多么简单有趣。我们从一个简单的静态网站开始，然后尝试了一个 Flask 应用程序。只需几条命令，我们就能在本地和云中运行这两个应用程序。这两个应用程序有一个共同点，那就是它们都在一个容器中运行。

有过在生产中运行服务经验的人都知道，如今的应用程序通常都没那么简单。几乎总会涉及到数据库（或任何其他类型的持久存储）。[Redis](https://redis.io/) 和 [Memcached](https://memcached.org/) 等系统已成为大多数网络应用程序架构的必备。因此，在本节中，我们将花一些时间学习如何将依赖不同服务运行的应用程序 Docker 化。

特别是，我们将了解如何运行和管理多容器 docker 环境。你可能会问，为什么是多容器？嗯，Docker 的关键点之一就是它提供隔离的方式。将一个进程与其依赖关系捆绑在一个沙箱（称为容器）中，正是这一理念使其如此强大。

就像将应用程序层解耦是一个好策略一样，将每个服务的容器分开也是明智之举。每个层都可能有不同的资源需求，而且这些需求可能以不同的速度增长。通过将层级分离到不同的容器中，我们可以根据不同的资源需求，使用最合适的实例类型来组成每个层级。这也很好地配合了整个 [微服务](http://martinfowler.com/articles/microservices.html) 运作，这也是 Docker（或其他容器技术）处于现代微服务架构 [前沿](https://medium.com/aws-activate-startup-blog/using-containers-to-build-a-microservices-architecture-6e1b8bacb7d1#.xl3wryr5z) 的主要原因之一。

## Food Trucks

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

`flask-app` 文件夹包含 Python 应用程序，而 `utils` 文件夹则包含一些将数据加载到 Elasticsearch 的实用程序。该目录还包含一些 YAML 文件和一个 Dockerfile，我们将在本教程中详细介绍这些文件。如果你很好奇，可以看看这些文件。

现在你已经兴奋起来了（希望如此），让我们来想想如何将应用程序 Docker 化。我们可以看到，该应用程序包括一个 Flask 后端服务器和一个 Elasticsearch 服务。拆分该应用程序的一种自然方法是使用两个容器——一个运行 Flask 进程，另一个运行 Elasticsearch (ES) 进程。这样，如果我们的应用程序变得受欢迎，我们就可以根据瓶颈所在添加更多容器来扩展它。

很好，我们需要两个容器。这应该不难吧？在上一节中，我们已经构建了自己的 Flask 容器。至于 Elasticsearch，让我们看看能否在 docker hub 上找到什么。

```bash
$ docker search elasticsearch
NAME                              DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
elasticsearch                     Elasticsearch is a powerful open source se...   697       [OK]
itzg/elasticsearch                Provides an easily configurable Elasticsea...   17                   [OK]
tutum/elasticsearch               Elasticsearch image - listens in port 9200.     15                   [OK]
barnybug/elasticsearch            Latest Elasticsearch 1.7.2 and previous re...   15                   [OK]
digitalwonderland/elasticsearch   Latest Elasticsearch with Marvel & Kibana       12                   [OK]
monsantoco/elasticsearch          ElasticSearch Docker image                      9                    [OK]
```

> [!NOTE]
> Elasticsearch 背后的公司 Elastic 维护着自己的 [Elastic 产品注册表](https://www.docker.elastic.co/)。如果计划使用 Elasticsearch，建议使用该注册表中的映像。

然后通过指定端口和设置环境变量，将 Elasticsearch 集群配置为 `single node` 运行，从而在开发模式下运行它。

```bash
$ docker run -d --name es -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:6.3.2
277451c15ec183dd939e80298ea4bcf55050328a39b04124b387d668e3ed3943
```

> [!NOTE]
> 如果容器遇到内存问题，可能需要 [调整一些 JVM 标志](https://github.com/elastic/elasticsearch-docker/issues/43#issuecomment-289377878) 来限制其内存消耗。
> 
> ```bash
> docker run -d --name es -p 9200:9200 -p 9300:9300 -e ES_JAVA_OPTS="-Xms512m -Xmx512m" -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:6.3.2
> ```

如上所述，我们使用 `--name es` 给容器命名，这样就能在后续命令中方便使用。容器启动后，我们可以通过运行带有容器名称（或 ID）的 `docker container ls` 来查看日志。如果 Elasticsearch 启动成功，你应该能看到类似下面的日志。

> [!NOTE]
> Elasticsearch 需要几秒钟才能启动，因此可能需要等待一段时间才能在日志中看到已初始化。

```bash
$ docker container ls
CONTAINER ID        IMAGE                                                 COMMAND                  CREATED             STATUS              PORTS                                            NAMES
277451c15ec1        docker.elastic.co/elasticsearch/elasticsearch:6.3.2   "/usr/local/bin/dock…"   2 minutes ago       Up 2 minutes        0.0.0.0:9200->9200/tcp, 0.0.0.0:9300->9300/tcp   es

$ docker container logs es
[2024-11-26T14:23:18,463][INFO ][o.e.n.Node               ] [] initializing ...
[2024-11-26T14:23:18,543][INFO ][o.e.e.NodeEnvironment    ] [sIY1hyi] using [1] data paths, mounts [[/ (overlay)]], net usable_space [30.1gb], net total_space [39.2gb], types [overlay]
[2024-11-26T14:23:18,544][INFO ][o.e.e.NodeEnvironment    ] [sIY1hyi] heap size [495.3mb], compressed ordinary object pointers [true]
[2024-11-26T14:23:18,547][INFO ][o.e.n.Node               ] [sIY1hyi] node name derived from node ID [sIY1hyiZTNSAvcPFLviv8g]; set [node.name] to override
[2024-11-26T14:23:18,548][INFO ][o.e.n.Node               ] [sIY1hyi] version[6.3.2], pid[1], build[default/tar/053779d/2018-07-20T05:20:23.451332Z], OS[Linux/5.15.0-113-generic/amd64], JVM["Oracle Corporation"/OpenJDK 64-Bit Server VM/10.0.2/10.0.2+13]
```

现在，让我们试试能否向 Elasticsearch 容器发送请求。我们使用 `9200` 端口向容器发送 `cURL` 请求。

```bash
$ curl 0.0.0.0:9200
{
  "name" : "ijJDAOm",
  "cluster_name" : "docker-cluster",
  "cluster_uuid" : "a_nSV3XmTCqpzYYzb-LhNw",
  "version" : {
    "number" : "6.3.2",
    "build_flavor" : "default",
    "build_type" : "tar",
    "build_hash" : "053779d",
    "build_date" : "2018-07-20T05:20:23.451332Z",
    "build_snapshot" : false,
    "lucene_version" : "7.3.1",
    "minimum_wire_compatibility_version" : "5.6.0",
    "minimum_index_compatibility_version" : "5.0.0"
  },
  "tagline" : "You Know, for Search"
}
```

好极了，看起来不错！趁现在，我们也让 Flask 容器运行起来吧。但在此之前，我们需要一个 `Dockerfile`。在上一节中，我们使用了 `python:3.8` 镜像作为基础镜像。不过，这一次，除了通过 `pip` 安装 Python 依赖项外，我们还希望应用程序能生成经过精简的 Javascript 文件，以供生产使用。为此，我们需要 Nodejs。由于我们需要一个自定义的构建步骤，我们将从 `ubuntu` 基本镜像开始，从头开始构建我们的 `Dockerfile`。

> [!NOTE]
> 如果你发现现有的镜像无法满足你的需求，可以从另一个基础镜像开始，然后自行调整。对于 Docker Hub 上的大多数镜像，你都可以在 Github 上找到相应的 `Dockerfile`。阅读现有的 `Dockerfile` 是学习如何创建自己的 `Dockerfile` 的最佳途径之一。

我们我们的 flask 应用程序的 [`Dockerfile`](https://github.com/prakhar1989/FoodTrucks/blob/master/Dockerfile) 如下所示：

```dockerfile
# start from base
FROM ubuntu:18.04

MAINTAINER Prakhar Srivastav <prakhar@prakhar.me>

# install system-wide deps for python and node
RUN apt-get -yqq update
RUN apt-get -yqq install python3-pip python3-dev curl gnupg
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash
RUN apt-get install -yq nodejs

# copy our application code
ADD flask-app /opt/flask-app
WORKDIR /opt/flask-app

# fetch app specific deps
RUN npm install
RUN npm run build
RUN pip3 install -r requirements.txt

# expose port
EXPOSE 5000

# start app
CMD [ "python3", "./app.py" ]
```

这里有很多新东西，让我们快速浏览一下这个文件。我们首先使用 [Ubuntu LTS](https://wiki.ubuntu.com/LTS) 基本镜像，然后使用软件包管理器 `apt-get` 安装所依赖的 Python 和 Node。`-yqq` 标志用于抑制输出，并假定所有提示均为 "是"。

然后，我们使用 `ADD` 命令将应用程序复制到容器中的新卷 `/opt/flask-app` 中。这就是我们的代码所在的位置。我们还将其设置为工作目录，以便在此目录下运行以下命令。既然系统范围内的依赖项已经安装完毕，我们就可以开始安装特定应用程序的依赖项了。首先，我们从 `npm` 安装 Node 软件包，并运行 `package.json` 文件中定义的构建命令。最后，我们安装 Python 软件包、公开端口并定义 `CMD` 以运行，就像上一节所做的那样。

最后，我们就可以继续构建镜像并运行容器了（请用下面的用户名替换您的用户名）。

```bash
$ docker build -t yourusername/foodtrucks-web .
```

第一次运行时，Docker 客户端会下载 `ubuntu` 映像、运行所有命令并准备好映像，这需要一些时间。在对应用程序代码进行任何后续修改后，重新运行 `docker build` 几乎是瞬间完成的。现在，让我们试着运行应用程序。

```bash
$ docker run -P --rm yourusername/foodtrucks-web
Unable to connect to ES. Retying in 5 secs...
Unable to connect to ES. Retying in 5 secs...
Unable to connect to ES. Retying in 5 secs...
Out of retries. Bailing out...
```

哎呀！我们的 flask 应用程序无法运行，因为它无法连接到 Elasticsearch。我们该如何让一个容器了解另一个容器，并让它们相互对话呢？答案就在下一节。

## Docker 网络

在讨论 Docker 专门为处理此类情况而提供的功能之前，让我们先来看看能否找到一种方法来解决这个问题。希望这能让你对我们将要学习的特定功能有所了解。

好了，让我们运行 `docker container ls`（与 `docker ps` 相同），看看有什么。

```bash
$ docker container ls
CONTAINER ID        IMAGE                                                 COMMAND                  CREATED             STATUS              PORTS                                            NAMES
277451c15ec1        docker.elastic.co/elasticsearch/elasticsearch:6.3.2   "/usr/local/bin/dock…"   17 minutes ago      Up 17 minutes       0.0.0.0:9200->9200/tcp, 0.0.0.0:9300->9300/tcp   es
```

因此，我们有一个 ES 容器运行在 0.0.0.0:9200 端口上，我们可以直接访问它。如果我们能让 Flask 应用程序连接到这个 URL，它就能与 ES 进行连接和对话了，对吗？让我们深入 [Python 代码](https://github.com/prakhar1989/FoodTrucks/blob/master/flask-app/app.py#L7)，看看如何定义连接细节。
