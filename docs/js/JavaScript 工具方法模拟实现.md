# JavaScript 工具方法模拟实现

### 背景
还是只知然，而不知所以然么，抛开表面看本质，很多简单的不简单，很多难得不难；当把所有的难得简单的都分析完一遍，我们就能上一个台阶，而不是触碰到自己认知内的天花板。本文围绕着 `JavaScript`
中常见工具方法，进行的分析，从而模拟实现。本文主要围绕着深拷贝 、 扁平化 、 去重 、 Reduce 实现、 柯里化等的模拟实现，除了会用，更需要对其有更深刻的理解。

### 深拷贝
#### 例子

- 因为我们需要 a 的值，当直接将 a 给 b 的时候，再修改 b 的值，发现 a 也变了，因为 a， b 是引用类型的对象，存储的是地址，而不是具体的值，故相互赋值也是给的地址，一改全改。这是最基础的，都需要知道的现象；
```javascript
//------------------ 对象中的现象
var a = {
	name: 'a'
}

var b = a
b.name = 'b'
console.log(b.name) // -> 'b'
console.log(a.name) // -> 发现 a 也变成

//------------------ 数组中的现象
var arr = [1, 2, 3, [100], 5]
var target = arr.slice(3) // [[100], 5]
target[0][0] = 400 // [[400], 5]

console.log(arr) // [1, 2, 3, [400], 5] // 发现 arr 也改了。虽然 slice 返回的是一个新数组
```
#### 
#### 实现
```javascript
// 添加 cache 为了解决循环引用问题
// 使用 WeakMap 创建 cache 是为了防止内存泄露
function deepClone(value, cache = new WeakMap()) {
  if (value == undefined ) return value
  if (typeof value !== 'object') return value
  if (value instanceof RegExp) return new RegExp(value)
  if (value instanceof Date) return new Date(value)
  
  if (cache.get(value)) {
    return value;
  }
  const result = new value.constructor;
  cache.set(value, result)
  Object.keys(value).forEach(key => result[key] = deepClone(value[key], cache))
  return result;
}

// 循环引用例子
var temp = {}
var a = {
  a: temp
}
temp.value = a

var c = deepClone(a)
console.log(c)

```

### 扁平

```javascript
let arr = [1,2,3,4,[5,3,2,[2]], 100]
// 方案一：该方法会讲数组每一项变成 字符串，不推荐
const flatten = (arr) => arr.toString().split(',').map(item => +item)

 
// 方案二
const flatten = (arr, deep = 1) => {
  return arr.reduce((acc, cur) => {
    return Array.isArray(cur) && deep > 1 ? 
      [...acc, ...flatten(cur, deep - 1)] :
      [...acc, cur]
  }, [])
}
  
console.log(flatten(arr, 3)) // [1, 2, 3, 4, 5, 3, 2, 2, 100]
```

### 去重
去重复方法太多
#### ES6 Set 
```javascript
ar arr = [1,2,3,4,3,6]
function unique (arr) {
  return [...new Set(arr)]
}

function unique (arr) {
  return Array.from(new Set(arr))
}
```

#### includes
```javascript
var arr = [1,2,3,4,3,6]
function unique () {
  let tempArr = []
  for (var i = 0; i < arr.length; i++) {
   let value = arr[i]
   if (!tempArr.includes(value)) {
      tempArr.push(value)
    }
  }
  return tempArr
}
```

#### indexOf
```javascript
var arr = [1,2,3,4,3,6,3,2,120,10,10]
function unique () {
  let tempArr = []
  for (var i = 0; i < arr.length; i++) {
   let value = arr[i]
   if (tempArr.indexOf(value) === -1) {
      tempArr.push(value)
    }
  }
  return tempArr
}
```

#### 运用 obj 属性

```javascript
var arr = [1,2,3,4,3,6,3,2,120,10,10]
function unique () {
  let tempArr = {}
  let target = []
  for( var i = 0; i < arr.length; i++) {
   let value = arr[i]
   if (!tempArr[value]) {
      tempArr[value] = true
      target.push(value)
   }
  }
  return target
}
unique(arr)
```

