# Promise 模拟实现

### 背景
为了解决回调地狱，JS 内部实现了 Promise, 链式调用语法来解决所有异步问题，增加了代码可读性，那内部具体实现是怎样的，你能不能来模拟实现一下，本文一步一步来实现几个不同的版本，帮助你理解，同时帮助你更好的应用。

### 简陋版骨架
#### 实例
```javascript
new MyPromise(function(resolve,reject){
  resolve('args')
}).then(function(x){
  console.log(x)
});
```

#### 模拟实现
下方的代码最大程度的精简了内部实现流程。
到这一步你需要知道的是：第六行 executor 是默认即执行的函数，而executor就是 new MyPromise(fn) 里面的fn。
```javascript
const PENDING = 'pending';
const RESOLVE = 'resolve';
const REJECT = 'reject';

class MyPromise {
  constructor (executor) {
    this.status = PENDING
    this.value = undefined
    let _this = this
    function resolve (value)  { // 用户 resolve('2112') 2112 即 value
      if (_this.status === PENDING) {
        _this.status = RESOLVE
        _this.value = value
      }
    }
    function reject (value) {
      if (_this.status === PENDING) {
        _this.status = REJECT
        _this.value = value
      }
    }
    try {
      executor(resolve, reject) // 同步执行，参数为我们定义的 resolve
    } catch(e) {
      reject(e)
    }
  }
  then (onFullfilled, onRejected) {
    onFullfilled = typeof onFullfilled === 'function' ? onFullfilled : v => v
    onRejected = typeof onRejected === 'function' ? onRejected : function (err) { throw err}
    switch(this.status){
      case RESOLVE:
        onFullfilled(this.value)
        break;
      case REJECT:
        onRejected(this.value)
        break;
    }
  }
}

```

### 支持异步版
#### 实例
当你改成下面这种格式，发现上面不执行了。x 输出不来。所以上面干了什么，上面写的代码又有什么意义。只是方便理解的过度版。
x 为什么输出不来，因为 setTimeout 异步执行，导致执行到 .then 的时候，当前 this.status 还等于 pending， switch 并未对 pending 做处理。真正的小核心来了，看下下方源码。
```javascript

new MyPromise(function(resolve,reject){
  setTimeout(()=>{
    resolve('args')
  })
}).then(function(x){
  console.log(x)
});
```
#### 模拟实现
可以看到 相对于简陋版的骨架，最主要新增了 onFullfilledCallback onRejectedCallback,
在 .then 的时候，若当前 status 为 pending, 则收集用户传入方法到 onFullfilledCallback onRejectedCallback
因为用户异步早晚会执行 resolve 或 reject 方法，故在方法内部进行发布 _this.onFullfilledCallback.map(fn=>fn(value))。实际内部就是发布与订阅设计模式的应用。发布与订阅设计模式是非常常见且应用广泛的设计模式，不会的需要注意了。其实也非常简单。

```javascript
const PENDING = 'pending';
const RESOLVE = 'resolve';
const REJECT = 'reject';

class MyPromise {
  constructor (executor) {
    this.status = PENDING
    this.value = undefined
    let _this = this
    this.onFullfilledCallback = [] // 增加了本行
    this.onRejectedCallback = []
    function resolve (value)  {
      if (_this.status === PENDING) {
        _this.status = RESOLVE
        _this.value = value
        _this.onFullfilledCallback.map(fn=>fn(value))
      }
    }
    function reject (value) {
      if (_this.status === PENDING) {
        _this.status = REJECT
        _this.value = value
        _this.onRejectedCallback.map(fn=>fn(value))
      }
    }
    try {
      executor(resolve, reject)
    } catch(e) {
      reject(e)
    }
  }
  then (onFullfilled, onRejected) {
    onFullfilled = typeof onFullfilled === 'function' ? onFullfilled : v => v
    onRejected = typeof onRejected === 'function' ? onRejected : function (err) { throw err}
    switch(this.status){
      case RESOLVE:
        onFullfilled(this.value)
        break;
      case REJECT:
        onRejected(this.value)
        break;
      case PENDING:
        this.onFullfilledCallback.push(onFullfilled)
        this.onRejectedCallback.push(onRejected)
        break;
    }
  }
}
```

