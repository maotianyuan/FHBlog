# JavaScript 原生方法模拟实现

# 背景
还是只知然，而不知所以然么，抛开表面看本质，很多简单的不简单，很多难得不难；当把所有的难得简单的都分析完一遍，我们就能上一个台阶，而不是触碰到自己认知内的天花板。本文围绕着 `JavaScript`
中常见方法，进行的分析，从而模拟实现。本文主要围绕着 `call` 、 `apply` 、 `bind` 、 `instanceof` 、 `new`  等的模拟实现，除了会用，更需要对其有更深刻的理解。

# call
> call 修改 this 指向，并执行当前函数

- 实例
```javascript
var name = 'window name'

var dog = {
  name: 'dog name',
  getDog: function () {
    console.log(this.name, [...arguments])
  }
}

var cat = {
  name: 'cat name',
  getCat: function () {
    console.log(this.name, [...arguments])
  }
}

cat.getCat.call(dog, 1, 3); // "dog name"

dog.getDog.call(cat, 4, 5, 6); // "cat name"


```

- 模拟实现
```javascript
Function.prototype._call = function (context = window, ...args) {
  if (typeof this !== 'function') {
    throw new TypeError('Error')
  }
  
  const key = Symbol() // 为 context 创建唯一的属性 key, 防止与 context 内部本身属性冲突
  
	// 已知 this = cat.getCat = function () {...}
  // context[key] = this, 等价于下面
  // var dog = {
  //  name: 'dog name',
  //  getDog: function () {
	//  	console.log(this.name, [...arguments])
  //	},
  // 	getCat: function () {
  //		console.log(this.name, [...arguments])
  // 	}
	// }
  context[key] = this 
  
  // 下一步执行 context 新增实例[key] 新方法， 因为此时这个方法已经放到了 dog 身上，所以等价于 dog.getCat()
  // dog 对象中 this 指向它本身，所以打印出 this.name = 'dog name'
  // 在此需要对 this 指向有很深的理解，this 永远指向 最后调用 它的那个对象
  const result = context[key](...args)
  
  // 最后删除为 context 添加的新属性 key
  delete context[key]
  
  // 函数有可能会有返回值，也需要一并返回
  return result
}

```

```javascript
function a () {
  console.log('a')
}
function b () {
	console.log('b')
}
a.call(b) // 打印出 a ,即让 a 执行 【改变 this 指向】

a.call.call.call(b) // 打印出 b, 让 b 执行 【当前函数执行后，a.call 已经返回 b，所以 b.call.call(b) 执行的是 b】
```

# apply
> apply 修改 this 指向，与 call 区别仅在于参数传递方式

- 实例
```javascript
var name = 'window name'

var dog = {
  name: 'dog name',
  getDog: function () {
    console.log(this.name, [...arguments])
  }
}

var cat = {
  name: 'cat name',
  getCat: function () {
    console.log(this.name, [...arguments])
  }
}

cat.getCat.apply(this); // "window name"

cat.getCat.apply(dog, [1], 3); // "dog name" [1]

dog.getDog.apply(cat, [4, 5, 6]); // "cat name" [4, 5, 6]


```

- 模拟实现
```javascript
function isArray(target) {
  return '[object Array]' === Object.prototype.toString.call(target);
}

Function.prototype._apply = function (context = window, args) {
  if (typeof this !== 'function') {
    throw new TypeError('Error')
  }
  
  if (!isArray(args)){
    throw new TypeError('Error')
    return false
  }
  // 与 call 解析一致 区别仅在参数解析方式
  const key = Symbol()
  context[key] = this 
  const result = context[key](...args)
  delete context[key]
  return result
}

```

# bind
> bind 修改 this 指向，与 call、apply 区别在于，bind调用返回的是一个新函数，如果被 new ，当前函数的 this 是实例；new 出来结果可以找到原有类的原型；

- 实例

