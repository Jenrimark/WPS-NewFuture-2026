let age = 18
function fn(age) {
    // 形参也是局部变量
	age = 19
}
fn(age)
console.log(age) // 18


let num = 10
function bar() {
	num = 20
}
bar(num)
console.log(num) // 20


let arr = [8]
function test(arr) {
    // 传递的复杂数据类型，传递的是地址/引用
    // 对引用的修改，不会影响外部
	arr = [8, 9]
}
test(arr)
console.log(arr) // [8]


let xxx = [8]
function foo(xxx) {
	// 传递的复杂数据类型，传递的是地址/引用
    // 对内容的修改，会影响外部
	xxx.push(9)
}
foo(xxx)
console.log(xxx) // [8, 9]