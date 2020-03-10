# Vuex 原理

## 背景
> Vuex 是一个专为 Vue.js 应用程序开发的**状态管理模式**。Vuex 是专门为 Vue.js 设计的状态管理库，以利用 Vue.js 的细粒度数据响应机制来进行高效的状态更新。如果你已经灵活运用，但是依然好奇它底层实现逻辑，不妨一探究竟。


## Vue 组件开发
我们知道开发 Vue 插件，安装的时候需要执行 Vue.use(Vuex)

```javascript
import Vue from 'vue'
import Vuex from '../vuex'

Vue.use(Vuex)
```

> 通过查看 [Vue API Vue-use](https://cn.vuejs.org/v2/api/#Vue-use) 开发文档，我们知道安装 Vue.js 插件。如果插件是一个对象，必须提供 `install` 方法。如果插件是一个函数，它会被作为 install 方法。install 方法调用时，会将 Vue 作为参数传入。该方法需要在调用 `new Vue()` 之前被调用。当 install 方法被同一个插件多次调用，插件将只会被安装一次。



为了更好了的去理解源码意思，这里写了一个简单的测试实例。

### 测试实例代码
```javascript
import Vue from 'vue'
import Vuex from '../vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  plugins: [],
  state: {
    time: 1,
    userInfo: {
      avatar: '',
      account_name: '',
      name: ''
    },
  },
  getters: {
    getTime (state) {
      console.log('1212',state)
      return state.time
    }
  },
  mutations: {
    updateTime(state, payload){
      state.time = payload
    }
  },
  actions: {
    operateGrou({ commit }) {
      // commit('updateTime', 100)
      return Promise.resolve().then(()=>{
        return {
          rows: [1,2,3]
        }
      })
    }
  },
  modules: {
    report: {
      namespaced: true,
      state: {
        title: '',
      },
      getters: {
        getTitle (state) {
          return state.title
        }
      },
      mutations: {
        updateTitle(state, payload){
          state.title = payload
        }
      },
      actions: {
        operateGrou({ commit }) {
          commit('updateTitle', 100)
          return Promise.resolve().then(()=>{
            return {
              rows: [1,2,2,3]
            }
          })
        }
      },
      modules: {
        reportChild: {
          namespaced: true,
          state: {
            titleChild: '',
          },
          mutations: {
            updateTitle(state, payload){
              state.title = payload
            }
          },
          actions: {
            operateGrou({ commit }) {
              commit('updateTitle', 100)
              return Promise.resolve().then(()=>{
                return {
                  rows: [1,2,2,3]
                }
              })
            }
          },
        }
      }
    },
    part: {
      namespaced: true,
      state: {
        title: '',
      },
      mutations: {
        updateTitle(state, payload){
          state.title = payload
        },
        updateTitle1(state, payload){
          state.title = payload
        }
      },
      actions: {
        operateGrou({ commit }) {
          commit('updateTitle', 100)
          return Promise.resolve().then(()=>{
            return {
              rows: [1,2,2,3]
            }
          })
        }
      },
      modules: {
        partChild: {
          namespaced: true,
          state: {
            titleChild: '',
          },
          getters: {
            getTitleChild (state) {
              return state.titleChild
            }
          },
          mutations: {
            updateTitle(state, payload){
              state.titleChild = payload
            }
          },
          actions: {
            operateGrou({ commit }) {
              commit('updateTitle', 1000)
              return Promise.resolve().then(()=>{
                return {
                  rows: [1,2,2,3]
                }
              })
            }
          },
          modules: {
            partChildChild: {
              namespaced: true,
              state: {
                titleChild: '',
              },
              getters: {
                getTitleChild (state) {
                  return state.titleChild
                }
              },
              mutations: {
                updateTitle(state, payload){
                  state.titleChild = payload
                }
              },
              actions: {
                operateGrou({ commit }) {
                  commit('updateTitle', 1000)
                  return Promise.resolve().then(()=>{
                    return {
                      rows: [1,2,2,3]
                    }
                  })
                }
              },
            }
          }
        }
      }
    }
  }
})

```

### Graphviz 父子结点关系图
用 Graphviz 图来表示一下父子节点的关系，方便理解

![](https://cdn.nlark.com/yuque/__graphviz/b71b559736734bcddb7d0209b28d1401.svg#lake_card_v2=eyJjb2RlIjoiLyogY291cnRlc3kgSWFuIERhcndpbiBhbmQgR2VvZmYgQ29sbHllciwgU29mdHF1YWQgSW5jLiAqL1xuZGlncmFwaCB1bml4IHtcbiAgc2l6ZT1cIjMsM1wiO1xuICBub2RlIFtjb2xvcj1saWdodGJsdWUyLCBzdHlsZT1maWxsZWRdO1xuICBcIuaguVN0b3JlXCIgLT4gXCJyZXBvcnRcIjtcblx0XCLmoLlTdG9yZVwiIC0-IFwicGFydFwiO1xuICBcInJlcG9ydFwiIC0-IFwicmVwb3J0Q2hpbGRcIjtcbiAgXCJwYXJ0XCIgLT4gXCJwYXJ0Q2hpbGRcIjtcbiAgXCJwYXJ0Q2hpbGRcIiAtPiBcInBhcnRDaGlsZENoaWxkXCI7XHRcbn0iLCJ0eXBlIjoiZ3JhcGh2aXoiLCJpZCI6InliNFJHIiwidXJsIjoiaHR0cHM6Ly9jZG4ubmxhcmsuY29tL3l1cXVlL19fZ3JhcGh2aXovYjcxYjU1OTczNjczNGJjZGRiN2QwMjA5YjI4ZDE0MDEuc3ZnIiwiY2FyZCI6ImRpYWdyYW0ifQ==)
### 组件开发第一步 install & mixin
在调用 Vuex 的时候会找其 install 方法，并把组件实例传递到 install 方法的参数中。

```javascript
let Vue;
class Store {
	
}

const install = _Vue => {
    Vue = _Vue;
    Vue.mixin({
        beforeCreate(){
           console.log(this.$options.name);
        }
    })
};

export default {
    Store,
    install
}
```

到这里说一下 Vuex 实现的思想，在 Vuex 的 install 方法中，可以获取到 Vue 实例。
我们在每个 Vue 实例上添加 $store 属性，可以让每个属性访问到 Vuex 数据信息；
我们在每个 Vue 实例的 data 属性上添加上 state，这样 state 就是响应式的；
收集我们传入 new Vuex.Store(options) 即 options 中所有的 mutaions、actions、getters；
接着当我们 dispatch 的时候去匹配到 Store 类中存放的 actions 方法，然后去执行；
当我们 commit 的时候去匹配到 Store 类中存放的 mutations 方法，然后去执行；
这其实就是一个发布订阅模式，先存起来，后边用到再取再执行。好了解这些，我们开始真正的源码分析；


## Vue 实例注入 $store
为了更好理解，我们打印出 Vue 实例，可以看到注入了 $store，见下图。
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583459710149-9f72e73c-1e3c-45de-9b6c-07b253e059eb.png#align=left&display=inline&height=604&name=image.png&originHeight=1208&originWidth=1354&size=310673&status=done&style=shadow&width=677)


具体实现关键点

```javascript
const install = (_Vue) => {
  Vue = _Vue
  Vue.mixin({
    beforeCreate(){
      // 我们可以看下面 main.js 默认只有我们的根实例上有 store，故 this.$options.store 有值是根结点
      if(this.$options.store) { 
        this.$store = this.$options.store // 根结点赋值
      } else {
        this.$store = this.$parent && this.$parent.$store // 每个实例都会有父亲。故一层层给实例赋值
      }
    }
  })
}
```

- main.js
```javascript
import Vue from 'vue'
import App from './App.vue'
import store from './store'

Vue.config.productionTip = false

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')
```

## $store.state 响应式
响应式核心就是挂载到实例 data 上，让 Vue 内部运用 Object.defineProperty 实现响应式。
```javascript
class Store{
  constructor (options) { // 我们知道 options 是用户传入 new Vuex.Store(options) 参数
    this.vm = new Vue({
      data: {
        state: options.state
      }
    })
  }
}
```

## $store.mutations & commit
来看下 用户传入的 mutations 变成了什么，数据采用 最上面的测试实例代码。
我们可以看到 mutations 是一个对象，里面放了函数名，值是数组，将相同函数名对应的函数存放到数组中。

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583460337985-bbf6e021-54d5-4dd9-9972-495ba61606d3.png#align=left&display=inline&height=329&name=image.png&originHeight=658&originWidth=1274&size=142368&status=done&style=shadow&width=637)

### mutations

- 实际上就是收集用户传入的 mutations, 放到一个对象中。
```javascript
 const setMoutations = (data, path = []) => {
    const mutations = data.mutations
    Object.keys(mutations).map(item => {
      this.mutations[item] = this.mutations[item] || [] // 之前的旧值
      this.mutations[item].push(mutations[item]) // 存起来
    })
    const otherModules = data.modules || {} // 有子 modules 则递归
    if (Object.keys(otherModules).length > 0){
      Object.keys(otherModules).map(item => {
        setMoutations(otherModules[item], path.concat(item))
      })
    }
  }
  setMoutations(options) // 这里 options 是用户传入的 new Vuex.Store(options) 的参数
```

### commit

- 实际上就是从收集 mutaitons 中找到用户传入的mutationName对应的数组方法，然后遍历执行。通知到位。
```javascript
class Store{
	commit = (mutationName, payload) => {
    this.mutations[mutationName].map(fn => {
      fn(this.state, payload)
    })
  }
}
```


## $store.actions & dispatch
### actions

- actions 与 mutations 实现是一样的
```javascript
  const setAction = (data, path = []) => {
    const actions = data.actions
    Object.keys(actions).map(item => {
      this.actions[item] = this.actions[item] || []
      this.actions[item].push(actions[item])
    })
    const otherModules = data.modules || {}
    if (Object.keys(otherModules).length > 0){
      Object.keys(otherModules).map(item => {
        setAction(otherModules[item], path.concat(item))
      })
    }
  }
  setAction(options)
```

### dispatch
```javascript
class Store{
  dispatch = (acitonName, payload) => {
    this.actions[acitonName].map(fn => {
      fn(this, payload) // this.$store.dispatch('operateGrou')
    })
  }
}
```


## $store.getters
```javascript
const setGetter = (data, path = []) => {
  const getter = data.getters || {}
  const namespace = data.namespaced
  Object.keys(getter).map(item => {     
    // 跟 Vue 计算属性底层实现类似，当从 store.getters.doneTodos 取值的时候，实际会执行 这个方法。
    Object.defineProperty(this.getter, item, { 
      get:() => {
        return options.state.getters[item](this.state)
      }
    })
  })

  const otherModules = data.modules || {}
  if (Object.keys(otherModules).length > 0){
    Object.keys(otherModules).map(item => {
      setGetter(otherModules[item], path.concat(item))
    })
  }
}
setGetter(options)
```

## namespaced
上面讨论的是没有 namespaced 的情况，加上 namespaced 有什么区别呢，见下图。

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583461420875-829119b9-4e9e-4a38-b861-b3d8b456a1ae.png#align=left&display=inline&height=498&name=image.png&originHeight=996&originWidth=1088&size=212317&status=done&style=shadow&width=544)

瞬间拨云见日了，平常写上面基本上都要加上 namespaced，防止命名冲突，方法重复多次执行。
现在就算每个 modules 的方法命一样，也默认回加上这个方法别包围的所有父结点的 key。
下面对 mutations actions getters 扩展一下，让他们支持 namespaced。核心就是 path 变量
### 
### mutations
```javascript
// 核心点在 path
const setMoutations = (data, path = []) => {
    const mutations = data.mutations
    const namespace = data.namespaced
    Object.keys(mutations).map(item => {
      let key = item
      if (namespace) {
        key = path.join('/').concat('/'+item) // 将所有父亲用 斜杠 相关联
      }
      this.mutations[key] = this.mutations[key] || []
      this.mutations[key].push(mutations[item])
    })
    const otherModules = data.modules || {}
    if (Object.keys(otherModules).length > 0){
      Object.keys(otherModules).map(item => {
        setMoutations(otherModules[item], path.concat(item)) // path.concat 不会修改 path 原来的值
      })
    }
  }
  setMoutations(options)
```
### 
### actions 
actions 与 mutations 是一样的
```javascript
const setAction = (data, path = []) => {
    const actions = data.actions
    const namespace = data.namespaced
    Object.keys(actions).map(item => {
      let key = item
      if (namespace) {
        key = path.join('/').concat('/'+item)
      }
      this.actions[key] = this.actions[key] || []
      // this.actions[key].push(actions[item]) 
      this.actions[key].push((payload) => {
        actions[item](this, payload);
      })
    })
    const otherModules = data.modules || {}
    if (Object.keys(otherModules).length > 0){
      Object.keys(otherModules).map(item => {
        setAction(otherModules[item], path.concat(item))
      })
    }
  }
  setAction(options)
```

### getter
```javascript
 const setGetter = (data, path = []) => {
    const getter = data.getters || {}
    const namespace = data.namespaced
    Object.keys(getter).map(item => {
      let key = item
      if (namespace) {
        key = path.join('/').concat('/'+item)
      }
      Object.defineProperty(this.getter, key, {
        get: () => {
          return getter[item](this.state)
        }
      })
    })
    const otherModules = data.modules || {}
    if (Object.keys(otherModules).length > 0){
      Object.keys(otherModules).map(item => {
        setGetter(otherModules[item], path.concat(item))
      })
    }
  }
  setGetter(options)

```

我们可以总结来看，namespaces 加与不加的区别实际就下图；
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583461803685-ccad952c-0a93-46e3-8b02-873c3bb82f0d.png#align=left&display=inline&height=229&name=image.png&originHeight=586&originWidth=816&size=98837&status=done&style=shadow&width=319)![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583461828378-1d4db3ab-cdda-441e-bd5f-ec33a8f89b51.png#align=left&display=inline&height=135&name=image.png&originHeight=328&originWidth=880&size=49312&status=done&style=shadow&width=363)


具体数据转化方式有很多，核心就是对数据格式的处理，来进行发布与订阅；
## 
## actions & mutations
看到这，小伙伴怀疑了，actions 与 mutations，具体实现是一样的，那为什么要说 actions 可以异步执行，mutations，不能异步执行呢？下面我来贴一下核心代码。

```javascript
class Store{
  constructor () {
    ////..... 省略
    
  	if(this.strict){// 严格模式下才给报错提示
      this.vm.$watch(()=>{
          return this.vm.state // 我们知道 commit 是会出发 state 值修改的
      },function () {
	        // 此处监听 state 修改，因为在执行 commit 的时候 this._committing 是true 的，你若放了异步方法，this._committing 就会往下执行 变成 false
          console.assert(this._committing,'您异步调用了！')  // 断言  this._committing 为false, 给报错提示
      },{deep:true,sync:true});
    }
  }
  _withCommit(fn){
    const committing = this._committing; // 保留false
    this._committing = true; // 调用 mutation之前, this._committing 更改值是 true
    fn(); // 保证 执行的时候 this._committing 是 true
    this._committing = committing // 结束后重置为 false
  }
  commit = (mutationName, payload) => {
    console.log('1212',mutationName)
    this._withCommit(()=>{
      this.mutations[mutationName] && this.mutations[mutationName].map(fn => {
        fn(this.state, payload)
      })
    })
  }
}
```

## Vuex中的辅助方法
我们经常在 Vuex 中这样使用

```javascript
import {
  mapState,
  mapGetters
} from 'vuex'

computed: {
  isAfterSale () {
    return this.$route.meta.isAfterSale
  },
  ...mapGetters({
    messageState: 'message/getMessageState'
  }),
  ...mapGetters({
    messageNum: 'message/getMessageNum'
  }),
 ...mapGetters([
    'doneTodosCount',
    'anotherGetter',
    // ...
  ])
},
  
 methods: {
  ...mapActions([
    'increment', // 将 `this.increment()` 映射为 `this.$store.dispatch('increment')`

    // `mapActions` 也支持载荷：
    'incrementBy' // 将 `this.incrementBy(amount)` 映射为 `this.$store.dispatch('incrementBy', amount)`
  ]),
  ...mapActions({
    add: 'increment' // 将 `this.add()` 映射为 `this.$store.dispatch('increment')`
  })
}
```

### mapState

```javascript
export const mapState = (stateArr) => { // {age:fn}
    let obj = {};
    stateArr.forEach(stateName => {
        obj[stateName] = function () {
            return this.$store.state[stateName]
        }
    });
    return obj;
}

```

### mapGetters
```javascript
export function mapGetters(gettersArr) {
  let obj = {};
  gettersArr.forEach(getterName => {
      obj[getterName] = function () {
          return this.$store.getters[getterName];
      }
  });
  return obj
}
```

### mapMutations
```javascript
export function mapMutations(obj) {
  let res = {};
  Object.entries(obj).forEach(([key, value]) => {
      res[key] = function (...args) {
          this.$store.commit(value, ...args)
      }
  })
  return res;
}
```

### mapActions
```javascript
export function mapActions(obj) {
  let res = {};
  Object.entries(obj).forEach(([key, value]) => {
      res[key] = function (...args) {
          this.$store.dispatch(value, ...args)
      }
  })
  return res;
}
```

## 插件
> Vuex 的 store 接受 `plugins` 选项，这个选项暴露出每次 mutation 的钩子。Vuex 插件就是一个函数，它接收 store 作为唯一参数：


实际上 具体实现是发布订阅着模式，通过store.subscribe 将需要执行的函数保存到 store subs 中，
当 state 值发生改变时，this.subs(fn=>fn()) 执行。

```javascript
const vuePersists = store => {
 	let local = localStorage.getItem('VuexStore');
  if(local){
    store.replaceState(JSON.parse(local)); // 本地有则赋值
  }
  store.subscribe((mutation,state)=>{
    localStorage.setItem('VuexStore',JSON.stringify(state)); // state 发生变化执行
  });
}
const store = new Vuex.Store({
  // ...
  plugins: [vuePersists]
})
```

```javascript
class Store{
  constructor () {
		this.subs = []
		const setMoutations = (data, path = []) => {
      const mutations = data.mutations
      const namespace = data.namespaced
      Object.keys(mutations).map(mutationName => {
        let namespace = mutationName
        if (namespace) {
          namespace = path.join('/').concat('/'+mutationName)
        }
        this.mutations[namespace] = this.mutations[namespace] || []
        this.mutations[namespace].push((payload)=>{ // 之前是直接 push
        
        mutations[item](options.state, payload)
        
        this.subs.forEach(fn => fn({ // state 发生改变 则发布通知给插件
            type: namespace,
            payload: payload
          }, options.state));
          
        })
      })
      const otherModules = data.modules || {}
      if (Object.keys(otherModules).length > 0){
        Object.keys(otherModules).map(item => {
          setMoutations(otherModules[item], path.concat(item)) // path.concat 不会修改 path 原来的值
        })
      }
    }
    setMoutations(options)
    
  }
  subscribe(fn) {
    this.subs.push(fn);
	}
}

```

## State 处理
state 还没处理呢，别忘记我们 用户传入的 state 只是分module 传的，最终都要挂载到 state 中，见初始值和下图图片。实际上是数据格式转化，相信跟后端对接多的同学，考验处理数据格式的能力了。是的递归跑不了了。

- 初始值
```javascript
{
 state: {
    time: 1,
    userInfo: {
      avatar: '',
      account_name: '',
      name: ''
    },
  },
  modules: {
  	report: {
      state: {
        title: '',
      },
    },
    part: {
    	state: {
      	title: '',
    	},
			modules: {
        partChild: {
          state: {
            titleChild: '',
          },
        }
      }
    },
  }
}
```

- 转化称下面这种格式

![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583463779500-5584e56b-7c72-497c-a692-11ff95420fad.png#align=left&display=inline&height=554&name=image.png&originHeight=1108&originWidth=1174&size=216871&status=done&style=none&width=587)

可以看到核心方法还是 path, path.slice 来获取每次递归的父结点。
```javascript
 const setState = (data, path = []) => {
   if (path.length > 0) {
      let parentModule = path.slice(0, -1).reduce((next, prev)=>{
        return next[prev]
      }, options.state)
      Vue.set(parentModule, path[path.length - 1], data.state); // 为了 State 每个属性添加 get set 方法
    // parentModule[path[path.length - 1]] = data.state // 这样修改 Vue 是不会监听的
    }  
    const otherModules = data.modules || {}
    if (Object.keys(otherModules).length > 0){
      Object.keys(otherModules).map(item => {
        setState(otherModules[item], path.concat(item))
      })
    }
  }
  setState(options)
```

## 收集模块
原谅我，最重要的一块放到最后才说。上面所有方法都是基于用户传的 options (new Vuex.Store(options)) 来实现的。但是用户输入的我们怎能轻易相信，我们还是要对模块进行进一步格式处理，转化成我们需要的数据。转化成见下图。
![image.png](https://cdn.nlark.com/yuque/0/2020/png/424608/1583464498113-b0e6e29d-6899-4616-94e3-820ad4798868.png#align=left&display=inline&height=508&name=image.png&originHeight=1016&originWidth=1602&size=242023&status=done&style=none&width=801)

我们可以分析出收集模块，实际也是递归，转化成固定格式数据 _children、state、rawModule。
[直接看源码把](https://github.com/vuejs/vuex/blob/dev/src/module/module-collection.js) 核心代码是 register 方法，实际也是数据格式的转化。

## 总结
通篇看下来，还是需要自己手敲一下，在实践的过程中，才能发现问题(this 指向、父子结点判断、异步方法保存提示的巧妙)。当你明白具体实现，那每次使用就轻而易举了，每一步使用都知道干了什么的感觉真好。

