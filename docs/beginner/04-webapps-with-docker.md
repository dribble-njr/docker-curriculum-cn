---
title: 使用 Docker 的 Web 应用
---

太好了！现在，我们已经了解了 `docker run`，玩过了 Docker 容器，还掌握了一些术语。有了这些知识，我们现在就可以开始真正的工作了，即使用 Docker 部署网络应用程序！

## 静态网站

让我们先从小步骤开始。我们首先要看的是如何运行一个简单的静态网站。我们将从 Docker Hub 提取一个 Docker 镜像，运行该容器，看看运行一个网站服务器有多简单。

让我们开始吧。我们要使用的镜像是一个单页面网站，我已经为此演示创建了该网站，并将其托管在注册表上 - [prakhar1989/static-site](https://hub.docker.com/r/prakhar1989/static-site)。我们可以使用 `docker run` 一次下载并直接运行该镜像。如上所述，当容器退出时，`--rm` 标志会自动删除容器，而 `-it` 标志则指定了一个交互式终端，这使得使用 Ctrl+C （在 windows 上）杀死容器变得更容易。

```bash
$ docker run -it --rm -p 4000:80 prakhar1989/static-site
```

由于镜像不存在于本地，客户端将首先从注册表中获取镜像，然后运行镜像。如果一切顺利，你应该会在终端看到 `Nginx is running...` 的信息。好了，服务器已经运行，那么如何查看网站呢？它运行在哪个端口？更重要的是，我们如何从主机直接访问容器？点击 Ctrl+C 停止容器。

在这种情况下，客户端没有公开任何端口，所以我们需要重新运行 `docker run` 命令来发布端口。同时，我们还应该想办法让我们的终端不连接到正在运行的容器上。这样，你就可以愉快地关闭终端，并保持容器运行。这就是所谓的 **分离模式**。

```bash
$ docker run -d -P --name static-site prakhar1989/static-site
e61d12292d69556eabe2a44c16cbd54486b2527e2ce4f95438e504afb7b02810
```

在上面的命令中，`-d` 会分离我们的终端，`-P` 会将所有暴露的端口发布为随机端口，最后 `--name` 对应于我们想要赋予的名称。现在，我们可以运行 `docker port [CONTAINER]` 命令来查看端口了。

```bash
$ docker port static-site
80/tcp -> 0.0.0.0:32769
443/tcp -> 0.0.0.0:32768
```

现在，我们可以打开浏览器，访问 `http://localhost:32769`，看看我们的网站。

> [!NOTE]
> 如果你使用了云服务器，需要前往云服务器的控制台，在安全组中添加规则，放行这个端口。
> 如果使用的是 docker-toolbox，可能需要使用 `docker-machine ip default` 来获取 IP。

您还可以指定一个自定义端口，以便客户端将连接转发到容器。

```bash
$ docker run -p 8888:80 prakhar1989/static-site
Nginx is running...
```

![部署静态网站](/assets/images/static.webp)

要停止一个分离的容器，请运行 `docker stop` 并给出容器 ID。在这种情况下，我们可以使用启动容器时使用的名称 `static-site`。

```bash
$ docker stop static-site
```

我相信你也同意，这超级简单。要在真正的服务器上进行部署，你只需安装 Docker 并运行上述 Docker 命令即可。既然你已经了解了如何在 Docker 镜像中运行网络服务器，那么你一定想知道--我如何创建自己的 Docker 镜像？我们将在下一节探讨这个问题。

## Docker 镜像

我们之前已经了解过镜像，但在本节中，我们将深入探讨什么是 Docker 镜像，并构建我们自己的镜像！最后，我们还将使用该镜像在本地运行我们的应用程序，最后部署到 AWS 上与朋友们分享！兴奋吗？好极了，让我们开始吧。

> [!TIP]
> 镜像（image）和容器（container）是 Docker 中的两个核心概念。镜像是一个只读的模板，包含了运行应用程序所需的所有文件和配置。容器则是基于镜像创建的运行实例，可以看作是镜像的运行状态。

Docker 镜像是容器的基础。在上一章中，我们从注册表中提取了 Busybox 镜像，并要求 Docker 客户端基于该镜像运行一个容器。要查看本地可用镜像的列表，请使用 `docker images` 命令。

```bash
$ docker images
REPOSITORY                      TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
prakhar1989/catnip              latest              c7ffb5626a50        2 hours ago         697.9 MB
prakhar1989/static-site         latest              b270625a1631        21 hours ago        133.9 MB
python                          3-onbuild           cf4002b2c383        5 days ago          688.8 MB
martin/docker-cleanup-volumes   latest              b42990daaca2        7 weeks ago         22.14 MB
ubuntu                          latest              e9ae3c220b23        7 weeks ago         187.9 MB
busybox                         latest              c51f86c28340        9 weeks ago         1.109 MB
hello-world                     latest              0a6ba66e537a        11 weeks ago        960 B
```

上面列出了我从注册表中下载的镜像，以及我自己创建的镜像（我们很快就会知道如何创建）。`TAG` 指的是镜像的特定快照，`IMAGE ID` 是该镜像的相应唯一标识符。

为简单起见，你可以把镜像想象成类似于 git 仓库--镜像可以提交更改并拥有多个版本。如果你没有提供特定的版本号，客户端会默认使用最新版本。例如，您可以拉取特定版本的 ubuntu 镜像

```bash
$ docker pull ubuntu:18.04
```

要获取新的 Docker 镜像，可以从注册表（如 Docker Hub）获取，也可以自己创建。Docker Hub 上有数以万计的镜像可供使用。你也可以使用 `docker search` 直接从命令行搜索镜像。

```bash
$ docker search ubuntu
```

在镜像方面需要注意的一个重要区别是基础镜像和子镜像之间的区别。

- **基础镜像** 是没有父镜像的镜像，通常是带有操作系统的镜像，如 ubuntu、busybox 或 debian。
- **子镜像** 是在基础镜像的基础上添加额外功能的镜像。

然后是官方镜像和用户镜像，它们既可以是基础镜像，也可以是子镜像。

- **官方镜像** 是由 Docker 官方维护和支持的镜像。它们通常只有一个字长。在上面的镜像列表中，python、ubuntu、busybox 和 hello-world 镜像都是官方镜像。
- **用户镜像** 是由像你我这样的用户创建和共享的镜像。它们建立在基础镜像的基础上，并增加了额外的功能。通常，这些镜像的格式为用户/镜像名称。

## 第一个镜像

既然我们已经对镜像有了更好的了解，那么现在就该创建我们自己的镜像了。在本节中，我们的目标是创建一个镜像，为一个简单的 [Flask](https://flask.palletsprojects.com/en/stable/) 应用程序提供沙盒。为了这次研讨会的目的，我已经创建了一个有趣的 [Flask 应用程序](https://github.com/prakhar1989/docker-curriculum/tree/master/flask-app)，它每次加载时都会显示一个随机的猫 .gif 图标，因为你知道，谁不喜欢猫呢？如果你还没有这样做，请像这样克隆到本地仓库。

```bash
$ git clone https://github.com/dribble-njr/docker-curriculum-cn.git
$ cd docker-curriculum-cn/flask-app
```

> [!TIP]
> 应该在运行 docker 命令的机器上克隆，而不是在 docker 容器中克隆。

> [!WARNING]
> 源仓库中有一个不兼容性的错误。报错原因可见：[why-did-flask-start-failing-with-importerror-cannot-import-name-url-quote-fr](https://stackoverflow.com/questions/77213053/why-did-flask-start-failing-with-importerror-cannot-import-name-url-quote-fr)。
> 
> 已有 [PR](https://github.com/prakhar1989/docker-curriculum/pull/401)，但尚未合并，因此请使用本仓库提供的代码。
> 
> ```bash
> ImportError: cannot import name 'url_quote' from 'werkzeug.urls' (/usr/local/lib/python3.8/site-packages/werkzeug/urls.py)
> ```

下一步就是使用该网络应用程序创建镜像。如上所述，所有用户镜像都基于一个基础镜像。由于我们的应用程序是用 Python 编写的，因此我们要使用的镜像将是 [Python 3](https://hub.docker.com/_/python/)。

```bash
$ docker build -t flask-app .
```

## Dockerfile

[Dockerfile](https://docs.docker.com/reference/dockerfile/) 是一个简单的文本文件，其中包含了一组指令，用于构建一个 Docker 镜像。这些指令告诉 Docker 如何安装和配置应用程序的依赖项，以及如何启动应用程序。最棒的是，你在 Dockerfile 中编写的命令几乎与对应的 Linux 命令完全相同。这意味着你不需要学习新的语法就能创建自己的 Dockerfiles。

应用程序目录中确实包含一个 Dockerfile，但由于我们是第一次这样做，所以要从头开始创建一个。首先，在我们最喜欢的文本编辑器中新建一个空白文件，并将其保存在与 flask 应用程序 **相同** 的文件夹中，文件名为 `Dockerfile`。

我们首先要指定基础镜像。 使用 `FROM` 关键字来完成这项工作：

```dockerfile
FROM python:3.8
```

下一步通常是编写复制文件和安装依赖项的命令。首先，我们要设置一个工作目录，然后复制应用程序的所有文件。

```dockerfile
# set a directory for the app
WORKDIR /usr/src/app

# copy all the files to the container
COPY . .
```

有了这些文件，我们就可以安装依赖项了。

```dockerfile
# install dependencies
RUN pip install --no-cache-dir -r requirements.txt
```

接下来，我们需要指定需要公开的端口号。 由于我们的 flask 应用程序运行在 5000 端口上，因此我们将指定该端口号。

```dockerfile
# expose the port that the app listens on
EXPOSE 5000
```

最后，我们需要指定启动应用程序的命令。

```dockerfile
# run the app
CMD ["python", "./app.py"]
```

`CMD` 的主要作用是告诉容器在启动时应该运行哪个命令。这样，我们的 `Dockerfile` 就准备好了。它看起来是这样的：

```dockerfile
FROM python:3.8

# set a directory for the app
WORKDIR /usr/src/app

# copy all the files to the container
COPY . .

# install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# define the port number the container should expose
EXPOSE 5000

# run the command
CMD ["python", "./app.py"]
```

有了 `Dockerfile`，我们就可以构建镜像了。 `docker build` 命令负责根据 Docker 文件创建 Docker 镜像。

```bash
$ docker build -t flask-app .
```

下面的部分显示了运行相同命令的输出结果。在你自己运行该命令之前（别忘了句号），确保将我的用户名替换为你的用户名。这个用户名应该是你在 [Docker hub](https://hub.docker.com/) 注册时创建的用户名。如果你还没有注册，请继续创建一个账户。 `docker build` 命令非常简单，它需要一个带 `-t` 的可选标签名和包含 `Dockerfile` 的目录位置。

```bash
$ docker build -t yourusername/catnip .
Sending build context to Docker daemon 8.704 kB
Step 1 : FROM python:3.8
# Executing 3 build triggers...
Step 1 : COPY requirements.txt /usr/src/app/
 ---> Using cache
Step 1 : RUN pip install --no-cache-dir -r requirements.txt
 ---> Using cache
Step 1 : COPY . /usr/src/app
 ---> 1d61f639ef9e
Removing intermediate container 4de6ddf5528c
Step 2 : EXPOSE 5000
 ---> Running in 12cfcf6d67ee
 ---> f423c2f179d1
Removing intermediate container 12cfcf6d67ee
Step 3 : CMD python ./app.py
 ---> Running in f01401a5ace9
 ---> 13e87ed1fbc2
Removing intermediate container f01401a5ace9
Successfully built 13e87ed1fbc2
```

如果您没有 `python:3.8` 镜像，客户端会首先提取该镜像，然后创建您的镜像。因此，运行该命令的输出结果会与我的不同。如果一切顺利，你的镜像应该已经准备好了！运行 `docker images` 命令，看看是否显示了你的镜像。

本节的最后一步是运行镜像，看看它是否真的有效（将我的用户名替换为您的用户名）。

```bash
$ docker run -p 8888:5000 yourusername/catnip
 * Running on http://0.0.0.0:5000/ (Press CTRL+C to quit)
```

我们刚才运行的命令使用了容器内服务器的 5000 端口，并通过 8888 端口对外公开。请访问端口号为 8888 的 URL，你的应用程序就应该在那里运行。

![cat](/assets/images/catgif.webp)

恭喜你！你已经成功创建了自己的第一个 Docker 镜像。

## Docker on AWS

不能与朋友分享的应用程序有什么用呢？因此，在本节中，我们将了解如何将我们出色的应用程序部署到云中，以便与朋友分享！我们将使用 AWS [Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/)，只需点击几下即可启动并运行我们的应用程序。我们还将了解使用 Beanstalk 如何轻松实现应用程序的可扩展性和可管理性！

### Docker push

在将应用程序部署到 AWS 之前，我们需要做的第一件事就是将映像发布到 AWS 可以访问的注册表中。你可以使用多种不同的 [Docker 注册表](https://aws.amazon.com/cn/ecr/)（甚至可以托管[自己的注册表](https://docs.docker.com/registry/)）。现在，让我们使用 [Docker Hub](https://hub.docker.com/) 发布镜像。

如果这是您第一次推送镜像，客户端会要求您登录。请提供与登录 Docker Hub 相同的凭据。

```base
$ docker login
Login in with your Docker ID to push and pull images from Docker Hub. If you do not have a Docker ID, head over to https://hub.docker.com to create one.
Username: yourusername
Password:
WARNING! Your password will be stored unencrypted in /Users/yourusername/.docker/config.json
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/credential-store

Login Succeeded
```

> [!NOTE]
> 华为云的 [SWR](https://console.huaweicloud.com/swr/?region=cn-north-4#/swr/dashboard) 提供了与 Docker Hub 类似的服务。
> 
> ![华为云 SWR 登录](https://raw.githubusercontent.com/dribble-njr/typora-njr/master/img/20241122225624.png)

要发布，只需键入下面的命令，记住要将上面的镜像标签名称替换为您的名称。重要的是要使用 `yourusername/image_name` 的格式，这样客户端才能知道要在哪里发布。

```bash
$ docker push yourusername/catnip
```

> [!TIP]
> Docker Hub 是默认仓库地址。如果镜像的标签中没有明确指定仓库地址（如 `swr.cn-north-4.myhuaweicloud.com`），Docker 会自动将其认为是推送到 Docker Hub。
> 
> 标签 `njr/catnip:latest` 指向 `docker.io/njr/catnip:latest`。
>
> 标签 `swr.cn-north-4.myhuaweicloud.com/njr/catnip:latest` 指向华为云的镜像仓库。
>
> 仓库路径与命名空间要求： 不同镜像仓库的结构要求镜像的路径明确指定，例如：
>
> - Docker Hub：`docker.io/<namespace>/<image>:<tag>`
> - 华为云：`swr.cn-north-4.myhuaweicloud.com/<namespace>/<image>:<tag>`
>
> 所以，必须通过 `docker tag` 为镜像重新打标签，以满足目标仓库的要求。如果是推送到 Docker Hub，则不需要重新打标签。
>
> ```bash
> docker tag njr/catnip:latest swr.cn-north-4.myhuaweicloud.com/njr/catnip:latest
> docker push swr.cn-north-4.myhuaweicloud.com/njr/catnip:latest
> ```

完成后，你就可以在 Docker Hub 上查看你的镜像了。例如，这里就是[我的镜像的网页](https://hub.docker.com/r/prakhar1989/catnip/)。

> [!NOTE]
> 在我们继续之前，我想说明的一点是，为了部署到 AWS，并不是一定要将映像托管在公共注册表（或任何注册表）上。如果你正在为下一个价值百万美元的独角兽初创公司编写代码，你完全可以跳过这一步。我们之所以公开推送我们的镜像，是因为它跳过了一些中间配置步骤，使部署变得超级简单。

现在，你的镜像已经上线，任何安装了 docker 的人只需输入一条命令，就能使用你的应用程序。

```bash
$ docker run -p 8888:5000 yourusername/catnip
```

> [!TIP]
> 拉取镜像的过程
> 
> 1. 检查本地是否存在镜像： Docker 首先会检查是否有匹配的镜像（yourusername/catnip），包括是否匹配指定的标签（默认为 latest）。
> 2. 本地无镜像时拉取： 如果本地没有该镜像，Docker 会尝试从远程仓库拉取：
>    - 默认仓库是 Docker Hub。
>    - 如果镜像名中包含自定义仓库地址（如 `swr.cn-north-4.myhuaweicloud.com`），则会从指定的仓库拉取。
> 3. 运行容器： 镜像下载完成后，Docker 会立即启动该镜像并创建容器。

如果你过去曾为设置本地开发环境/共享应用程序配置而头疼不已，你就会非常清楚这听起来有多棒。这就是为什么 Docker 如此酷的原因！

