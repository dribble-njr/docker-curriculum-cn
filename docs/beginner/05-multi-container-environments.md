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

```python
es = Elasticsearch(host='es')
```

为了实现这一目标，我们需要告诉 Flask 容器，ES 容器运行在 `0.0.0.0` 主机上（默认端口为 `9200`），这样就可以正常运行了，对吗？不幸的是，这是不正确的，因为 IP `0.0.0.0` 是从主机（即我的 Mac）访问 ES 容器的 IP。另一个容器无法通过相同的 IP 地址访问。好吧，如果不是这个 IP，那么 ES 容器应该通过哪个 IP 地址访问？很高兴你能提出这个问题。

现在是我们开始探索 Docker 网络的好时机。Docker 安装后，会自动创建三个网络。

```bash
$ docker network ls
NETWORK ID          NAME                DRIVER              SCOPE
c2c695315b3a        bridge              bridge              local
a875bec5d6fd        host                host                local
ead0e804a67b        none                null                local
```

默认情况下，Docker 会创建一个名为 `bridge` 的网络，也就是说，当我运行 ES 容器时，它是在这个桥接网络中运行的。为了验证这一点，我们来检查一下网络。

```bash
$ docker network inspect bridge
[
    {
        "Name": "bridge",
        "Id": "c2c695315b3aaf8fc30530bb3c6b8f6692cedd5cc7579663f0550dfdd21c9a26",
        "Created": "2018-07-28T20:32:39.405687265Z",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": null,
            "Config": [
                {
                    "Subnet": "172.17.0.0/16",
                    "Gateway": "172.17.0.1"
                }
            ]
        },
        "Internal": false,
        "Attachable": false,
        "Ingress": false,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {
            "277451c15ec183dd939e80298ea4bcf55050328a39b04124b387d668e3ed3943": {
                "Name": "es",
                "EndpointID": "5c417a2fc6b13d8ec97b76bbd54aaf3ee2d48f328c3f7279ee335174fbb4d6bb",
                "MacAddress": "02:42:ac:11:00:02",
                "IPv4Address": "172.17.0.2/16",
                "IPv6Address": ""
            }
        },
        "Options": {
            "com.docker.network.bridge.default_bridge": "true",
            "com.docker.network.bridge.enable_icc": "true",
            "com.docker.network.bridge.enable_ip_masquerade": "true",
            "com.docker.network.bridge.host_binding_ipv4": "0.0.0.0",
            "com.docker.network.bridge.name": "docker0",
            "com.docker.network.driver.mtu": "1500"
        },
        "Labels": {}
    }
]
```

可以看到，我们的容器 `277451c15ec1` 列在输出中的 「容器」 部分。我们还可以看到该容器分配到的 IP 地址 - `172.17.0.2`。这就是我们要找的 IP 地址吗？让我们通过运行 flask 容器并尝试访问这个 IP 来找出答案。

```bash
$ docker run -it --rm yourusername/foodtrucks-web bash
root@35180ccc206a:/opt/flask-app# curl 172.17.0.2:9200
{
  "name" : "Jane Foster",
  "cluster_name" : "elasticsearch",
  "version" : {
    "number" : "2.1.1",
    "build_hash" : "40e2c53a6b6c2972b3d13846e450e66f4375bd71",
    "build_timestamp" : "2015-12-15T13:05:55Z",
    "build_snapshot" : false,
    "lucene_version" : "5.3.1"
  },
  "tagline" : "You Know, for Search"
}
root@35180ccc206a:/opt/flask-app# exit
```

现在这对你来说应该相当简单了。我们使用 bash 进程以交互模式启动容器。在运行一次性命令时，`--rm` 是一个很方便的标记，因为容器在完成工作后会被清理。我们尝试使用 `curl`，但需要先安装它。安装完成后，我们就能与 `172.17.0.2:9200` 上的 ES 通信了。太棒了！

虽然我们已经找到了让容器之间相互对话的方法，但这种方法仍然存在两个问题：

1. 由于 IP 可以更改，我们如何告诉 Flask 容器 `es` 主机名代表 `172.17.0.2` 或其他 IP？
2. 由于默认情况下每个容器都共享桥接网络，因此这种方法并不安全。如何隔离网络？

