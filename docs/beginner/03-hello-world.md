---
title: Hello World
---

## 运行一个容器

现在我们已经安装了 Docker，让我们运行一个容器。在本节中，我们将运行一个 [Busybox](https://hub.docker.com/_/busybox) 容器并且尝试一下 `docker run` 命令。

首先，让我们从 Docker Hub 拉取一个 Busybox 镜像：

```bash
$ docker pull busybox
```

> [!NOTE]
> 根据你安装 Docker 的方式，你可能会看到一个 `permission denied` 错误。如果你使用的是 Mac，请确保 Docker 引擎正在运行。如果你使用的是 Linux，请在 `docker` 命令前加上 `sudo`。或者，你可以[创建一个 Docker 组](https://docs.docker.com/engine/installation/linux/linux-postinstall/)来解决这个问题。

`pull` 命令从 [Docker Hub](https://hub.docker.com/explore/) 拉取 [Busybox 镜像](https://hub.docker.com/_/busybox) 并将其保存到本地系统。你可以使用 `docker images` 命令来查看系统中所有镜像。

```bash
$ docker images
REPOSITORY    TAG       IMAGE ID       CREATED         SIZE
busybox       latest    27a71e19c956   7 weeks ago     4.27MB
hello-world   latest    d2c94e258dcb   18 months ago   13.3kB
```

## docker run

非常棒，现在让我们基于 Busybox 镜像运行一个容器。为此我们需要使用 `docker run` 命令。

```bash
$ docker run busybox
```

等等，什么都没有发生！这是 bug 吗？不，当然不是。在后台，发生了许多事情。当你调用 `run` 时，Docker 客户端会找到镜像（在这个例子中是 Busybox），加载容器，然后在容器中运行一个命令。当我们运行 `docker run busybox` 时，我们没有提供命令，所以容器启动，运行一个空命令然后退出。好吧，有点失望。让我们尝试一些更有趣的东西。

```bash
$ docker run busybox echo "hello from busybox"
hello from busybox
```

非常棒——我们看到了输出。在这个例子中，Docker 客户端运行 `echo` 命令在 Busybox 容器中，然后退出容器。如果你注意到，所有这些都发生得非常快。想象一下启动一个虚拟机，运行一个命令然后杀死它。现在你知道为什么他们说容器很快了！好吧，现在让我们看看 `docker ps` 命令。`docker ps` 命令显示当前正在运行的所有容器。

```bash
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
```

由于没有容器正在运行，我们看到了一个空白行。让我们尝试一个更有用的变体：`docker ps -a`

```bash
$ docker ps -a
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS                      PORTS               NAMES
305297d7a235        busybox             "uptime"            11 minutes ago      Exited (0) 11 minutes ago                       distracted_goldstine
ff0a5c3750b9        busybox             "sh"                12 minutes ago      Exited (0) 12 minutes ago                       elated_ramanujan
14e5bd11d164        hello-world         "/hello"            2 minutes ago       Exited (0) 2 minutes ago
```

上方列表中，我们可以看到所有已经运行的容器。注意到 `STATUS` 列显示这些容器已经在几分钟前退出。

你可能会想知道是否可以在容器中运行多个命令。让我们现在试试：

```bash
$ docker run -it busybox sh
/ # ls
bin    dev    etc    home   lib    lib64  proc   root   sys    tmp    usr    var
/ # uptime
 11:10:23 up 10 days, 20:14,  0 users,  load average: 0.00, 0.00, 0.00
```

通过 `-it` 标志，我们附加到一个交互式 tty 在容器中。现在我们可以运行尽可能多的命令。花点时间运行你最喜欢的命令。

> **危险区域**：如果你感到特别勇敢，可以尝试 `rm -rf bin` 在容器中。确保你在这个容器中运行这个命令，**不要** 在你的笔记本电脑/桌面上运行。这样做会导致任何其他命令，如 `ls`、`uptime` 无法工作。一旦所有东西都停止工作，你可以退出容器（输入 `exit` 然后按 Enter），然后重新启动它，使用 `docker run -it busybox sh` 命令。由于 Docker 每次创建一个新容器，所有东西应该再次开始工作。

这结束了对 `docker run` 命令的狂风暴雨般的介绍，这可能是最常使用的命令。花点时间熟悉它是有意义的。要找到更多关于 `run` 的信息，可以使用 `docker run --help` 命令查看他支持的 flags 列表。随着我们继续前进，我们会看到 `docker run` 的一些变体。

在我们继续之前，让我们快速讨论一下如何删除容器。我们上面看到，即使我们退出容器，我们仍然可以通过 `docker ps -a` 看到它的残留。在本节教程中，我们运行了多个容器，这会消耗一些磁盘空间。因此，作为一条规则，一旦我们完成容器需要处理的任务，我们应该清理它们。为此，你可以运行 `docker rm` 命令，只需复制上面的容器 ID 并将其与命令一起粘贴。

```bash
$ docker rm 305297d7a235 ff0a5c3750b9
305297d7a235
ff0a5c3750b9
```

在删除时，你应该会看到容器 ID 被回显。如果你有多个容器，复制-粘贴 ID 会很麻烦。在这种情况下，你可以运行：

```bash
$ docker rm $(docker ps -a -q -f status=exited)
```

这个命令删除所有状态为 `exited` 的容器。`-q` 标志仅返回数字 ID，`-f` 标志根据条件过滤输出。最后，`--rm` 标志可以传递给 `docker run`，它会在容器退出后自动删除容器。对于一次性 docker 运行，`--rm` 标志非常有用。

在 Docker 的后续版本中，`docker container prune` 命令可以实现相同的效果。

```bash
$ docker container prune
WARNING! This will remove all stopped containers.
Are you sure you want to continue? [y/N] y
Deleted Containers:
4a7f7eebae0f63178aff7eb0aa39f0627a203ab2df258c1a00b456cf20063
f98f9c2aa1eaf727e4ec9c0283bcaa4762fbdba7f26191f26c97f64090360

Total reclaimed space: 212 B
```

最后，你还可以通过运行 `docker rmi` 删除你不再需要的镜像。

## 术语

在本节中，我们使用了大量 Docker 相关的术语，这可能会让一些人感到困惑。因此，在我们继续之前，让我们澄清一些在 Docker 生态系统中频繁使用的术语。

- _Images_ - 镜像是我们应用程序的蓝图，是创建容器的基石。在本节中，我们使用 `docker pull` 命令从 Docker Hub 拉取 **Busybox** 镜像。
- _Containers_ - 创建自 Docker 镜像并运行实际应用程序的容器。我们使用 `docker run` 命令基于 Busybox 镜像创建一个容器。可以通过 `docker ps` 命令查看正在运行的所有容器。
- _Docker Daemon_ - 在主机上运行的后台服务，负责构建、运行和分发 Docker 容器。守护进程是运行在操作系统中的进程，客户端通过它进行通信。
- _Docker Client_ - 允许用户与守护进程交互的命令行工具。更一般地，可以有其他形式的客户端，例如 [Kitematic](https://kitematic.com/)，它为用户提供了一个 GUI。
- _Docker Hub_ - Docker 镜像的 [注册表](https://hub.docker.com/explore/)。你可以将 Docker 镜像视为目录中的所有可用 Docker 镜像。如果需要，可以自行托管 Docker 注册表。
