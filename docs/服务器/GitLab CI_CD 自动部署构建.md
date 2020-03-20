# GitLab CI/CD 自动部署构建

## 一、背景
每次改完需求之后，更新到测试服务器都需要**手动**打包，并**上传**到服务器，多次人工干预操作，目前就有这样一个现成的基于 `GitLab CI` 工具，让我们**提交**或者**合并**代码后，就自动帮我们执行一段任务(打包、压缩、上传服务器)。从而实现自动上线。这里记录一下简单的步骤，因为每个人安装会面对不同的问题，后期有值得总结的，再补充。

## 二、Git Runner 介绍
### 是什么
它是我们自动构建的主服务
> Runner 是一个执行任务的进程。可以根据需要配置任意数量的 Runner。
> Runner 可以放在**不同的用户**、**服务器**，甚至 **本地机器上。**

### 怎么配
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1584626140254-5e365765-184f-4571-8c0c-abf4738c98c9.png#align=left&display=inline&height=69&name=image.png&originHeight=236&originWidth=2540&size=44889&status=done&style=shadow&width=746)

它实际就是 `.gitlab-ci.yml` ，写一下然后交给 `Git Runner`  去执行。
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1584626168105-aa400b69-f9b8-4dc6-bfde-08e79d29efe6.png#align=left&display=inline&height=135&name=image.png&originHeight=270&originWidth=2146&size=40317&status=done&style=none&width=1073)

### 怎么安装 Runner
#### [先安装 Docker](https://www.yuque.com/mty/here/vrqiwx#BPan3)
#### 强调的是配置阿里云服务器 Docker 源

