const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const cors = require("cors");

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 静态资源访问服务功能
app.use(express.static(path.join(__dirname, "public")));

app.get("/first", (req, res) => {
  res.send("Hello, AJAX");
});

app.get("/responseData", (req, res) => {
  res.send({ name: "WPS GET" });
});
app.post("/responseData", (req, res) => {
  res.send({ name: "WPS POST" });
});

app.get("/get", (req, res) => {
  res.send(req.query);
});

app.post("/post", (req, res) => {
  res.send(req.body);
});

app.post("/json", (req, res) => {
  res.send(req.body);
});

app.get("/readystate", (req, res) => {
  res.send("hello");
});

app.get("/error", (req, res) => {
  //console.log(abc); // 模拟 500
  res.status(400).send("not ok");
});

app.get("/cache", (req, res) => {
  fs.readFile("./test.txt", (err, result) => {
    res.send(result);
  });
});

app.listen(3000, () => console.log("server running at http://localhost:3000"));