### 链式调用
上面的版本，不支持链式多 .then 调用，显然还是不完整版本，下面我们来完成支持多个 then 版本。这边终于可以应付简单的使用了。
#### 实例
```javascript
new MyPromise(function(resolve,reject){
  setTimeout(()=>{
    resolve('1')
  },100)
}).then(function(x){
  setTimeout(()=>{
    console.log('2')
  })
  return 10
}).then(function(x){
  console.log(x)
})
```

#### 模拟实现
```javascript
const PENDING = 'pending';
const RESOLVE = 'resolve';
const REJECT = 'reject';

class MyPromise {
  constructor (executor) {
    this.status = PENDING
    this.value = undefined
    let _this = this
    this.onFullfilledCallback = []
    this.onRejectedCallback = []
    function resolve (value)  {
      setTimeout(() => {
        if (_this.status === PENDING) {
          _this.status = RESOLVE
          _this.value = value
          _this.onFullfilledCallback.map(fn=>fn())
        }
      })
    }
    function reject (value) {
      setTimeout(() => {
        if (_this.status === PENDING) {
          _this.status = REJECT
          _this.value = value
          _this.onRejectedCallback.map(fn=>fn())
        }
      })
    }
    try {
      executor(resolve, reject)
    } catch(e) {
      reject(e)
    }
  }
  then(onFullfilled, onRejected){
    onFullfilled = typeof onFullfilled === 'function' ? onFullfilled : v => v
    onRejected = typeof onRejected === 'function' ? onRejected : function (err) { throw err}
    let _this = this;
    return new MyPromise (function(resolve, reject){ // 支持 then 链式调用核心是 return new Promise
      switch(_this.status){
        case RESOLVE:
          onFullfilled(_this.value)
          resolve(_this.value);
          break;
        case REJECT:
          onRejected(_this.value)
          reject(_this.value);
          break;
        case PENDING:
          _this.onFullfilledCallback.push(() => {
            let value = onFullfilled(_this.value);
            resolve(value);
          })
          _this.onRejectedCallback.push(() => {
            let value = onRejected(_this.value);
            reject(value);
          })  
          break;
      }
    })
  }
}
```

一直没放过效果图片，代码是完整的，你可以粘贴进行测试。
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583503328669-0f82c415-3920-44b9-9f62-4427c45dd68f.png#align=left&display=inline&height=76&name=image.png&originHeight=152&originWidth=1058&size=20729&status=done&style=shadow&width=529)

