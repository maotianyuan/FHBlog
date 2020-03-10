# 一、Vue 源码之数据劫持

### 背景
Vue 中为了实现数据与视图的双向绑定，对页面中数据进行劫持，其中最重要的一个API，我们都知道是`Object.defineProperty` ，我们通过在该方法中的 `set`  `get` 方法中做一些我们自己的操作，从而实现数据的双向绑定；数据源分为对象和数组类型，我们需要考虑这两种情况进行数据劫持，那具体实现的细节，本文一探究竟。

### 一、DEMO
#### 效果图
> 我们先看下效果，DEMO 中实现的是


[![屏幕录制2020-03-02下午3.29.12.mov (520.43KB)](https://cdn.nlark.com/yuque/0/2020/jpeg/424608/1583134426256-472dcbe7-7336-4b7b-bcbf-0539d6ad7636.jpeg?x-oss-process=image/resize,h_450)](https://www.yuque.com/mty/here/qeow1v?_lake_card=%7B%22status%22%3A%22done%22%2C%22name%22%3A%22%E5%B1%8F%E5%B9%95%E5%BD%95%E5%88%B62020-03-02%E4%B8%8B%E5%8D%883.29.12.mov%22%2C%22size%22%3A532925%2C%22percent%22%3A0%2C%22id%22%3A%221ypiq%22%2C%22videoId%22%3A%2227073e27cf1f482c822b3b289c03d620%22%2C%22coverUrl%22%3A%22https%3A%2F%2Fcdn.nlark.com%2Fyuque%2F0%2F2020%2Fjpeg%2F424608%2F1583134426256-472dcbe7-7336-4b7b-bcbf-0539d6ad7636.jpeg%22%2C%22aliyunVideoSrc%22%3Anull%2C%22taobaoVideoId%22%3A%22254339555455%22%2C%22uploaderId%22%3A424608%2C%22authKey%22%3A%22YXBwX2tleT04MDAwMDAwMTImYXV0aF9pbmZvPXsidGltZXN0YW1wRW5jcnlwdGVkIjoiMjc0MDhjYTRhNTUyMjJkNWNiOWQxZGQ3OWJhMWVjMzEifSZkdXJhdGlvbj0mdGltZXN0YW1wPTE1ODMxMzY5NTY%3D%22%2C%22docUrl%22%3A%22https%3A%2F%2Fwww.yuque.com%2Fmty%2Fhere%2Fqeow1v%22%2C%22card%22%3A%22video%22%7D#1ypiq)
#### 核心代码
```javascript
// 需要知道 Object.defineProperty 基础用法
Object.defineProperty(obj, key, {
  get: function() {
    console.log(`获取值 ${key} `,) // 可以再次处收集
    return value;
  },
  set: function(newVal){
    value = newVal;
    console.log(`修改值 ${key} 为 ${newVal}`,) //再此处发布
    update()
  }
})
```

#### 具体代码
```javascript
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <div id="app">
    <h1 class="title"></h1>
    <h2 class="subTitle"></h2>
    <h3 class="list"></h3>
  </div>
  <script>
    var obj = {
      title: 1,
      subTitle: 3,
      arr: [1,2,3],
      c: {
        c1: 4,
      }
    }
    oldArrayProtoMethods = Array.prototype;
    const methods = [
      'push',
      'pop',
      'unshift',
      'shift',
      'sort',
      'reverse',
      'splice',
    ]
    var ArrayMethods = Object.create(oldArrayProtoMethods)

    methods.forEach(item => {
      ArrayMethods[item] = function (value) {
        let inserted;
        switch (item) {
          case 'push':
          case 'unshift':
            inserted = value
          break;
          case 'splice':
            inserted = value.slice(2);
          break;
        }
        console.log('inserted',inserted);
        if (inserted) walk(inserted);
        return oldArrayProtoMethods[item].call(this, value);
      }
    })

    function defineProperty(obj, key) {
      let value = obj[key];
      Object.defineProperty(obj, key, {
        get: function() {
          console.log(`获取值 ${key} `,) //依赖收集
          return value;
        },
        set: function(newVal){
          value = newVal;
          console.log(`修改值 ${key} 为 ${newVal}`,) // 批量更新
          update()
          return value;
        }
      })
    }

    function walk (obj) {
      if(typeof obj !== 'object') {
        return
      }
      if (Array.isArray(obj)) {
        obj.__proto__ = ArrayMethods // 劫持对象原型
      }else {
        Object.keys(obj).map(item => {
          let value = obj[item]
          if (typeof value === 'object') {
            walk(value)
          } else {
            defineProperty(obj, item)
          }
        })
      }
    }

    walk(obj)
    
    update();
    
    function update () {
      console.log('in')
      document.querySelector('.title').innerText = obj.title
      document.querySelector('.subTitle').innerText = obj.subTitle
      document.querySelector('.list').innerText = JSON.stringify(obj.arr)
    }

    setTimeout(function(){
    
      obj.title = '标题'
      obj.subTitle = '小标题'
      
      obj.arr.push({arrkey: 100})
      obj.arr[3].arrkey = 200

      obj.c.c1 = '100'
    }, 1000)
  </script>
</body>
</html>
```

### 二、模拟源码版
#### 对象代理
即当我们访问 `vm.title`  实际访问是 `vm._data.title` ？为什么需要此步代理，
我们先说为什么有 `_data` ？因为 data 是用户传递过来的数据，我们不能改变用户输入过来的值，这样很不好；所以我们将其赋值给 `_data` ；这样我们就可以通过 `vm._data.title`  来访问；但每次都需要携带 `_data`  比较麻烦，所以我们做了一层代理，当访问 `vm.title`  实际访问 `vm._data.title` 。

```javascript
import observe from "./observe";

// 此步目的：
// 	当访问 vm.title 实际访问是 vm._data.title 
//	vm.arr[3].listItem = vm._data.arr[3].listItem 
function proxy (vm, source, key) {
  Object.defineProperty(vm, key, {
    get: () => vm[source][key],
    set: function(value) {
      console.log('value',value)
      vm[source][key] = value
    }
  })
}

function initState (vm) {
  initData(vm)
}

function initData (vm) {
  let { data } = vm.$options
  data = vm._data = typeof data === "function" ? data.call(vm) : data || {} // 用户返回可能是 方法也可能是 对象，故需要判断
  observe(vm._data)
  Object.keys(data).map(item => proxy(vm, '_data', item))
  console.log(vm)
}
export default initState;
```

```javascript
import Vue from './vue'

let vm = new Vue({
  el: '#app',
  data: {
    title: 'title1',
    subTitle: 'subTitle2',
    test: {
      a: 1,
    },
    list: [1,10,100],
  },
})

setTimeout(()=> {
  // vm.title = 100
  // console.log(vm.test.a)
  // console.log(vm.test.a = 100)
  // console.log(vm.list)
  vm.list.push({listItem: '100'})
  vm.list[3].listItem = 10000
  // console.log(vm.list[3].listItem)
},200)
```
#### 
#### 对象劫持
```javascript

import { arrayMethods, observeArray } from './array.js'

export default function observe (value) {
  if (typeof value != 'object') return value;
  return new Observe(value)
}

function defineProperty (obj, key, value) {
  observe(value);
  Object.defineProperty(obj, key, {
    get: function() {
      console.log(`获取值 ${key} `)
      return value;
    },
    set: function(newVal){
      if (newVal === value) return;
      value = newVal;
      console.log(`修改值 ${key} 为 ${newVal}`)
      observe(newVal)
      return value;
    }
  })
}

export class Observe {
  constructor (value) { // 可能是数组也可能是对象
    if (Array.isArray(value)) {
      value.__proto__ = arrayMethods; // 数组原型链赋值给我们自己写的方法
      observeArray(value);
    }else {
      this.walk(value); // 对象遍历进行 Object.defineProperty
    }
  }
  walk(obj) {
    Object.keys(obj).map(item => {
      defineProperty(obj, item, obj[item])
    })
  }
}
```

实例 `$options`  见下图，可以看到在实例添加 `_data` ，通过 `proxy`  代理，使得 `vm.title`  可以访问到 `vm._data.title`  中数据，并为每一个属性添加 `get`  `set`  方法实现响应式；

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583135103837-e584544e-4819-46fb-b45d-297d2b43d495.png#align=left&display=inline&height=733&name=image.png&originHeight=1466&originWidth=864&size=170369&status=done&style=none&width=432)

#### 数组劫持
```javascript
import observe from './observe'

let arrayProto = Array.prototype;

const methods = [
  'push',
  'pop',
  'unshift',
  'shift',
  'sort',
  'reverse',
  'splice',
]
const isType = (type) => (value) => Object.prototype.toString.call(value) === `[object ${type}]`
const isObject = isType('Object')
const isArray = isType('Array')

export function observeArray (value) {
  if (isObject(value)) {
    observe(value)
    return;
  }
  if (isArray(value)) {
    value.map(i => observe(i))
  }
 }
 

export let arrayMethods = Object.create(arrayProto)

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
    console.log('inserValue',inserValue); // 新增值 响应
    if (inserValue) observeArray(inserValue);
    return arrayProto[item].call(this, value);
  }
})
```

通过看下图与上面代码，我们很清楚知道，数组是利用原型链进行劫持的；核心即下面两行，接着在原型链加一层方法，劫持 `push`  `pop`  `unshift` 等七种方法。

```javascript
let oldArrayProtoMethods = Array.prototype;
let arrayMethods = Object.create(oldArrayProtoMethods)
```

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583135220969-14a5d483-0acb-444b-a665-8d5f85542459.png#align=left&display=inline&height=629&name=image.png&originHeight=1258&originWidth=708&size=143708&status=done&style=none&width=354)



### 三、真实源码

- [对象劫持](https://github.com/vuejs/vue/blob/dev/src/core/observer/index.js)
- [数组劫持](https://github.com/vuejs/vue/blob/dev/src/core/observer/array.js)

### 四、总结
现在我们通过修改 vm.title = 'test' 就可以触发 definedProperty 中的 set 方法，尽而可以拦截赋值的操作，可以在拦截处重新设置 DOM 元素给新值，实现与视图的动态绑定，那将如何做呢？