#### splice

```javascript
var arr = [1,2,3,4,3,6,3,2,120,10,10]
function unique(array){
    let temp = [];
    let l = array.length;
    for (let i = 0; i < l; i++) {              
        for (let j = i + 1; j < l; j++) {       
            if (array[i] === array[j]) {       
                arr.splice(j, 1)
                l--
                j--
            }
        }
        temp.push(array[i]);
    }
    return temp;
}
unique(arr)
```

#### array 原数组

```javascript
var arr = [1,2,3,4,3,6,3,2,120,10,10]
function unique(array){
    let temp = [];
    let l = array.length;
    for (let i = 0; i < l; i++) {              
        for (let j = i + 1; j < l; j++) {       
            if (array[i] === array[j]) {     
                i++     
                j = i
            }
        }
        console.log(i)
        temp.push(array[i]);
    }
    return temp;
}
unique(arr)
```

### 柯里化

- 判断当面参数类型
```javascript
// 原理是利用闭包把传入参数保存起来，当传入参数的数量足够执行函数时，就开始执行函数
function isType (type) {
  return function (target) {
    return `[object ${type}]` === Object.prototype.toString.call(target)
  }
}
// 上面方法还不会简写成 ES6 么
const isType = type => target => `[object ${type}]` === Object.prototype.toString.call(target)
```

### 反柯里化

```javascript
Function.prototype.unCurrying = function(){
    var self = this;
    return function(){
        return Function.prototype.call.apply(self, arguments);
    }
}
// 使用
var objShow = Toast.prototype.show.unCurrying();
objShow(obj);
```

### reduce 实现
```javascript
Array.prototype.myReduce = function (fn, arg) {
  var result = arg;
  for(let i = 0; i < this.length - 1; i++) {
    if(i==0) {
       result = fn(result + this[i], this[i+1])
    } else {
       result = fn(result, this[i+1])
    }
  }
  return result
}

var arr = [1,2,3,3]
var a = arr.myReduce((prev, next) => {
  return prev + next
}, 0)
// console.log(a) // 9


Array.prototype.reduce = function(callback,prev){
    // this = [1,2,3]
    for(let i = 0; i< this.length;i++){
       if(prev == undefined){
           // this[i] = 1  this[i+1] = 2
         prev = callback(this[i],this[i+1],i+1,this);
         i++;
       }else{
         prev = callback(prev,this[i],i,this);
       }
    }
    return prev;
};
```

### compose 
#### reduceRight
```javascript
function fn1 (a, b) {
  return a + b;
}
function fn2 (value) {
  return value * 100
}
function fn3 (value) {
  return value + 1000
}

// var result = fn3(fn2(fn1(1, 2)))
// console.log(result)
// 第一种
function compose (...fn) {
  return function (...args) {
     const lastFn = fn.pop()
     return fn.reduceRight((next, prev)=>{
        return prev(next)
     }, lastFn(...args))
  }
}
var result = compose(fn3, fn2, fn1)(1, 2)
console.log(result)

```
#### reduce 

- 已经看到这里了么，仔细看；
```javascript
function fn0 (a, b) {
  return a - b;
}
function fn1 (value) {
  return value + 1
}
function fn2 (value) {
  return value * 100
}
function fn3 (value) {
  return value + 1000
}

// var result = fn3(fn2(fn1(1, 2)))
// console.log(result)

function compose (...fn) {
   return fn.reduce((next, prev) => {
      return (...args) => {
         return next(prev(...args))
      }
   })
}

// 考验 es6 简写时刻到了
const compose = (...fn) => fn.reduce((next, prev) => (...args) => next(prev(...args)))

var result = compose(fn3, fn2, fn1, fn0)
var result2 = result(10, 2)
console.log(result2)

```

### 总结
还有好多方法去实现，后期补充；
