# 最基础的 Web 安全问题

<a name="8e1b944f"></a>
### 背景

> 为加深对 Web 安全问题的理解，有助于我们更好的写出安全的且不容易被别人攻击的网页，虽然目前框架会帮我们自动处理，但是我们依然需要知道最基础的 `Web`  安全问题有哪些。特别是涉及一些金钱的交易，钓鱼链接，点击劫持等，若是不懂这些，我们就无法去避免问题，何谈解决问题。每个人都很清楚这一点；WEB 历史发展也有一些年头，常见的安全问题已经有所分类。下面我们看下常见的安全分类有哪些；


<a name="XSS"></a>
### 一、XSS
<a name="7ac32497"></a>
#### 定义
> `XSS` 原名叫 `Cross Site Script` 即 跨站脚本攻击；原来缩写 `CSS` 与层叠样式 `CSS` 冲突，故在安全领域改名叫 `XSS`

<a name="7220e4d5"></a>
#### 方式
<a name="9dde8bab"></a>
##### 反射型

- 场景
> 浏览器标签中输入或者诱导用户点开 `http://localhost:8080/testUrl?content=<script>alert(document.cookie)</script>`, 通过读取 URL 参数，写入到弹出框中，浏览器输出 `alert` 用户敏感信息。
> 需要注意的是：下面代码 `chrome` 可以屏蔽 `xss`。`firefox` 没处理；
> `Cookie` 会设置 `HttpOnly`，降低信息泄露的范围
> 防御：可以通过 `encodeURIComponent()` 解析

<a name="DOM"></a>
##### DOM

- 容易引发 DOM 操作

```html
<script>document.write = '1'<script>
<img src="null" onerroe = "alert(1)">
<p onclick="alert('aaa')"></p>
<iframe src="//baidu.comt.html ">

/////////
问题：$('.content').html(`<img src="${src}">`)
若 src=`"><script>alert(1)</script>"`
变为: <img src=""><script>alert(1)</script>"">
防御：$('.content').html(`<img src="encodeURI(${src})">`)
```
<a name="86228154"></a>
##### 存储型

- 场景

> 恶意脚本存储到服务器：一个用户将 xss 攻击代码写入到留言板，内容可以为`<script>document.write=''</script>`，内容又保存到数据库，**所有用户**访问留言的时候都会执行这个脚本;

- 防御
  - 客户端输入输出过滤
  - 服务器端再一次过滤
```javascript
function encodeHTML () {
   return str.replace(/&/g, '&amp;').
      str.replace(/</g, '&lt;').
      str.replace(/>/g, '&gt;').
      str.replace(/"/g, '&quot;').
      str.replace(/'/g, '&apos;')
}
```

- 富文本
  - 黑名单过滤
  - 白名单保留部分标签属性，只允许指定标签

<a name="CSRF"></a>
### 二、CSRF

<a name="7ac32497-1"></a>
#### 定义
> `CSRF`，即 `Cross Site Request Forgery`，中译是跨站请求伪造，是一种劫持受信任用户向服务器发送非预期请求的攻击方式。

<a name="a1c2597f"></a>
#### 方式

- 通常情况下，`CSRF` 攻击是攻击者借助受害者的 `Cookie` 骗取服务器的信任，可以在受害者毫不知情的情况下以受害者名义伪造请求发送给受攻击服务器，从而在并未授权的情况下执行在权限保护之下的操作
- `CSRF` 跨站伪造提交 请求,  用户打开任意第三方网站，在另一个网站微博等网站发布一条评论网络蠕虫; 或者用户打开任意第三方网站，结果另一个网站钱丢了；

场景：公共类。<br />服务器传递一个加密后的 `token`，给前台页面；<br />前端做提交的时候，连同这个 `token` 做为隐藏的字段，`form` 表单之后，一起提交服务器。<br />服务器接收请求，先检测 `token` 是否合法，合法就进入。<br />隐藏的校验问题。

