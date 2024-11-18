---
title: 开始
---

这个文档包含一系列章节，每个章节解释了 Docker 的某个特定方面。在每个章节中，我们将输入命令（或编写代码）。教程中使用的所有代码都可以在 [Github 仓库](https://github.com/dribble-njr/docker-curriculum-cn) 中找到。

> [!WARNING]
> 注意：本翻译版本使用的是 Docker 版本 **27.3.1**。如果发现教程的任何部分与未来版本不兼容，请提出 [issue](https://github.com/dribble-njr/docker-curriculum-cn/issues)。谢谢！

## 前提条件

除了对命令行和使用文本编辑器的基本了解，该教程不需要任何特定的技能。该教程将使用 `git clone` 来克隆本地仓库。如果你没有在系统上安装 Git，请安装它或者从 Github 手动下载 zip 文件。

拥有高级的 Web 开发技能将有助于你更好地理解教程中的内容，但不是必须的。随着教程的深入，我们将使用一些云服务，如果你有兴趣，可以注册一个账号。

- [Amazon Web Services](http://aws.amazon.com/)
- [Docker Hub](https://hub.docker.com/)
- [华为云](https://www.huaweicloud.com/)
- [腾讯云](https://cloud.tencent.com/)
- [阿里云](https://www.aliyun.com/)

## 设置您的计算机

在您的计算机上安装 Docker 可能是一项艰巨的任务，但幸运的是，随着 Docker 的稳定，在您喜欢的操作系统上安装 Docker 变得非常简单。

直到几年前，在 OSX 和 Windows 上运行 Docker 还是一件麻烦事。然而，最近 Docker 在 OSX 和 Windows 上的安装体验上投入了大量精力，因此现在安装 Docker 变得非常简单。Docker 的 [入门指南](https://docs.docker.com/get-started/) 有详细的安装说明。

安装完成后，运行以下命令来测试您的 Docker 安装：

```bash
$ docker run hello-world

Hello from Docker.
This message shows that your installation appears to be working correctly.
...
```

> [!TIP]
> 译者注：这条命令会下载一个测试镜像，并在一个容器中运行。当容器运行时，它会打印一条确认信息并退出。

> [!TIP]
> 国内用户可能需要配置 Docker 的镜像源，请参考 [Docker 镜像源配置](https://gist.github.com/y0ngb1n/7e8f16af3242c7815e7ca2f0833d3ea6)。
