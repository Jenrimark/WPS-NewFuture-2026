// 匈牙利命名法简版
// 数据类型 + 语义
// a => arr
// o => oDiv => Object
// n => nAge => 18
// aA => 伪/类数组 => 
// 1. 能够通过索引获取元素
// 2. 具有 length 属性
// 3. 但是没有真数组相关的方法
const aA = document.querySelectorAll('.nav a')

let nIndex = 0
if(localStorage.getItem('nIndex')) {
  nIndex = parseInt(localStorage.getItem('nIndex'))
  aA[nIndex].style.color = 'red'
}
// NodeList
aA.forEach((item, index) => {
  // item => DOM 对象 => 是对象就可以通过点增加属性
  // item.index = index
  item.setAttribute('data-index', index)
  // 事件三要素：按下（事件类型）开关（事件源）灯亮了（事件处理函数）
  item.addEventListener('click', (e) => {
    // e => event => 事件对象
    // preventDefault() => 阻止默认行为
    e.preventDefault()

    aA[nIndex].style.color = '#333'
    item.style.color = 'red'

    // nIndex = item.index
    nIndex = item.getAttribute('data-index')
    localStorage.setItem('nIndex', nIndex)
  })
})


// 事件委托：把平常给每一个元素绑定事件的操作统一绑定到祖先元素身上
// 原理：事件冒泡
// 好处：性能高、对后续新增的元素同样具有事件绑定的效果



/* const oNav = document.querySelector('.nav')

oNav.addEventListener('click', (e) => {
  e.preventDefault()
  // 把其他元素的颜色改回#333
  // e.target => 点谁就是谁
  // e.currentTarget => 事件绑定的元素
  if(e.target.tagName === 'A') {
    e.target.style.color = 'red'
  }
}) */



// oNav.onclick = function() {}