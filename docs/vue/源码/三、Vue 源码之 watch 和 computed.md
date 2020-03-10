# 三、Vue 源码之 watch 和 computed

### 背景
通过第二篇，我们实现了依赖收集和异步批量更新，然在 Vue 不仅仅有这些功能，还可以写自己 watch 和 计算属性 computed，那他们之间有什么区别，Vue 是如何派发更新到我们自己写的 watch 和 计算属性的 computed 的。

### watch computed 怎么用
#### watch 用法
```javascript
import Vue from './vue'

let vm = new Vue({
  el: document.getElementById('app'), 
  data: {
    title: 'title1',
    subTitle: 'subTitle2',
  },
  watch:{
    title:{ // title 值发生改变，回运行，并返回新值、老值
      handler(newValue,oldValue){
          console.log(newValue,oldValue);
      },
      immediate:true // 默认执行
    }
  }
})

setTimeout(()=> {
  vm.title = 100
},200)
```
#### 
#### computed 用法
可在 template 中使用 {{ topTitle }} 获取变量值。

```javascript
import Vue from './vue'

let vm = new Vue({
  el: document.getElementById('app'), 
  data: {
    title: '主标题',
    subTitle: '次要标题'
    subTitle: 'subTitle2',
  },
  computed:{
    topTitle () {
    	return this.title + this.subTitle;
    }
  }
})

setTimeout(()=> {
  vm.title = 100
},200)
```
### 
### watch 分类解析
watcher 分为三类，他们给 watcher类 传递的参数也是不同的。

- 渲染页面的 watcher，
- 用户watcher
- 计算属性 watcher

#### 渲染

- 特点：默认会执行 Watcher 第二个参数的方法 updateComponent
```javascript
Vue.prototype._update = function () {
	compiler() // {{title}} 正则匹配，即 vm.title 值返回，调用 title 中 get()
}
Vue.prototype.$mount = function () {
    let vm = this;
    let el = vm.$options.el
    el = vm.$el= query(el)

    let updateComponent = ()=>{
        vm._update(); // 更新组件
    }
    new Watcher(vm,updateComponent);
}
```

- 具体流程

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583219795147-7b173bca-dfab-43b1-b359-26e1416c7f09.png#align=left&display=inline&height=451&name=image.png&originHeight=902&originWidth=1654&size=150419&status=done&style=none&width=827)

- 通过代码看流程
```javascript
let id = 0; // 每次 new Watcher 生成 watcher id, 在执行的时候去重用
import { pushTarget, popTarget} from './dep'
import { nextTick } from './nextTick';
import { util } from '../util'

/**
 * 【渲染 watcher】流程分析
 * 	exprOrFn =>看上面代码 实际执行 title get() 方法，
 *	cb 为空
 *  opts  一些其他参数
**/
class Watcher{
    constructor(vm,exprOrFn,cb=()=>{},opts={}){
        this.vm = vm;
        this.getter = exprOrFn;
        this.cb = cb;
        this.deps = [];
        this.depsId = new Set()
        this.id = id++;
				this.get(); // 默认调用 exprOrFn 方法
    }
    get(){
        pushTarget(this); // 渲染watcher Dep.target = 渲染watcher
        let value = this.getter.call(this.vm)// 执行 title get 方法，收集 渲染 watcher 
        popTarget();
        return value;
    }
    run () {
      this.get();
    }
    update(){ //
      queueWatcher(this); // 因为多个变量修改依赖的都是一个 渲染 watcher, 为了性能不能多次执行，故引入微任务。待变量修改完最后去重下相同的 watcher 在执行。
    }
    addDep(dep){ // 同一个watcher 不应该重复记录dep  让watcher和dep 互相记忆
        let id = dep.id; // msg 的dep
        if(!this.depsId.has(id)){
            this.depsId.add(id)
            this.deps.push(dep); // 渲染 watcher 有的dep [ titleDep, subTitle Dep]
            dep.addSub(this); // titleDep= [渲染 wartch], title 变量修改，可找到 dep，依次执行 该变量 titleDep 中的 watcher update 方法, 
        }
    }
}
let has = {};
let queue = [];
function flushQueue(){
    queue.forEach(watcher=>watcher.run());
    has = {};
    queue = [];
}
function queueWatcher(watcher){ // watcher 去重
    let id = watcher.id;
    if(has[id] == null){
        has[id] = true;
        queue.push(watcher); 
        nextTick(flushQueue);// 异步更新调用
    }
}
export default Watcher;
```

