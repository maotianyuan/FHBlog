# 基于 CentOS 7 搭建异常监控 Sentry

<a name="o4sZb"></a>
# 背景
> 随着公司项目量越来越大，项目上线后不可避免出现一些问题，为了第一时间发现问题，而不是等着客户反馈后，感叹为时晚矣。目前后端有办法捕获接口 500 错误，而前端是通过代码 try catch 或者基于框架提供 API 来手动加入异常监控代码来调用发送邮件接口进行通知到人的反馈。但缺点显而易见，例如无法通过图表形式展示异常量，无法进行异常类型分析，分配 bug，更重要是解决完 bug 反馈机制还需完善等等，


<a name="Fv9Om"></a>
# 目的
我们需要一个工具帮助我们自动收集并管理各种错误日志信息（接口、JS 事件、DOM、语法）等等，本文主要介绍 在阿里云服务器（CentOS）下通过 Docker 安装 [Sentry](https://sentry.io/)。

<a name="bethm"></a>
# 环境

- CentOS 7

需要确保本文是基于 CentOS 7，而不是 Ubunto，怎么检查服务器版本
```shell
[root@webtest ~]# lsb_release -a
LSB Version:    :core-4.1-amd64:core-4.1-noarch
Distributor ID: CentOS
Description:    CentOS Linux release 7.0.1406 (Core) 
Release:        7.0.1406
Codename:       Core
```

- 内存需要大于 2400 MB，如何查看服务器内存
```shell
[root@webtest ~]# dmidecode -t memory | grep Size: | grep -v "No Module Installed" 
Size: 4096 MB

[root@webtest ~]# free -m
             total       used       free     shared    buffers     cached
Mem:          3792       3609        182        244        117        200
-/+ buffers/cache:       3292        499
Swap:            0          0          0
```


<a name="BPan3"></a>
# 安装 Docker

1. 卸载已有的 docker
```shell
sudo yum remove docker \
                  docker-client \
                  docker-client-latest \
                  docker-common \
                  docker-latest \
                  docker-latest-logrotate \
                  docker-logrotate \
                  docker-engine
```

2. 安装 docker 依赖
```shell
sudo yum install -y yum-utils \
  device-mapper-persistent-data \
  lvm2
```

3. 安装 docker-ce
```shell
sudo yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.rep
    
sudo yum install docker-ce docker-ce-cli containerd.io
```

4. 启动 docker 后台服务
```shell
service docker start
```

5. 测试运行
```shell
 docker run hello-world
```

6. 设置开机启动
```shell
sudo systemctl enable docker
```

7. 查看 docker 是否启动
```shell
systemctl status docker
```

[可直接看官网](https://docs.docker.com/install/linux/docker-ce/centos/)

<a name="8gpxs"></a>
# 升级 Python
方法有很多，能正常升级就可以

1. 通过 yum 下载最新 python
```shell
yum install epel-release
yum install python36
```

2. 查看 python 相关的二进制文件
```shell
ls -l /usr/bin/python*
```

3. 删除默认 python
```shell
rm /usr/bin/python 
```

4. 指向最新
```shell
ln -s /usr/bin/python3.6 /usr/bin/python
```

5. 检查版本
```shell
python -V
```

<a name="mv1ff"></a>
# 安装 docker-compose

1. 安装
```shell
sudo curl -L "https://github.com/docker/compose/releases/download/1.25.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

chmod +x /usr/local/bin/docker-compose

```

2. 测试
```shell
docker-compose version
```

[可直接看官网](https://docs.docker.com/compose/install/)

<a name="r3ESr"></a>
# 安装 Sentry

1. 安装 git 已安装，略过这步
```shell
yum install git
```

2. 下载 onpremise
```shell
 git clone https://github.com/getsentry/onpremise.git
```

3. 安装

      有一些文章是说需要通过命令生成密钥，目前已有 install.sh 脚本，所以简化了配置过程，不需要手动调整密钥，这一步时间比较长，我是大概用半个小时，快结束的时候会让你输入 邮箱+密码，来作为登陆 sentry 的管理员账号。
```shell
 cd onpremise
 
 ./install.sh
```

4. 启动

通过 IP:9000 即可成功访问，用之前创建的账号即可登陆。
```shell
docker-compose up -d
```

<br />![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1581258103608-3187e2fd-0e70-4d45-a347-0bc5587c696b.png#align=left&display=inline&height=659&name=image.png&originHeight=1318&originWidth=924&size=202081&status=done&style=none&width=462)<br />


<a name="bTYvL"></a>
# 邮箱配置
正常情况下通过第一次 IP:9000 访问的时候，界面会有提示让输入邮箱配置信息，见上图，写正确的话可以，就可以登陆直接通过这个路由 [http://你的服务器IP:9000/manage/status/mail/](http://你的服务器IP:9000/manage/status/mail/) 看到邮箱的配置，点击下面的 Test 进行测试是否配置成功<br />![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1581158079799-47d895ab-e7cc-43e3-bfe0-39713a6540a9.png#align=left&display=inline&height=685&name=image.png&originHeight=1370&originWidth=1962&size=178127&status=done&style=none&width=981)

- 坑 （然是有坑的，假如你当时没有申请好邮箱，或者写错了信息，目前是无法在界面上修改的。）

目前我使用成功修改的一种方式是：<br />onpremise 下有 .env 文件中新增（对于使用QQ邮箱的用户，值得注意的是 PORT 用 **465**，邮箱是发时不成功的，会出现 TiMEOUT，目前修改成 587正常）
```shell
SENTRY_EMAIL_HOST=smtp.qq.com
SENTRY_EMAIL_USER=XXXXXX@qq.com
SENTRY_SERVER_EMAIL=XXXXX@qq.com
SENTRY_EMAIL_PASSWORD=替换成你的
SENTRY_EMAIL_USE_TLS=true
SENTRY_EMAIL_PORT=587
SENTRY_EVENT_RETENTION_DAYS=90
```

<a name="AQYzn"></a>
# 提醒
在用户设置中 User settings 进行修改

- 时区记得更改成国内，否则统计异常的时候，时间不是国内时间
- sentry 是可以切换语言

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1581158853144-a335daa4-41f5-43fd-92df-ebffbb85d72a.png#align=left&display=inline&height=779&name=image.png&originHeight=1558&originWidth=2318&size=226210&status=done&style=none&width=1159)
<a name="3PllW"></a>
# 
<a name="xdVzd"></a>
# 最后
你可以愉快的创建项目，让团队人员用邮箱注册，然后各种探索 sentry 的功能了。


![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1581158668900-0ec7deff-9076-4fae-b9d4-973b7f82b40e.png#align=left&display=inline&height=742&name=image.png&originHeight=1484&originWidth=2814&size=426351&status=done&style=none&width=1407)

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1581158776748-bb8ecdd8-342f-41f1-8efd-5653f389ac81.png#align=left&display=inline&height=797&name=image.png&originHeight=1594&originWidth=2452&size=389545&status=done&style=none&width=1226)

- 邮箱成功发送

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1581159329604-8ca7ea34-bc02-4ed8-9c97-1f4798aee043.png#align=left&display=inline&height=305&name=image.png&originHeight=610&originWidth=904&size=201193&status=done&style=none&width=452)

<a name="MEP8C"></a>
# 推荐阅读

[centos7下搭建sentry错误日志服务器](http://projectsedu.com)<br />[sentry的安装和使用以及各种问题处理](https://www.cnblogs.com/Shadow3627/p/10767023.html)
