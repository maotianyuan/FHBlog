# 二、Vue 源码之依赖收集和批量更新

### 背景
通过第一篇，我们实现了数据的双向绑定，现在我们需要页面使用像这样 `{{title}}`  的变量时候，进行依赖收集。收集到我们需要页面级监听的数据，当 `title`  走 `set`  即改变的时候，我们需要执行依赖 `title`  的收集监听者们进行派发更新。

### 一、对象依赖收集
#### 步骤

- 前提：因为在第一篇，我们已将 `Vue`  实例上面 `data`  数据做成了响应式，即添加了 `get set`  方法
- 故当渲染页面 `{{title}}`  的时候，会默认执行该变量 `title`  的 `get`  方法，我们在此处进行依赖收集，在 `Dep`  实例，里面存放当前运行的 `Dep.target`  即 渲染 `watcher` ;
- 当用户去修改 `title`  时，会执行 `title`  的 `set`  方法，我们再次通知页面可以重新渲染了。

#### 方法

- 我们创建一个 `Dep`  类用来订阅与发布，即 `get`  的时候订阅， `set`  的时候发布；
- 那我们订阅的是什么事情，在 `Vue`  中有可能是渲染页面，又可能是 `watch`  监听变量，有可能是 `computed`  计算变量。

#### 模块关系图
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583154880990-473d3fc7-acf3-4874-aefb-cc0c678b7775.png#align=left&display=inline&height=730&name=image.png&originHeight=1460&originWidth=2556&size=275307&status=done&style=none&width=1278)
#### 
#### 代码
##### Dep 类
```javascript
var id = 0;
class Dep {
  constructor () {
    this._id = id++
    this.subs = []; // 存放 watcher 数组
  }
  addSub (watcher) { // 订阅
    this.subs.push(watcher)
  }
  depend () {
    Dep.target && Dep.target.addDep(this) // Dep.targe 是 当前执行的 watcher 
  }
  notify () { // 发布执行
    this.subs.map(watcher => watcher.update())
  }
}

Dep.target = null;

let stack = [];
export function pushTarget(watcher){
    Dep.target = watcher;
    stack.push(watcher);
}
export function popTarget(){
    stack.pop();
    Dep.target = stack[stack.length-1];
}

export default Dep
```
##### 
##### Watcher

- 注意： `watcher`  执行前需要去重，在 `watcher`  中向 `Dep`  添加当前 `watcher` , 并记录对于当前变量的 dep 是否操作过；因为页面会存在多次 `{{title}}`  `{{title}}` 取值操作，故并不会多次收集同一个 `Dep` 

```javascript
var id = 0;
import {pushTarget,popTarget} from './dep'

class Watcher {
  constructor (vm, exprOrFn, cb = () =>{}, opts = {}) {
    this.vm = vm;
    this._id = id++
    if (typeof exprOrFn === 'function') {
      this.getter = exprOrFn
    } else {
      this.getter = () => exprOrFn
    }
    this.cb = cb;
    this.opts = opts
    this.depsId = new Set()
    this.deps = []
    this.get()
  }
  get() {
    pushTarget(this);
    this.getter()
    popTarget();
  }
  run () {
    this.get();
  }
  update(){
    queueWatcher(this);
  }
  addDep(dep) {
    let id = dep._id
    console.log(id)
    if(!this.depsId.has(id)) {
      this.depsId.add(id)
      this.deps.push(dep)
      dep.addSub(this);
    }
  }
}
let has = new Set();
let queue = [];

function flushQueue(){
  queue.forEach(watcher=>watcher.run())
  has = {}
  queue = []
}
function queueWatcher(watcher){
  let id = watcher.id
  if(has[id] == null){
      has[id] = true;
      queue.push(watcher)
      nextTick(flushQueue)
  }
}

let callbacks = [];

function nextTick(cb){ // cb = flushQueue

    callbacks.push(cb);
    
    let timerFunc = ()=>{
      callbacks.forEach(cb=>cb());
    }
    if(Promise){
        return Promise.resolve().then(timerFunc)
    }
    if(MutationObserver){ // MutationObserver 异步方法
        let observe = new MutationObserver(timerFunc); // H5 API
        let textNode = document.createTextNode(1);
        observe.observe(textNode,{characterData:true});
        textNode.textContent = 2;
        return
    }
    if(setImmediate){
        return setImmediate(timerFunc)
    }
    setTimeout(timerFunc, 0);
}

// 等待页面更新再去获取dom元素

export default Watcher
```

#### get set 依赖收集地方
```javascript
// .... 省
function defineProperty (obj, key, value) {
  observe(value);
  let dep = new Dep()
  Object.defineProperty(obj, key, {
    get: function() {
      dep.depend() // 收集 订阅
      return value;
    },
    set: function(newVal){
      if (newVal === value) return;
      value = newVal;
      dep.notify() // 发布
      console.log(1)
      observe(newVal)
      return value;
    }
  })
}

// .... 省
```