#### 用户

- 特点：不能用在模板里，监控的逻辑都放在 watch 中即可
```javascript
function initWatch(vm){
    let watch = vm.$options.watch; // 是用户传入 watch
    for(let key in watch){ // 循环遍历获取 key 即 title
        let userDef = watch[key];
        let handler = userDef;
        if(userDef.handler){ // title 对应的 handler 为会 watcher 回调函数
            handler = userDef.handler;
        }
      new Watcher(vm,key,handler,{user:true, immediate:userDef.immediate }); // 用户自己定义的watch
    }
}
```

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583220174985-1081addb-5111-4d1a-a2a4-5151d70e2c9d.png#align=left&display=inline&height=500&name=image.png&originHeight=1000&originWidth=1642&size=220865&status=done&style=none&width=821)

```javascript
let id = 0; // 每次 new Watcher 生成 watcher id, 在执行的时候去重用
import {pushTarget,popTarget} from './dep'
import {nextTick} from './nextTick';
import {util} from '../util'

/**
 * 【用户 watcher】流程分析
 * 	exprOrFn => 看上面代码 实际执行 title 的 
 *	cb => title 的 handler() 方法，
 *  opts  {user: true} 标示用户 watcher
**/

class Watcher{
    
    // vm , title  ,(newValue,oldValue)=>{} ,{user:true}
    constructor(vm,exprOrFn,cb=()=>{},opts={}){
        this.vm = vm;
        this.exprOrFn = exprOrFn;
        if(typeof exprOrFn === 'function'){
            this.getter = exprOrFn;
        }else { // 用户 watcher 走 else 
            this.getter = function () { // 如果调用此方法 会将vm上对应的表达式取出来
                return util.getValue(vm,exprOrFn) // vm.title 实际执行 vm.title get() 方法
            }
        }
        if(opts.user){ // 标识是用户自己写的watcher
            this.user = true
        }
        
        this.cb = cb
        this.deps = []
        this.depsId = new Set()
        this.opts = opts
        this.id = id++
        this.immediate = opts.immediate
       
        this.value =  this.get() // 用户watcher 默认执行
        if(this.immediate){ // 如果有immediate 就直接运行用户定义的函数 
            this.cb(this.value) // 执行的是 (newValue,oldValue)=>{} 
        }
    }
    get(){
        // 此时 将当前运行的 watcher 只给 Dep.target 即：Dep.target = 用户的watcher
        pushTarget(this)
      	let value = this.getter.call(this.vm) //此处实际 vm.title 取值 即vm.title get执行，即title 的 dep 实例 subs 属性添加 用户 watcher     
        popTarget() // 弹出 用户watcher 
       
        return value // 返回第一次返回 title 默认值；
    }
    evaluate(){
        this.value = this.get();
        this.dirty = false; // 值求过了 下次渲染的时候不用求了
    }
    addDep(dep){  // 同一个watcher 不应该重复记录dep  让watcher和dep 互相记忆
        let id = dep.id; 
        if(!this.depsId.has(id)){
            this.depsId.add(id)
            this.deps.push(dep); 
            dep.addSub(this);
        }
    }
    depend(){
        let i = this.deps.length;
        while(i--){
            this.deps[i].depend();
        }
    }
    update(){
       queueWatcher(this);
    }
    run(){
        let value = this.get(); // 新值
        if(this.value !== value){
            this.cb(value,this.value); // 新值 不等于 老值，则运行回调函数  title 的 handler() 方法
        }
    }
}
let has = {};
let queue = [];
function flushQueue(){
    queue.forEach(watcher=>watcher.run());
    has = {};
    queue = [];
}
function queueWatcher(watcher){
    let id = watcher.id;
    if(has[id] == null){
        has[id] = true;
        queue.push(watcher); 
        nextTick(flushQueue);
    }
}
export default Watcher;
```

