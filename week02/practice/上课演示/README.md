# FormData

处理文件上传，https://developer.mozilla.org/zh-CN/docs/Web/API/FormData/FormData

# 区分 AJAX 状态码和 HTTP 状态码

HTTP

200
301
302
304

400 请求参数错误

401 用于用户认证失败造成的“没有权限”，Token 过期、无效

403 没有权限

404 

405 请求方式错误

# Fetch 和 Axios（实际用的多）

```js
fetch('https://www.wps.cn/ping').then(r => r.text()).then(console.log)
```

# NVM / [n](https://www.npmjs.com/package/n)

Node 版本管理工具。

```bash
nvm list available
nvm install 22.18.0
nvm use 22.18.0
node -v # 22.18.0
```

# NPM

包管理工具，装完 Node 之后自带的，和它对应的还有一个[包管理平台](https://www.npmjs.com/)。

```bash
npm i mime # 源在国外，慢
```

# NRM

源管理工具，可以很方便的切换源，例如切换到 taobao

```bash
npm i -g nrm
nrm ls
nrm use taobao
```

# NPX

NPM5.2 版本之后提供的一个内置命令，通过这个命令可以直接执行 node_modules/.bin 下面的一些命令工具。

# nodemon

实时检测 js 代码的变化。

```bash
npm i -g nodemon
nodemon index.js


npm i # 安装 package.json 中的所有依赖包
```

# pnpm（趋势）

快，节省磁盘空间！

# 模块化

CommonJS（Node.js），通过 require 引入，通过 module.exports 暴漏。

ESM（ESMAScript Module）：通过 export / export default 导出，通过 import 引入（大一统）。


