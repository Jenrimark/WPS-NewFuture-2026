const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());

// 最佳实践：同一接口通过不同 event 承载不同功能
const EVENT_TYPES = {
  未读消息: { event: "未读消息", data: "你有一条未读消息" },
  订单更新: { event: "订单更新", data: "订单 #10086 已发货" },
  系统通知: { event: "系统通知", data: "系统将于今晚 22:00 维护" },
};

app.get("/api/sse", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let tick = 0;
  const eventKeys = Object.keys(EVENT_TYPES);

  const intervalId = setInterval(() => {
    const key = eventKeys[tick % eventKeys.length];
    const { event, data } = EVENT_TYPES[key];
    // 先写 event 类型，再写 data，\n\n 表示本条消息结束
    res.write(`event: ${event}\n`);
    res.write(`data: ${data}\n\n`);
    tick++;
  }, 2000);

  res.on("close", () => {
    console.log("客户端断开连接");
    clearInterval(intervalId);
    res.end();
  });
});

app.listen(3000, () => console.log("http://localhost:3000"));