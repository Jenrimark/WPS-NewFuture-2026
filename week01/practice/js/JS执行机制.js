// 事件循环 / 事件环 / Event Loop
// JS 是单线程的
// 1. JS 代码的执行分为同步代码和异步代码
// 2. 当碰到同步代码的时候会直接在执行栈中执行
// 3. 当碰到异步代码，并且时机成熟的时候（例如定时器的时间到了），就会把异步代码放到任务队列中
// 4. 【当执行栈中的同步代码执行完毕后】，就会去任务队列中取异步代码并放到执行栈中执行，这种反复去任务队列中取异步代码放到执行栈中执行的操作就是 EventLoop

/* console.log(1)
setTimeout(function() {
	console.log(2)
})
console.log(3) */

// 问题：一定是 1s 到了准时打印吗
setTimeout(function() {
	console.log(1)
}, 1000)
// ...


/* const sum = (a, b) => {
	// ...
	setTimeout(() => {
		return a + b
	})
	// return undefined
}
const r = sum(1, 2)
console.log(r) */

1. 回调

const sum = (a, b, callback) => {
	setTimeout(() => {
		const r = a + b
		callback(r)
	}, 1000)
}

sum(1, 2, function(result) {
	console.log(result)
})

问题：回调地域

sum(1, 2, function(result) {
	sum(1, result, function(result) {
		sum(1, result, function(result) {
			console.log(result)
		})
	})
})


2. Promise，解决了回调地域

const sum = (a, b) => {
	return new Promise(resolve => {
		setTimeout(() => {
			const r = a + b
			resolve(r)
		}, 1000)
	})
}

sum(1, 2).then(r => {
	return sum(1, r)
}).then(r => {
	return sum(1, r)
}).then(r => {
	console.log(r)
})

问题：并不能简化代码

3. Async/await

async function foo() {
	const r1 = await sum(1, 2)
	const r2 = await sum(1, r1)
	const r3 = await sum(1, r2)
	console.log(r3)
}
foo()