### 嵌套
#### 实例
```javascript

new Promise(function(resolve,reject){
  setTimeout(()=>{
    resolve('1')
  },100)
}).then(function(x){
  console.log('大儿子', x)
  return new Promise(function(resolve, reject){
    resolve(2)
  }).then(function(x){
    console.log('大儿子的大孙子', x)
  }).then(function(){
    console.log('大儿子的二孙子')
  }).then(function(){
    console.log('大儿子的三孙子')
    return 100
  })
}).then(function(x){
  console.log('二儿子', x)
})

```
应该输出结果见左图，而我们自己写的见有图，显然顺序结果都不对。
#### ![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583503693006-3fbd34cf-f607-4c80-89ee-a7240f3140a0.png#align=left&display=inline&height=111&name=image.png&originHeight=222&originWidth=314&size=14557&status=done&style=none&width=157)![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583503714891-b923f570-eeed-455f-b6f9-0b64ab85272e.png#align=left&display=inline&height=149&name=image.png&originHeight=298&originWidth=372&size=24601&status=done&style=none&width=186)
#### 模拟实现
核心就是看代码段 71 行
```javascript
const PENDING = 'pending';
const RESOLVE = 'resolve';
const REJECT = 'reject';

function resolvePromise (promise, x, resolve, reject) {
  if ((typeof x === "object" && x !== null) || typeof x === "function") {
    let then = x.then; // 取then 可能发生异常
    if (typeof then === "function") {
      then.call(x, (y) => {
        resolvePromise(promise, y, resolve, reject);
        }, (r) => {
          reject(r);
        })
      } else {
        resolve(x);
      }
    }else {
      resolve(x);
    }
}

class MyPromise {
  constructor (executor) {
    this.status = PENDING
    this.value = undefined
    let _this = this
    this.onFullfilledCallback = []
    this.onRejectedCallback = []
    function resolve (value)  {
      setTimeout(() => {
        if (_this.status === PENDING) {
          _this.status = RESOLVE
          _this.value = value
          _this.onFullfilledCallback.map(fn=>fn())
        }
      })
    }
    function reject (value) {
      setTimeout(() => {
        if (_this.status === PENDING) {
          _this.status = REJECT
          _this.value = value
          _this.onRejectedCallback.map(fn=>fn())
        }
      })
    }
    try {
      executor(resolve, reject)
    } catch(e) {
      reject(e)
    }
  }
  then(onFullfilled, onRejected){
    onFullfilled = typeof onFullfilled === 'function' ? onFullfilled : v => v
    onRejected = typeof onRejected === 'function' ? onRejected : function (err) { throw err}
    let _this = this;
    return new MyPromise (function(resolve, reject){
      switch(_this.status){
        case RESOLVE:
          onFullfilled(_this.value)
          resolve(_this.value);
          break;
        case REJECT:
          onRejected(_this.value)
          reject(_this.value);
          break;
        case PENDING:
          _this.onFullfilledCallback.push(() => {
            let value = onFullfilled(_this.value);
            // 当我们返回 new Promise 的时候，会满足条件
            if ((typeof value === "object" && value !== null) || typeof value === "function") {
              let then = value.then;
              if (typeof then === 'function') { 
                then.call(value, (x)=>{
                  resolve(x);
                }, (r)=>{
                  reject(r)
                })
              } else {
                resolve(x);
              }
            }else {// 当返回数据是不是对象或者也不是函数，是普通数据类型，直接 resolve(value)
              resolve(value);
            }
            
          })
          _this.onRejectedCallback.push(() => {
            let value = onRejected(_this.value);
            reject(value);
          })  
          break;
      }
    })
  }
}
```

### 特殊情况处理
我们来看递归核心处理嵌套 promise 代码

#### 情况一：返回自己
```javascript
const runtimeProimse = new Promise((resolve)=>{
  setTimeout(() => {
    resolve(2)
  })
})
let primise2 = runtimeProimse.then((arg)=>{
  console.log(arg)
  return primise2 // 循环引用一直等待
})

```

#### 情况二：返回是数值类型
```javascript
const runtimeProimse = new Promise((resolve)=>{
  setTimeout(() => {
    resolve(2)
  })
})
let primise2 = runtimeProimse.then((arg)=>{
  console.log(arg)
  return 100 // 简单情况
})

primise2.then((arg)=>{
	console.log(arg)
})
```

#### 情况三：返回 Promise
```javascript
const runtimeProimse = new Promise((resolve)=>{
  setTimeout(() => {
    resolve(2)
  })
})
let primise2 = runtimeProimse.then((arg)=>{
  console.log(arg)
  return new Promise((resolve)=>{
    setTimeout(() => {
      resolve(20)
    })
  }) // 简单情况
})

primise2.then((arg)=>{
	console.log(arg)
})
```
#### 
#### 情况四：resolve 里面还是 Proimse
```javascript

const runtimeProimse = new Promise((resolve)=>{
  setTimeout(() => {
    resolve(2)
  })
})
let primise2 = runtimeProimse.then((arg)=>{
  console.log(arg)
  return new Promise((resolve)=>{
    setTimeout(() => {
      resolve(
        new Promise(resolve=>{
          setTimeout(()=>{
            resolve(100)
          })
        })
      )
    })
  })
})

primise2.then((arg)=>{
	console.log(arg)
})
```