```javascript
var name = 'window name'

var dog = {
  name: 'dog name',
  getDog: function () {
    console.log('getDog', this.name, [...arguments])
  }
}

var cat = {
  name: 'cat name',
  getCat: function () {
    console.log('getCat', this.name, [...arguments])
  }
}

cat.getCat.bind(this)(); // "window name"

cat.getCat.bind(dog, 10)(1, 3, 4); // "dog name" [10, 1, 3, 4]

dog.getDog.bind(cat)([4, 5, 6], 7); // "cat name" [[4, 5, 6], 7]

var factory = dog.getDog.bind(cat, 1)
var fac = new factory()
fac.name = 'fac name'
console.log(fac) //  { name : 'fac name'}

```

- 模拟实现
```javascript
Function.prototype._bind = function (context = window, ...args) {  
  const _this = this
  return function F() {
    // 需要知道：bind 返回的是一个函数，函数可能被 new, 作为构造函数被调用，如上实例 new factory()
    // 此事 this 失效，需要指向 fac 实例对象，
    if (this instanceof F) { 
      return new _this(...args, ...arguments) //等价于 new dog.getDog()
    }
    return _this.apply(context, args.concat(...arguments))
  }
  return F;
}
```

或者

```javascript
var name = 'window name'

function Dog () {
  console.log('dog', [...arguments])
}
Dog.prototype.getDog = function () {
  console.log('getDog')
}

var cat = {
  name: 'cat name',
  getCat: function () {
    console.log('getCat', this.name, [...arguments])
  }
}

Function.prototype._bind = function (context) {
  var _this = this;
  var bindArg = Array.prototype.slice.call(arguments, 1)
  function Fbind () {
    var arg = Array.prototype.slice.call(arguments)
    return _this.call(this instanceof Fbind ? this : context, ...bindArg, ...arg)
  }
  // 保留原有类的原型，既 Dog.prototype.中的 如（getDog 等) 方法
  function Fn () {}
  Fn.prototype = this.prototype;
  Fbind.prototype = new Fn()
  /**
   	var obj = {}
  	obj.__proto__ = this.prototype;
	  Fbind.prototype = obj
  **/
  return Fbind
}


var factory = Dog._bind(cat, 1)

var fn = new factory() // 通过 new 这种方式，Dog.prototype.getDog 需要被继承

console.log(fn.getDog)

```

# 原型 / 构造函数 / 实例
> 为方便下面对 new instanceof 理解，需要提前对原型链有深的理解和实例、构造函数、原型对象之间的关系的理解

```javascript
// 创建对象的4种方式
var o1 = {name: 'o1'}

var o2 = new Object({name: '02'})

function O3(){
  this.name = 'o3'
}
var o3 = new O3()

var P = {name: 'o4'}
var o4 = Object.create(P)
o4.__propto__ = P

// 实例：有 o1 o2 o3 o4
// 构造函数：有 O3 【任何一个函数只要被new使用了，就可称之为构造函数】
// 原型对象： O3.prototype
// 实例属性： o1.__proto__ o2.__proto__ o3.__proto__ o4.__proto__

// 实例 === 构造函数 
console.log(o3.__proto__.constructor === O3)

// 构造函数 === 原型对象
console.log(O3.prototype.constructor === O3)

// 实例 === 原型对象
console.log(o3.__proto__ === O3.prototype)

// 只有实例对象才有__proto__ 构造函数也有__proto__
// 只有构造函数有prototype属性


// 原型链
// 		原型链是由原型对象组成，每个对象都有 __proto__ 属性，
// 		指向了创建该对象的构造函数的原型，__proto__ 将对象连接起来组成了原型链。
// 		是一个用来 实现继承和共享属性 的有限的对象链
```

# new
> 构造函数的实现创建对象
> 属性创建，原型方法创建

```javascript
function myNew (context) {
   var obj = {} // 创建空对象
   let context = [].shift.call(argument)
   obj.__proto__ = context.prototype // 设置原型链 //obj = Object.create(context.prototype)
   var result = context.call(obj, argument) // 通过 call 为空对象添加属性 
   return result instanceof Object ? result : obj //返回值类型是否为对象，如果是对象，就使用构造函数的返回值，否则返回创建的对象
}

function Animation () {
  this.name = 'animation'
}

var cat = myNew(Animation)
console.log(cat)

```