#### 计算属性

- 特点：默认不执行，等用户取值的时候在执行，会缓存取值的结果。如果依赖的值变化了 会更新 dirty 属性，再次取值时 可以重新求新值
```javascript
function initComputed(vm,computed){
  
    let watchers = vm._watchersComputed =  Object.create(null)

    for(let key in computed){ // {topTitle:()=>this.title+this.subTitle}
        let userDef = computed[key]; // 用户需要监听变化后回调的函数
        watchers[key] = new Watcher(vm,userDef,()=>{},{lazy:true});
        Object.defineProperty(vm,key,{
            get: function() { // 用户取值 {{topTitle}} 是会执行此方法              
                if(watchers[key]){
                    // 如果dirty 是 false 的话 不需要重新执行计算属性中的方法
                   if(watchers[key].dirty){ // true 情况会计算 watcher 
                    	watchers[key].evaluate();
                   } 
                   if(Dep.target){
                       watchers[key].depend();
                   }
                   return watchers[key].value // 值
                }
            }
        }) // 将这个属性 定义到vm上
    }
}
```

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583221416619-2c51dc23-1184-4824-b6a7-7fafa92e9654.png#align=left&display=inline&height=494&name=image.png&originHeight=988&originWidth=2098&size=236935&status=done&style=none&width=1049)


```javascript
let id = 0; // 每次 new Watcher 生成 watcher id, 在执行的时候去重用
import {pushTarget,popTarget} from './dep'
import {nextTick} from './nextTick';
import {util} from '../util'


/**
 * 【计算属性 watcher】流程分析
 * 	exprOrFn => 看上面代码 实际执行 toptTitle => this.title + this.subTitle 的 
 *	cb => ()=>{}
 *  opts  {lazy: true} 标示计算属性
**/

class Watcher{ 
    constructor(vm,exprOrFn,cb=()=>{},opts={}){
        this.vm = vm;
        this.exprOrFn = exprOrFn;
        if(typeof exprOrFn === 'function'){
            this.getter = exprOrFn; // 计算属性 watcher 走这里
        }else {
            this.getter = function () {
                return util.getValue(vm,exprOrFn)
            }
        }
        if(opts.user){
            this.user = true;
        }
        this.lazy = opts.lazy; // 计算属性 为 true
        this.dirty = this.lazy;
        this.cb = cb;
        this.deps = [];
        this.depsId = new Set()
        this.opts = opts;
        this.id = id++;
        this.immediate = opts.immediate
        this.value = this.lazy? undefined : this.get(); //计算属性默认不执行
        if(this.immediate){
            this.cb(this.value);
        }
    }
    get(){
        pushTarget(this);
        let value = this.getter.call(this.vm); 
        popTarget();
        return value;
    }
    evaluate(){
        this.value = this.get();
        this.dirty = false; // 求过
    }
    addDep(dep){
        let id = dep.id;
        if(!this.depsId.has(id)){
            this.depsId.add(id)
            this.deps.push(dep)
            dep.addSub(this);
        }
    }
    depend(){
        let i = this.deps.length;
        while(i--){
            this.deps[i].depend();
        }
    }
    update(){
        if(this.lazy){ // 当前 计算属性 watcher 执行 update, 即依赖值 title 发生变化，
            this.dirty = true; // dirty 重置 下次需要再次执行。
        }else {
            queueWatcher(this);
        }
    }
    run(){
        let value = this.get(); // 新值
        if(this.value !== value){
            this.cb(value,this.value);
        }
    }
}
export default Watcher;
```

#### watcher 类参数区分
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583211071843-8dd205aa-80c7-4d47-938e-345d985aeb98.png#align=left&display=inline&height=507&name=image.png&originHeight=1014&originWidth=2116&size=177368&status=done&style=none&width=1058)_
__

