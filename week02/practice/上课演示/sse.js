const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());

const arr = ["金", "山", "办", "公", "W", "P", "S"];

app.get("/api/sse", (req, res) => {
  // #1 设置响应头
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8"
  });
  let counter = 0;
  // #2 每 1000 秒给前端发送 arr 里的一个字，前端逐步拼接
  const intervalId = setInterval(() => {
    // #3 以 data: 开头（这样才会触发前端的 onmessage 事件），\n\n → 固定，表示“本条消息结束”
    res.write("data:" + arr[counter] + "\n\n");
    counter++;
    if (counter >= arr.length) {
      clearInterval(intervalId);
    }
  }, 1000);

  res.on("close", () => {
    console.log("客户端断开连接");
    clearInterval(intervalId);
    res.end();
  });
});

app.listen(3000, () => console.log("http://localhost:3000"));