<a name="32775b30"></a>
#### 防御

- 1：在前端页面添加验证码 `ccap` 图形验证码, 其实主要是防止机器人
- 2：`token`
- 4：`same-site`
- 3：验证 `referer` 根据 `HTTP` 协议，在 `HTTP` 头中有一个字段叫 `Referer`，它记录了该 `HTTP` 请求的来源地址。通过 `Referer Check`，可以检查请求是否来自合法的"源"。
- 4：禁止来自第三方网站请求

<a name="C94co"></a>
### 三、点击劫持
特点：用户亲手操作，用户不知情<br />简单场景：`iframe` 做成透明的嵌套在源目标网站上，用户以为点击的是源目标网站，实际点击`iframe` 中透明的按钮，导致进行危险操作；

1: `JS`  并不能完全设置点击劫持

```javascript
if(top.location!=window.location）
    top.location==window.location
// iframe 可以设置 sandbox="allow-forms" 禁止js的时候就不管用了
```

2：**X-FRAME-OPTIONS** 是否禁止内嵌 `iframe` <br />`DENY`   // 拒绝任何域加载<br />`SAMEORIGIN`  / / 允许同源域下加载<br />`ALLOW-FROM`   // 可以定义允许frame加载的页面地址

<a name="nfjlh"></a>
### 四、window.opener 安全问题
window.opener 表示打开当前窗体页面的父窗体的是谁。例如，在 A 页面中，通过一个带有 target="_blank" 的 a 标签打开了一个新的页面 B，那么在 B 页面里，window.opener 的值为 A 页面的 window 对象。

一般来说，打开同源(域名相同)的页面，不会有什么问题。但对于跨域的外部链接来说，存在一个被钓鱼的风险。比如你正在浏览购物网站，从当前网页打开了某个外部链接，在打开的外部页面，可以通过 window.opener.location 改写来**源站点**的地址。利用这一点，将来源站点改写到钓鱼站点页面上，例如跳转到新打开的第三方网页，当再回到购物页面的时候，是很难发现购物网站的地址已经被修改了的，这个时候你的账号就存在被钓鱼的可能了

<a name="uVYKY"></a>
#### 如何解决呢

1. 设置 rel 属性
```javascript
<a href="https://xxxx" rel="noopener noreferrer"> 外链 <a>
```

rel=noopener 规定禁止新页面传递源页面的地址，通过设置了此属性的链接打开的页面，其 window.opener 的值为 null。<br />2. 将外链替换为内部的跳转连接服务，跳转时先跳到内部地址，再由服务器 redirect 到外链。<br />3. 可以由 widow.open 打开外链。

<a name="25f9c7fa"></a>
### 总结

通过以上我们知道， `XSS`  跨站脚本攻击。攻击场景对应关系分别是：反射型，将用户输入东西在网页中脚本执行，基于 DOM：用户输入信息影响了 `DOM` 结构；存储型影响相对大些，将一个用户攻击，存放到服务器，导致下次刷新，或者其他用户进入该页面收到影响；<br />`CSRF` 跨站请求伪造。它的攻击会更加危险，它通过抓包分析用户接口与参数，通过自己构建网站，调用被攻击网页，成功引诱用户点击自己网站从而在用户不知情的时候请求接口；<br />`XSRF` 跨站脚本攻击与请求伪造相配合，引诱一个用户点击第三方网站，在源目标网站发送该第三方网站通过伪造请求支付的接口，并存储到源目标数据库，而源目标网站并未做 `XSS` ,则导致所有用户访问相关网页都会请求伪造支付的接口。大面积的影响；<br />点击劫持通过在源网页覆盖透明的 `iframe`，造成用户错点，从而错点被攻击等等；<br />以上只是简单的几种安全类型，不是全部。还是一句虽然各大框架都为我们封装好了方法，但是我们依然要清晰基本原理，未来面对更加复杂的安全好坦然面对；