#### 我们需要知道的 
每个变量都会有一个 `Dep`  实例，每个实例都会对应 `ID`  和它的 `subs`  存放 `watcher`  的队列。即每个 `Dep`  都会存放一组 `watcher` 。不管哪一个页面中使用的变量发生变化，都会执行变量中存放的 `watcher` 中的方法。我们没有使用 `test`  变量，故 `test`  变量跟随的 `dep`  中 `subs`  为空，即不会执行 `watcher` , 也不会渲染页面；

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583155681790-cc46c249-13a8-4ce1-b4a7-40e3408a869e.png#align=left&display=inline&height=251&name=image.png&originHeight=502&originWidth=774&size=75555&status=done&style=none&width=387)

#### 异步批量更新 nextTick
EventLoop 是JS 运行机制，它优先将同步任务执行完，才会执行微任务，接着渲染页面，在宏任务。这样为就可以防止重复渲染，提高性能；

```javascript

function nextTick(cb){ // cb就是flushQueue
    
    callbacks.push(cb);
 
    let timerFunc = ()=>{
      callbacks.forEach(cb=>cb());
    }
    if(Promise){
        return Promise.resolve().then(timerFunc)
    }
    if(MutationObserver){ // MutationObserver 也是一个异步方法
        let observe = new MutationObserver(timerFunc); // H5的api
        let textNode = document.createTextNode(1);
        observe.observe(textNode,{characterData:true});
        textNode.textContent = 2;
        return
    }
    if(setImmediate){
        return setImmediate(timerFunc)
    }
    setTimeout(timerFunc, 0);
}
```


- 若渲染方法是同步执行的，会多次执行

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583156291715-2079372a-4e06-4287-8a3d-5b2e138f7c71.png#align=left&display=inline&height=327&name=image.png&originHeight=654&originWidth=754&size=80410&status=done&style=shadow&width=377)


- 渲染方法变成异步后，会先执行同步任务

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583156328451-e54c2c66-58c2-46bc-a733-297bc7ca7bc1.png#align=left&display=inline&height=147&name=image.png&originHeight=294&originWidth=1214&size=38210&status=done&style=shadow&width=607)

### 二、数组依赖收集

- 因为数组需要使用 `dep`  进行通知，故为了访问到 `dep` ，在 数组中挂载一个方法为实例 `dep` 
```javascript
 this.dep = new Dep();
Object.defineProperty(value, '__obj__', {
  get: ()=>this
})
```
#### 
#### 依赖收集
```javascript
function defineProperty (obj, key, value) {
  let childOb = observe(value);
  let dep = new Dep()
  Object.defineProperty(obj, key, {
    get: function() {
      dep.depend()
      if(childOb){ // 数组的依赖收集
        childOb.dep.depend(); // 数组也收集了当前渲染watcher
        dependArray(value); // 递归收集儿子的依赖
      }
      return value;
    },
    set: function(newVal){
      if (newVal === value) return;
      value = newVal;
      dep.notify()
      observe(newVal)
      return value;
    }
  })
}

 // 递归收集数组中的依赖
 export function dependArray(value){
  for(let i = 0; i < value.length;i++){
      let currentItem = value[i]; // 有可能也是一个数组
      currentItem.__ob__ && currentItem.__ob__.dep.depend();
      if(Array.isArray(currentItem)){
          dependArray(currentItem); // 不停的手机 数组中的依赖关系
      }
  }
}
```

#### 发布通知
因为我们在数组每个属性上面都挂载了实例对象 `Dep` , 故每个数组修改都可以访问到自己的 `dep`  ,从而进行 `Dep.notify` 通知；
```javascript
// ... 省
methods.map(item => {
  arrayMethods[item] = function (value) {
    let inserValue;
    switch (item) {
      case 'push':
      case 'unshift':
        inserValue = value
      break;
      case 'splice':
        inserValue = value.slice(2);
      break;
    }
    if (inserValue) observeArray(inserValue);
    console.log('arrayThis',this)
    this.__obj__.dep.notify() // 发布通知代码
    return arrayProto[item].call(this, value);
  }
})
```

#### __obj__
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583157752991-e4af3b8e-c5fb-41d7-bfa0-b942868d6373.png#align=left&display=inline&height=306&name=image.png&originHeight=612&originWidth=1032&size=70616&status=done&style=shadow&width=516)
#### 不足

- 对于数组变化侦测是通过拦截器实现的, 也就是说只要是通过我们写的那七种方法，就都可以侦测到。而通过数组下标和修改数组长度 `length`  是无法检测的；
```javascript
let arr = [1,2,3]
arr[0] = 100;     // 通过数组下标 修改数组中的数据
arr.length = 1    // 通过修改数组长度 清空数组
```
### 
### 三、总结
我们知道对象的依赖收集是在 `get`  中进行收集，在 `set`  中进行发布通知；其中涉及同一变量多次收集同一个 dep 的过滤去重；也涉及了排队执行中的 `watcher`  去重，以及通过四种方法异步更新页面的实现。而数组的依赖收集也是巧妙的将 `dep`  挂载到每个数组对象 `__obj__` 中，当数组进行赋值操作时进行 `notify`  通知，在 `get`  中单独判断数组进行递归收集；对数组中的每一个元素以及新增的元素都进行了变化侦测。


- [Vue 源码 dep.js](https://github.com/vuejs/vue/blob/dev/src/core/observer/dep.js)
- [Vue 源码 watcher.js](https://github.com/vuejs/vue/blob/dev/src/core/observer/watcher.js)
- [Vue 源码之 nextTick.js](https://github.com/vuejs/vue/blob/dev/src/core/util/next-tick.js)