# Object.create 

```javascript
function Create(protoType) {
	function Fn () {}
  Fn.prototype = prototype
  return new Fn();
}
```

# instanceof
> 在看具体实现之前，你需要提前对原型链有深刻理解

- 模拟实现

```javascript
function _instanceof (left, right) {
  let leftValue = left.__proto__
  let rightValue = right.prototype
  while(true) {
    if (leftValue === null) {
      return false
    }
    if (leftValue === rightValue) {
      return true
    }
    leftValue = leftValue.__proto__ // 通过实例属性一层层往上找
  }
}
```


# 继承
## call
> 子类无法继承父类的原型 prototype 的方法

```javascript
function Animate(name) {
  this.name = name
}
Animate.prototype.getName = function() {
  return this.name
}
function Cat(food) {
  this.food = food
  Animate.call(this) // Animate.prototype 的原型方法调用不了
}
Cat.prototype.getFood = function () {
  this.food = food
}
var cat = new Cat('first')
```

## 原型链
> 子类可以引用父类的实例属性，但是需要绑定的时候，传值，否则为undefined，灵活度不高, 不同实例中属性值改变会相互影响 原因：原型链的对象不同实例中是共用的既：cat1.**proto**.name = 'cat1' 一改都改


```javascript
function Animate(name) {
  this.name = name
}
Animate.prototype.getName = function() {
  return this.name
}
function Cat(food, name) {
  this.food = food
}
Cat.prototype = new Animate('cat');
Cat.prototype.constructor = Cat

Cat.prototype.getFood = function () {
  return this.food
}
var cat1 = new Cat('first')
var cat2 = new Cat('cat2')
```

## 组合模式-寄生

```javascript
function Animate(name) {
  this.name = name
}
Animate.prototype.getName = function() {
  return this.name
}
function Cat(food, name) {
  this.food = food
  Animate.call(this, name)
}

Cat.prototype = new Animate(); // 第一种1

// Cat.prototyoe.__proto__ = Animate.prototype; // 第二种 2 低版本IE 不支持
// 上一句等于家 Object.setPrototype(Cat.prototyoe, Animate.prototype)

// Cat.prototype = Object.create(Animate.prototype) //  第三种 3
Cat.prototype.constructor = Cat

Cat.prototype.getFood = function () {
  return this.food
}
var cat = new Cat('first', 'cat')
```

## ES6

```javascript
class Animate {
  constructor(foo) {
    this.foo = foo
  }
  getFood() {
    console.log(this.foo)
  }
}
class Cat extends Animate {
  constructor(foo, bar) {
    super(foo)
    this.bar = bar
  }
}
```

## ES6 实现 ES5中的类

```javascript
function defineProperties(target, props) {
  for ( var i = 0 ; i < props.length; i++) {
    let property = props[i];
    Object.defineProperty(target, property.key, { // 核心
      enumerable: false,
      configurable: true,
      ...property
    })
  }
}

function createClass (obj , protoProps, staticProps) {
  Array.isArray(protoProps) && defineProperties(obj.prototype, protoProps)
  Array.isArray(staticProps) && defineProperties(obj, staticProps)
}
var Animate = (function(){
  function Animation() {
    this.name = 'name test'
    this.food = 'food test'
    if (!(this instanceof Animation)) {
      return new Error('no new')
    }
     createClass(Animation, [
      {
        key: 'getName',
        value: function () {
          console.log(this.name)
        }
      },
      {
        key: 'getFood',
        value: function () {
          console.log(this.food)
        }
      }
    ], [
      {
        key: 'staticName',
        value: 'test static name'
      },
    ])
  }
  return Animation;
}())

var cat = new Animate()

console.log(Animate.prototype) // 不可枚举
console.log(cat.getName()) // name test
console.log(Animate.staticName) // test static name
```

# 工具
[JSBin](https://jsbin.com/) 模拟练习
