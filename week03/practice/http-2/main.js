const http = require("http");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 8080;
const TODOS_URL = "https://jsonplaceholder.typicode.com/todos";

let todosCache = null;

async function getTodos() {
  if (todosCache) {
    return todosCache;
  }

  const response = await fetch(TODOS_URL);
  if (!response.ok) {
    throw new Error(`request failed: ${response.status} ${response.statusText}`);
  }

  const todos = await response.json();
  todosCache = todos.map((todo) => ({
    title: todo.title,
    userId: todo.userId,
    id: todo.id,
    completed: todo.completed,
  }));
  return todosCache;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/api/todo/list") {
      const todos = await getTodos();
      return sendJson(res, 200, todos);
    }

    if (req.method === "GET" && pathname.startsWith("/api/todo/detail/")) {
      const todoId = Number(pathname.replace("/api/todo/detail/", ""));
      if (!Number.isInteger(todoId) || todoId <= 0) {
        return sendJson(res, 400, { message: "todoid must be a positive integer" });
      }

      const todos = await getTodos();
      const todo = todos.find((item) => item.id === todoId);
      if (!todo) {
        return sendJson(res, 404, { message: "todo not found" });
      }
      return sendJson(res, 200, todo);
    }

    return sendJson(res, 404, { message: "route not found" });
  } catch (error) {
    return sendJson(res, 500, { message: "internal server error", detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`todo server running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `port ${PORT} is already in use. Stop the existing process or run with another port, e.g. PORT=8081 node week03/practice/http-2/main.js`
    );
    process.exit(1);
  }

  console.error("server start failed:", error.message);
  process.exit(1);
});
