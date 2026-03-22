// 1. 普通函数中的 this 谁调用就是谁（非严格模式，严格模式是 undefined）

function foo() {
	// this => window
}
foo() // window.foo()


var age = 19
const o = {
	age: 18,
	foo() {
	    // this => o
		console.log(this.age) // 18
	},
}

o.foo()

const xxx = o.foo
xxx() // window.xxx()

// 2. 箭头函数没有 this，取决于外部环境

// 3. 定时器中的 this 就是 window

setInterval(function() {
	console.log(this) // window
})

// 4. 构造函数中的 this 就是实例对象

function Person() {
	console.log(this) // p
}
const p = new Person()