#### 模拟实现
```javascript
function resolutionProcedure (promise, x, resolve, reject) {
  
  // 解决【情况一】问题：不处理会造成死循环
  if (promise === x) return reject(new Error('TypeError: Chaining cycle detected for promise #<Promise>'))  // 解决情况一问题
  
  // 解决【情况三】问题：递归核心
  if ((typeof x === "object" && x !== null) || typeof x === "function") {
    let called = false
      try {
        const { then } = x
        if (typeof then === 'function') { // 此处才认为是 promise
          then.call(x, (value) => {
            if (called) return
            called = true
            // 【情况四】
            resolutionProcedure(promise, value, resolve, reject)
          }, reason => {
            if (called) return
            called = true
            reject(reason)
          })
        } else { // {then: 100} 有可能不是函数
          resove(x)
        }
      } catch (reason) { // 此处异常捕获：因为x.then 取值可能会报错
        if (called) return
        called = true
        reject(reason)
      }
    return
  }
  // 【情况二】：数值类型直接返回
  resolve(x)
}

```

### 完整版

```javascript
const PENDING = 'pending';
const RESOLVE = 'resolve';
const REJECT = 'reject';



function resolutionProcedure (promise, x, resolve, reject) {
  
  if (promise === x) return reject(new Error('TypeError: Chaining cycle detected for promise #<Promise>')) 

  if ((typeof x === "object" && x !== null) || typeof x === "function") {
    let called = false
      try {
        const { then } = x
        if (typeof then === 'function') {
          then.call(x, (value) => {
            if (called) return
            called = true
            resolutionProcedure(promise, value, resolve, reject)
          }, reason => {
            if (called) return
            called = true
            reject(reason)
          })
        } else {
          resove(x)
        }
      } catch (reason) {
        if (called) return
        called = true
        reject(reason)
      }
    return
  }
  resolve(x)
}

class MyPromise {
  constructor (executor) {
    this.status = PENDING
    this.value = undefined
    let _this = this
    this.onFullfilledCallback = []
    this.onRejectedCallback = []
    function resolve (value)  {
      setTimeout(() => {
        if (_this.status === PENDING) {
          _this.status = RESOLVE
          _this.value = value
          _this.onFullfilledCallback.map(fn=>fn())
        }
      })
    }
    function reject (value) {
      setTimeout(() => {
        if (_this.status === PENDING) {
          _this.status = REJECT
          _this.value = value
          _this.onRejectedCallback.map(fn=>fn())
        }
      })
    }
    try {
      executor(resolve, reject)
    } catch(e) {
      reject(e)
    }
  }
  then(onFullfilled, onRejected){
    onFullfilled = typeof onFullfilled === 'function' ? onFullfilled : v => v
    onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err}
    let _this = this;
    const promise = new MyPromise (function(resolve, reject){
       
      const handler = (fn) => {
        try {
          resolutionProcedure(promise, fn(_this.value), resolve, reject)
        } catch (error) {
          console.error(error)
          reject(error)
        }
      }

      const resolveHandler = () => handler(onFullfilled)
      const rejectHandler = () => handler(onRejected)

      switch(_this.status){
        case RESOLVE:
          setTimeout(() => {
            resolveHandler()
          })
          break;
        case REJECT:
          setTimeout(() => {
            rejectHandler()
          })
          break;
        case PENDING:
          _this.onFullfilledCallback.push(resolveHandler)
          _this.onRejectedCallback.push(rejectHandler)
          break;
      }
    })
    return promise
  }
  catch (onReject) {
    return this.then(null, onReject)
  }
  finally (callback) {
    return this.then(() => callback(), () => callback())
  }
  static resolve (value) {
    const p = new MyPromise(() => {})
    p.resolve(value)
    return p
  }
  static reject (value) {
    const p = new MyPromise(() => {})
    p.reject(value)
    return p
  }
  static race (entries) {
    if (Array.isArray(entries)) {
      return new MyPromise((resolve, reject) => {
        for (const item of entries) {
          this.resolve(item).then(resolve, reject)
        }
      })
    }
    return 
  }
  static all (entries) {
    if (Array.isArray(entries)) {
      if (entries.length === 0) return this.resolve([])
      return new MyPromise((resolve, reject) => {
        const result = []
        let n = 0
        for (const item of entries) {
          this.resolve(item).then(data => {
            result.push(data)
            n++
            if (n === entries.length) {
              resolve(result)
            }
          }, reject)
        }
      })
    }
    return Promise.reject(new Error(`You must pass an array to all.`))
  }
}
```

### 总结
一步一个脚印模拟了 Promise 的实现，乐此不疲。