好消息是，Docker 可以很好地解决我们的问题。它允许我们定义自己的网络，同时使用 `docker network` 命令将它们隔离开来。让我们先来创建自己的网络。

```bash
$ docker network create foodtrucks-net
0815b2a3bb7a6608e850d05553cc0bda98187c4528d94621438f31d97a6fea3c

$ docker network ls
NETWORK ID          NAME                DRIVER              SCOPE
c2c695315b3a        bridge              bridge              local
0815b2a3bb7a        foodtrucks-net      bridge              local
a875bec5d6fd        host                host                local
ead0e804a67b        none                null                local
```

创建网络（`network create`）命令会创建一个新的桥接网络，这正是我们目前所需要的。就 Docker 而言，桥接网络使用软件桥接器，允许连接到同一桥接网络的容器进行通信，同时与未连接到该桥接网络的容器隔离。Docker 桥接驱动程序会自动在主机中安装规则，使不同桥接网络上的容器无法直接相互通信。您还可以创建其他类型的网络，建议您阅读 [官方文档中的相关介绍](https://docs.docker.com/engine/network/)。

现在我们有了一个网络，可以使用 `--net` 标志在这个网络中启动我们的容器。让我们开始吧——但首先，为了启动一个同名的新容器，我们要停止并移除在桥接（默认）网络中运行的 ES 容器。

```bash
$ docker container stop es
es

$ docker container rm es
es

$ docker run -d --name es --net foodtrucks-net -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:6.3.2
13d6415f73c8d88bddb1f236f584b63dbaf2c3051f09863a3f1ba219edba3673

$ docker network inspect foodtrucks-net
[
    {
        "Name": "foodtrucks-net",
        "Id": "0815b2a3bb7a6608e850d05553cc0bda98187c4528d94621438f31d97a6fea3c",
        "Created": "2018-07-30T00:01:29.1500984Z",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": {},
            "Config": [
                {
                    "Subnet": "172.18.0.0/16",
                    "Gateway": "172.18.0.1"
                }
            ]
        },
        "Internal": false,
        "Attachable": false,
        "Ingress": false,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {
            "13d6415f73c8d88bddb1f236f584b63dbaf2c3051f09863a3f1ba219edba3673": {
                "Name": "es",
                "EndpointID": "29ba2d33f9713e57eb6b38db41d656e4ee2c53e4a2f7cf636bdca0ec59cd3aa7",
                "MacAddress": "02:42:ac:12:00:02",
                "IPv4Address": "172.18.0.2/16",
                "IPv6Address": ""
            }
        },
        "Options": {},
        "Labels": {}
    }
]
```

如你所见，我们的 `es` 容器现在正在 `foodtrucks-net` 桥接网络内运行。现在，让我们看看在我们的 `foodtrucks-net` 网络中启动 `foodtrucks-web` 时会发生什么。

```bash
$ docker run -it --rm --net foodtrucks-net yourusername/foodtrucks-web bash
root@9d2722cf282c:/opt/flask-app# curl es:9200
{
  "name" : "wWALl9M",
  "cluster_name" : "docker-cluster",
  "cluster_uuid" : "BA36XuOiRPaghPNBLBHleQ",
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
root@53af252b771a:/opt/flask-app# ls
app.py  node_modules  package.json  requirements.txt  static  templates  webpack.config.js
root@53af252b771a:/opt/flask-app# python3 app.py
Index not found...
Loading data in elasticsearch ...
Total trucks loaded:  733
 * Running on http://0.0.0.0:5000/ (Press CTRL+C to quit)
root@53af252b771a:/opt/flask-app# exit
```

哇哦，成功了！在用户定义的网络（如 `foodtrucks-net`）上，容器不仅可以通过 IP 地址通信，还可以将容器名称解析为 IP 地址。这种功能称为自动服务发现。好极了！现在让我们真正启动 Flask 容器吧。

```bash
$ docker run -d --net foodtrucks-net -p 5000:5000 --name foodtrucks-web yourusername/foodtrucks-web
852fc74de2954bb72471b858dce64d764181dca0cf7693fed201d76da33df794

$ docker container ls
CONTAINER ID        IMAGE                                                 COMMAND                  CREATED              STATUS              PORTS                                            NAMES
852fc74de295        yourusername/foodtrucks-web                           "python3 ./app.py"       About a minute ago   Up About a minute   0.0.0.0:5000->5000/tcp                           foodtrucks-web
13d6415f73c8        docker.elastic.co/elasticsearch/elasticsearch:6.3.2   "/usr/local/bin/dock…"   17 minutes ago       Up 17 minutes       0.0.0.0:9200->9200/tcp, 0.0.0.0:9300->9300/tcp   es

$ curl -I 0.0.0.0:5000
HTTP/1.0 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 3697
Server: Werkzeug/0.11.2 Python/2.7.6
Date: Sun, 10 Jan 2016 23:58:53 GMT
```

请访问 http://0.0.0.0:5000，看看你的光荣应用程序是否已经上线！虽然看起来很费事，但实际上我们只需输入 4 条命令就能完成从零到运行的过程。我把这些命令整理成了一个 bash 脚本。

```bash
#!/bin/bash

# build the flask container
docker build -t yourusername/foodtrucks-web .

# create the network
docker network create foodtrucks-net

# start the ES container
docker run -d --name es --net foodtrucks-net -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:6.3.2

# start the flask app container
docker run -d --net foodtrucks-net -p 5000:5000 --name foodtrucks-web yourusername/foodtrucks-web
```

现在想象一下，你把应用程序分发给朋友，或者在安装了 docker 的服务器上进行运行。只需一条命令，你就能让整个应用程序运行起来！

```bash
$ git clone https://github.com/prakhar1989/FoodTrucks
$ cd FoodTrucks
$ ./setup-docker.sh
```

就是这样！要我说，我觉得这是一种非常棒的共享和运行应用程序的强大方式！

## Docker Compose

到目前为止，我们一直在探索 Docker 客户端。不过，在 Docker 生态系统中，还有许多其他开源工具与 Docker 配合得天衣无缝。其中几个是：

- [Docker Machine](https://github.com/docker/machine) - 在计算机、云提供商和自己的数据中心内创建 Docker 主机
- [Docker Compose](https://docs.docker.com/compose/) - 用于定义和运行多容器 Docker 应用程序的工具
- [Docker Swarm](https://docs.docker.com/engine/swarm/) - Docker 的本地集群解决方案
- [Kubernetes](https://kubernetes.io/) - 一个开源系统，用于自动部署、扩展和管理容器化应用程序

> [!WARNING]
> Docker Machine 已不再维护，[建议使用 Docker Desktop](https://github.com/docker/machine/issues/4894)。

在本节中，我们将介绍其中一种工具 Docker Compose，看看它如何让处理多容器应用程序变得更容易。

Docker Compose 的背景故事相当有趣。大约在 2014 年 1 月，一家名为 OrchardUp 的公司推出了一款名为 Fig 的工具。Fig 背后的理念是让孤立的开发环境与 Docker 协同工作。该项目在 [Hacker News](https://news.ycombinator.com/item?id=7132044) 上广受好评——我还奇怪地记得我读过关于它的报道，但并没有完全掌握其中的诀窍。

论坛上的第一条评论很好地解释了 Fig 的含义：

> So really at this point, that's what Docker is about: running processes. Now Docker offers a quite rich API to run the processes: shared volumes (directories) between containers (i.e. running images), forward port from the host to the container, display logs, and so on. But that's it: Docker as of now, remains at the process level.

> While it provides options to orchestrate multiple containers to create a single "app", it doesn't address the management of such group of containers as a single entity. And that's where tools such as Fig come in: talking about a group of containers as a single entity. Think "run an app" (i.e. "run an orchestrated cluster of containers") instead of "run a container".

事实证明，很多使用 docker 的人都同意这种看法。随着 Fig 逐渐流行起来，Docker 公司也注意到了这一点，于是收购了这家公司，并将 Fig 重新命名为 Docker Compose。

那么，Compose 是用来做什么的呢？Compose 是一种工具，用于以简单的方式定义和运行多容器 Docker 应用程序。它提供了一个名为 `docker-compose.yml` 的配置文件，只需一条命令就能调用应用程序及其依赖的服务套件。Compose 适用于所有环境：生产环境、暂存环境、开发环境、测试环境以及 CI 工作流，但 Compose 更适合开发和测试环境。

让我们看看能否为我们的 SF-Foodtrucks 应用程序创建一个 `docker-compose.yml` 文件，并评估 Docker Compose 是否实现了它的承诺。

不过，第一步是安装 Docker Compose。如果你运行的是 Windows 或 Mac，Docker 工具箱中已经安装了 Docker Compose。Linux 用户可以按照文档中的 [说明](https://docs.docker.com/compose/install/) 轻松安装 Docker Compose。由于 Compose 是用 Python 编写的，你也可以直接使用 `pip install docker-compose`。安装完成检测：

```bash
$ docker-compose --version
docker-compose version 1.21.2, build a133471
```

既然已经安装好了，我们就可以开始下一步了，即生成 Docker Compose 文件 `docker-compose.yml`。YAML 的语法非常简单，而且我们要使用的 `docker-compose.yml` 文件已经包含在软件仓库中了。

```yaml
version: "3"
services:
  es:
    image: docker.elastic.co/elasticsearch/elasticsearch:6.3.2
    container_name: es
    environment:
      - discovery.type=single-node
    ports:
      - 9200:9200
    volumes:
      - esdata1:/usr/share/elasticsearch/data
  web:
    image: yourusername/foodtrucks-web
    command: python3 app.py
    depends_on:
      - es
    ports:
      - 5000:5000
    volumes:
      - ./flask-app:/opt/flask-app
volumes:
  esdata1:
    driver: local
```

让我来解释一下上述文件的含义。在父级，我们定义了服务的名称——`es` 和 `web`。`image` 参数始终是必需的，对于我们希望 Docker 运行的每个服务，我们都可以添加其他参数。对于 `es`，我们只需引用 Elastic registry 上的 `elasticsearch` 镜像。对于 Flask 应用程序，我们参考本节开头构建的镜像。

`command` 和 `ports` 等其他参数可提供有关容器的更多信息。`volumes` 指定了代码所在的 `web` 容器的挂载点。这完全是可选项，如果需要访问日志等，它将非常有用。我们稍后会看到它在开发过程中的作用。有关该文件支持的参数，请参阅 [参考资料](https://docs.docker.com/reference/compose-file/)。我们还为 `es` 容器添加了 `volumes` 参数，这样我们加载的数据就能在重启时持续存在。我们还指定了 `depends_on`，告诉 docker 在 `web` 之前启动 `es` 容器。你可以在 [docker compose 文档](https://docs.docker.com/reference/compose-file/#depends_on) 中了解更多相关信息。

> [!NOTE]
> 你必须在包含 `docker-compose.yml` 文件的目录中才能执行大多数 Compose 命令。

好极了！现在文件已经准备就绪，让我们来看看 docker-compose 的实际操作。但在开始之前，我们需要确保端口和名称是空闲的。因此，如果您正在运行 Flask 和 ES 容器，请将它们关闭。

```bash
$ docker stop es foodtrucks-web
es
foodtrucks-web

$ docker rm es foodtrucks-web
es
foodtrucks-web
```

现在我们可以运行 `docker-compose`。导航到 food trucks 目录，然后运行 `docker-compose up`。

```bash
$ docker-compose up
Creating network "foodtrucks_default" with the default driver
Creating foodtrucks_es_1
Creating foodtrucks_web_1
Attaching to foodtrucks_es_1, foodtrucks_web_1
es_1  | [2016-01-11 03:43:50,300][INFO ][node                     ] [Comet] version[2.1.1], pid[1], build[40e2c53/2015-12-15T13:05:55Z]
es_1  | [2016-01-11 03:43:50,307][INFO ][node                     ] [Comet] initializing ...
es_1  | [2016-01-11 03:43:50,366][INFO ][plugins                  ] [Comet] loaded [], sites []
es_1  | [2016-01-11 03:43:50,421][INFO ][env                      ] [Comet] using [1] data paths, mounts [[/usr/share/elasticsearch/data (/dev/sda1)]], net usable_space [16gb], net total_space [18.1gb], spins? [possibly], types [ext4]
es_1  | [2016-01-11 03:43:52,626][INFO ][node                     ] [Comet] initialized
es_1  | [2016-01-11 03:43:52,632][INFO ][node                     ] [Comet] starting ...
es_1  | [2016-01-11 03:43:52,703][WARN ][common.network           ] [Comet] publish address: {0.0.0.0} is a wildcard address, falling back to first non-loopback: {172.17.0.2}
es_1  | [2016-01-11 03:43:52,704][INFO ][transport                ] [Comet] publish_address {172.17.0.2:9300}, bound_addresses {[::]:9300}
es_1  | [2016-01-11 03:43:52,721][INFO ][discovery                ] [Comet] elasticsearch/cEk4s7pdQ-evRc9MqS2wqw
es_1  | [2016-01-11 03:43:55,785][INFO ][cluster.service          ] [Comet] new_master {Comet}{cEk4s7pdQ-evRc9MqS2wqw}{172.17.0.2}{172.17.0.2:9300}, reason: zen-disco-join(elected_as_master, [0] joins received)
es_1  | [2016-01-11 03:43:55,818][WARN ][common.network           ] [Comet] publish address: {0.0.0.0} is a wildcard address, falling back to first non-loopback: {172.17.0.2}
es_1  | [2016-01-11 03:43:55,819][INFO ][http                     ] [Comet] publish_address {172.17.0.2:9200}, bound_addresses {[::]:9200}
es_1  | [2016-01-11 03:43:55,819][INFO ][node                     ] [Comet] started
es_1  | [2016-01-11 03:43:55,826][INFO ][gateway                  ] [Comet] recovered [0] indices into cluster_state
es_1  | [2016-01-11 03:44:01,825][INFO ][cluster.metadata         ] [Comet] [sfdata] creating index, cause [auto(index api)], templates [], shards [5]/[1], mappings [truck]
es_1  | [2016-01-11 03:44:02,373][INFO ][cluster.metadata         ] [Comet] [sfdata] update_mapping [truck]
es_1  | [2016-01-11 03:44:02,510][INFO ][cluster.metadata         ] [Comet] [sfdata] update_mapping [truck]
es_1  | [2016-01-11 03:44:02,593][INFO ][cluster.metadata         ] [Comet] [sfdata] update_mapping [truck]
es_1  | [2016-01-11 03:44:02,708][INFO ][cluster.metadata         ] [Comet] [sfdata] update_mapping [truck]
es_1  | [2016-01-11 03:44:03,047][INFO ][cluster.metadata         ] [Comet] [sfdata] update_mapping [truck]
web_1 |  * Running on http://0.0.0.0:5000/ (Press CTRL+C to quit)
```

前往 IP 查看您的实时应用程序。很神奇吧？只需几行配置，我们就能让两个 Docker 容器成功同步运行了。让我们停止服务，以分离模式重新运行。

```bash
web_1 |  * Running on http://0.0.0.0:5000/ (Press CTRL+C to quit)
Killing foodtrucks_web_1 ... done
Killing foodtrucks_es_1 ... done

$ docker-compose up -d
Creating es               ... done
Creating foodtrucks_web_1 ... done

$ docker-compose ps
      Name                    Command               State                Ports
--------------------------------------------------------------------------------------------
es                 /usr/local/bin/docker-entr ...   Up      0.0.0.0:9200->9200/tcp, 9300/tcp
foodtrucks_web_1   python3 app.py                   Up      0.0.0.0:5000->5000/tcp
```

不出所料，我们可以看到两个容器都运行成功。名称从何而来？这些都是由 Compose 自动创建的。但是，Compose 也会自动创建网络吗？问得好！让我们一探究竟。

首先，让我们停止服务运行。只需一条命令，我们就能让它们恢复运行。数据卷将会持续存在，因此可以使用 `docker-compose up` 以相同的数据再次启动集群。要销毁集群和数据卷，只需键入 `docker-compose down -v`。

```bash
$ docker-compose down -v
Stopping foodtrucks_web_1 ... done
Stopping es               ... done
Removing foodtrucks_web_1 ... done
Removing es               ... done
Removing network foodtrucks_default
Removing volume foodtrucks_esdata1
```

同时，我们还将删除上次创建的 foodtrucks 网络。

```bash
$ docker network rm foodtrucks-net
$ docker network ls
NETWORK ID          NAME                 DRIVER              SCOPE
c2c695315b3a        bridge               bridge              local
a875bec5d6fd        host                 host                local
ead0e804a67b        none                 null                local
```

好极了！现在我们有了一块干净的石板，让我们重新运行我们的服务，看看 Compose 是否发挥了它的魔力。

```bash
$ docker-compose up -d
Recreating foodtrucks_es_1
Recreating foodtrucks_web_1

$ docker container ls
CONTAINER ID        IMAGE                        COMMAND                  CREATED             STATUS              PORTS                    NAMES
f50bb33a3242        yourusername/foodtrucks-web  "python3 app.py"         14 seconds ago      Up 13 seconds       0.0.0.0:5000->5000/tcp   foodtrucks_web_1
e299ceeb4caa        elasticsearch                "/docker-entrypoint.s"   14 seconds ago      Up 14 seconds       9200/tcp, 9300/tcp       foodtrucks_es_1
```

到目前为止，一切顺利。是时候看看是否创建了任何网络了。

```bash
$ docker network ls
NETWORK ID          NAME                 DRIVER
c2c695315b3a        bridge               bridge              local
f3b80f381ed3        foodtrucks_default   bridge              local
a875bec5d6fd        host                 host                local
ead0e804a67b        none                 null                local
```

你可以看到，Compose 继续创建了一个名为 `foodtrucks_default` 的新网络，并将两个新服务都附加到了该网络中，这样每个服务都可以被其他服务发现。服务的每个容器都加入了默认网络，该网络上的其他容器都可以访问它们，它们也可以通过与容器名称相同的主机名发现它们。

```bash
$ docker ps
CONTAINER ID        IMAGE                                                 COMMAND                  CREATED              STATUS              PORTS                              NAMES
8c6bb7e818ec        docker.elastic.co/elasticsearch/elasticsearch:6.3.2   "/usr/local/bin/dock…"   About a minute ago   Up About a minute   0.0.0.0:9200->9200/tcp, 9300/tcp   es
7640cec7feb7        yourusername/foodtrucks-web                           "python3 app.py"         About a minute ago   Up About a minute   0.0.0.0:5000->5000/tcp             foodtrucks_web_1

$ docker network inspect foodtrucks_default
[
    {
        "Name": "foodtrucks_default",
        "Id": "f3b80f381ed3e03b3d5e605e42c4a576e32d38ba24399e963d7dad848b3b4fe7",
        "Created": "2018-07-30T03:36:06.0384826Z",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": null,
            "Config": [
                {
                    "Subnet": "172.19.0.0/16",
                    "Gateway": "172.19.0.1"
                }
            ]
        },
        "Internal": false,
        "Attachable": true,
        "Ingress": false,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {
            "7640cec7feb7f5615eaac376271a93fb8bab2ce54c7257256bf16716e05c65a5": {
                "Name": "foodtrucks_web_1",
                "EndpointID": "b1aa3e735402abafea3edfbba605eb4617f81d94f1b5f8fcc566a874660a0266",
                "MacAddress": "02:42:ac:13:00:02",
                "IPv4Address": "172.19.0.2/16",
                "IPv6Address": ""
            },
            "8c6bb7e818ec1f88c37f375c18f00beb030b31f4b10aee5a0952aad753314b57": {
                "Name": "es",
                "EndpointID": "649b3567d38e5e6f03fa6c004a4302508c14a5f2ac086ee6dcf13ddef936de7b",
                "MacAddress": "02:42:ac:13:00:03",
                "IPv4Address": "172.19.0.3/16",
                "IPv6Address": ""
            }
        },
        "Options": {},
        "Labels": {
            "com.docker.compose.network": "default",
            "com.docker.compose.project": "foodtrucks",
            "com.docker.compose.version": "1.21.2"
        }
    }
]
```
