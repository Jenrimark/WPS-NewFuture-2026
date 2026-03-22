// const http = require('http');
import http from 'node:http';
const server = http.createServer()
server.on('request', function (req, res) {
  // 1. 获取请求的 url 地址
  const url = req.url
  // 2. 设置默认的内容为 404 Not Found
  let content = '<h4>404 Not Found</h4>'
  // 3. 用户请求的是首页
  if (url === '/' || url === '/index.html') {
    content = '<h4>首页</h4>'
  } else if (url === '/about.html') {
    // 4. 用户请求的是关于我们页面
    content = '<h4>关于我们</h4>'
  }
  // 5. 设置 Content-Type 响应头，防止中文乱码
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // 6. 将内容发送给客户端
  res.end(content)
})

server.listen(3000, () => console.log(3000))