- 购买阿里云服务器会默认给你分配一个 [Docker 源](https://cr.console.aliyun.com/cn-shenzhen/instances/mirrors)，这样拽 Docker 镜像会比较快。
```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://[你的私有key].mirror.aliyuncs.com"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 三、安装配置 Git Runner
#### 1、拉取 gitlab-runner 镜像
> docker 镜像加速器配置好，这块会快一些，没配置的可能会慢一点

`Git Runner`  它是辅助 `Git`  构建的一个服务
```javascript
docker pull gitlab/gitlab-runner
```

安装好之后可以 `docker images`  测试查看
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1584627174924-869041e9-30f9-4d11-a6af-1afbc462f0ac.png#align=left&display=inline&height=97&name=image.png&originHeight=212&originWidth=1632&size=61457&status=done&style=shadow&width=746)

#### 2、创建容器并启动
```javascript
docker run -d --name gitlab-runner --restart always \
   -v ~/gitlab-runner/config:/etc/gitlab-runner \
   -v /var/run/docker.sock:/var/run/docker.sock \
   gitlab/gitlab-runner:latest
```
现在 `gitlab-runner`  就启动了，可以通过 `docker ps`  查看，
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1584627417736-f7cfa67e-5f1e-439a-871f-2496e411a697.png#align=left&display=inline&height=39&name=image.png&originHeight=122&originWidth=2352&size=36339&status=done&style=shadow&width=746)

#### 3、注册 gitlab-runner 
> 这里容器ID是上一步执行的返回的 ID，只去前几位就行。不用复制完。

```javascript
docker exec -it [容器ID] gitlab-runner register
```
上面命令执行中会让你一次让你输入 gitlab URL、token、runner-server、tag、docker、docker:stable

##### 2.1、填写 Gitlab URL
```bash
Please enter the gitlab-ci coordinator URL (e.g. https://gitlab.com/):
```
##### 2.2、填写 token
```javascript
Please enter the gitlab-ci token for this runner:
```

##### 2.3、runner 描述信息
这里起了 runner-server
```bash
Please enter the gitlab-ci description for this runner:
[ec66aa43edf6]: runner-server
```

##### 2.4、填写 tag 名字
一个 git 仓库可以对应多个 runnder, 执行 yml 文件可以指定某一个 runner , 所以需要起一个名字标识
```javascript
Please enter the gitlab-ci tags for this runner (comma separated):
```

##### 2.5、执行器选择 docker
```bash
Please enter the executor: docker-ssh, parallels, virtualbox, docker-ssh+machine, custom, docker, shell, ssh, docker+machine, kubernetes:
docker
```

##### 2.6、Docker img
这里输入 docker:stable
```javascript
Please enter the default Docker image (e.g. ruby:2.6):
docker:stable
```


#### 这几个值怎么找，登陆你的 gitlab -> 设置 -> CI/CD -> Runner 展开
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583988761280-fdcd94ba-f4d1-4200-9145-948dc4b33ade.png#align=left&display=inline&height=224&name=image.png&originHeight=766&originWidth=2554&size=163356&status=done&style=shadow&width=746)

#### 找到 gitlab URL、token
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583988840033-aedd8145-751e-4462-b2d7-e3a7a98563dd.png#align=left&display=inline&height=428&name=image.png&originHeight=1334&originWidth=2324&size=319785&status=done&style=shadow&width=746)
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583989584410-43e8baf5-c4f4-415f-b09d-9657afc51996.png#align=left&display=inline&height=233&name=image.png&originHeight=466&originWidth=1480&size=167092&status=done&style=shadow&width=740)
到这里 `runner`  配置成功
配置成功之后，将会在页面中看到 此项目已激活的运行器
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1584628201217-fbe8ac69-74bf-4c05-8db1-da7a0df193ab.png#align=left&display=inline&height=297&name=image.png&originHeight=594&originWidth=1406&size=67642&status=done&style=shadow&width=703)

## 四、yml 配置
我们需要创建一个 `.gitlab-ci.yml`  文件，一下有一个例子
#### 例子
```shell
# 使用哪个镜像构建
image: node

# 阶段
stages:
  - install
  - build
  - zip
  - deploy

# 每一步骤都需要拉取新的镜像，cache 缓存做一个保留
cache:
    paths:
        - node_modules/
        - dist/
        - front-end-caiwu.tar

# 执行所有 script 之前都会执行的 script 钩子
before_script:
  - 'which ssh-agent || ( apt-get update -y && apt-get install openssh-client -y ) '
  - eval $(ssh-agent -s)
  - ssh-add <(echo "$SSH_PRIVATE_KEY_DEV")
  # 因为在 node 镜像中执行，若是选择执行器 是 shell 此步会干掉宿主机的ssh
  - mkdir -p ~/.ssh
  - '[[ -f /.dockerenv ]] && echo -e "Host *\n\tStrictHostKeyChecking no\n\n" > ~/.ssh/config'


install:
  stage: install
  tags:
   - tagcicd
  script:
    - npm install -g cnpm --registry=https://registry.npm.taobao.org
    - cnpm install

build:
  stage: build
  script:
    - npm run build

zip:
  stage: zip
  script:
   - tar -czvf front-end-caiwu.tar ./dist

deploy:
  stage: deploy
  script:
   - scp ./front-end-caiwu.tar root@XXXXXXXX:/data

```

#### 默认 tags
上面 yml 配置没有指名 tags, 可配置一个默认的
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1584628246707-90e47224-5cf5-46a9-b11f-635fe40b5127.png#align=left&display=inline&height=201&name=image.png&originHeight=402&originWidth=662&size=24005&status=done&style=shadow&width=331)
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583990271831-fb637bef-efc2-4e56-a2c1-741dd12bf8da.png#align=left&display=inline&height=340&name=image.png&originHeight=680&originWidth=1288&size=74584&status=done&style=shadow&width=644)
#### 
#### 变量配置

- 需要注意  $SSH_PRIVATE_KEY_DEV 是变量，需要在下图中配置 值是 value 需要配置一下 

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583989717836-6f3c2fb4-4055-4895-a09d-0702bc236a0f.png#align=left&display=inline&height=242&name=image.png&originHeight=772&originWidth=2384&size=176195&status=done&style=shadow&width=746)

#### $SSH_PRIVATE_KEY_DEV value 生成
这一步很容易出现问题，网上版本也多，解决方案也不一样。一下可参考，但不保证按照步骤来就没问题。

1、首先，在任何一台服务器上称A，创建 RSA 无密码的密钥：
```javascript
ssh-keygen -t rsa -P ''
cat /root/.ssh/id_rsa
```

2、特别注意需要复制完整包含 --- 复制到上图中 value里面
```javascript
-----BEGIN RSA PRIVATE KEY----- 
xxxxxxx 
-----END RSA PRIVATE KEY-----
```

3、然后在 A 服务器，执行代码 ssh-copy-id root 你需要部署的服务器 B, 期间会让你输入一次密码，后期就不会在输入。
```bash
# RSA 密钥对应的公钥，上传到需要连接到的服务器
ssh-copy-id root@你的服务器地址
# 测试
ssh root@你的服务器地址  
```


## 五、自动运行
当你push 代码的时候，会自动生成一条流水线

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583990492665-0495ef89-aba3-4d6f-b6e6-35ddc8a11dce.png#align=left&display=inline&height=178&name=image.png&originHeight=586&originWidth=2462&size=122502&status=done&style=shadow&width=746)

感受一下
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583990714253-a2dc3853-d245-41d6-9ca7-4137bb1f27ff.png#align=left&display=inline&height=502&name=image.png&originHeight=1458&originWidth=2166&size=345869&status=done&style=shadow&width=746)

#### 第二阶段 打包 build
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583990883678-b9464414-7fe9-4f46-9b9d-1e22ce74a1d4.png#align=left&display=inline&height=333&name=image.png&originHeight=886&originWidth=1986&size=81677&status=done&style=shadow&width=746)

#### 第三阶段 压缩称 zip
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583991079364-eedb6014-815c-4840-a9cf-5cf1f1b8ac84.png#align=left&display=inline&height=337&name=image.png&originHeight=868&originWidth=1924&size=79458&status=done&style=shadow&width=746)

#### 第四阶段 deploy 成功

- 好长时间 4个job 14分钟

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583991394653-5043793a-b57c-4fa2-9ff1-758118fe8e86.png#align=left&display=inline&height=414&name=image.png&originHeight=828&originWidth=2058&size=81638&status=done&style=none&width=1029)

成功 生成 front-end-caiwu.tar  可以在yml 命令添加 解压缩放置到对应后端指定目录中。
### ![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583991482633-8639b152-922f-4249-82f4-8b2c5a13ffc3.png#align=left&display=inline&height=129&name=image.png&originHeight=258&originWidth=1126&size=49455&status=done&style=shadow&width=563)
### 
### 彩蛋
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583990819638-48a611e9-d1b1-43c4-a58c-9b81d416db90.png#align=left&display=inline&height=423&name=image.png&originHeight=1576&originWidth=2780&size=320566&status=done&style=shadow&width=746)

### 完整 yml 分享

```shell
image: node

stages:
  - install
  - build
  - zip
  - deploy

cache:
    paths:
        - node_modules/
        - static/
        - front-end-caiwu.tar

before_script:
  - 'which ssh-agent || ( apt-get update -y && apt-get install openssh-client -y ) '
  - eval $(ssh-agent -s)
  - ssh-add <(echo "$SSH_PRIVATE_KEY_DEV")
  - mkdir -p ~/.ssh
  - '[[ -f /.dockerenv ]] && echo -e "Host *\n\tStrictHostKeyChecking no\n\n" > ~/.ssh/config '

install:
  stage: install
  tags:
    - tagtym
  only:
    - master
  script:
    - npm install -g cnpm --registry=https://registry.npm.taobao.org
    - cnpm install

build:
  stage: build
  tags:
    - tagtym
  only:
    - master
  script:
    - npm run build

zip:
  stage: zip
  tags:
    - tagtym
  only:
    - master
  script:
   - tar -czvf front-end-caiwu.tar ./static

deploy:
  stage: deploy
  tags:
    - tagtym
  only:
    - master
  script:
   - scp ./front-end-caiwu.tar root@$DEPLOY_SERVER_DEV:/data/frontEnd
   - ssh root@$DEPLOY_SERVER_DEV "cd /data/www/lighttpd/caiwu/public && rm -rf ./static/* && tar zxvf /data/frontEnd/front-end-caiwu.tar -C /data/www/lighttpd/caiwu/public && \cp ./static/index.html ../resources/views/welcome.blade.php"

```

### 坑

- npm run build 在 mac 本机打包没问题，node 环境打包就有问题，原因：import 文件名字大小有误
- ssh 配置一直让输入密码，之前  $SSH_PRIVATE_KEY_DEV value 是从服务器上面 取的id_rsa,最后看底部博客随便找服务器，配置一个新的，然后就可以了。
- autodevops 可以设置关闭

### 参考
[Ubuntu & GitLab CI & Docker & ASP.NET Core 2.0 自动化发布和部署（1）](https://www.cnblogs.com/xishuai/p/ubuntu-gitlab-ci-docker-aspnet-core-part-1.html)
[GitLab之gitlab-ci.yml配置文件详解](https://www.cnblogs.com/szk5043/articles/9854712.html)
[CICD 配置项](https://www.ituring.com.cn/article/507812)
[http://[你的 git 地址].com/help/ci/examples/README.md](http://*****.com/help/ci/examples/README.md)
[travis_ci_tutorial](http://www.ruanyifeng.com/blog/2017/12/travis_ci_tutorial.html)
[yaml 语法](http://www.ruanyifeng.com/blog/2016/07/yaml.html)
