const TODOS_URL = "https://jsonplaceholder.typicode.com/todos";

async function run() {
  const response = await fetch(TODOS_URL);
  if (!response.ok) {
    throw new Error(`request failed: ${response.status} ${response.statusText}`);
  }

  const todos = await response.json();
  for (const todo of todos) {
    console.log(
      `title: ${todo.title}, userId: ${todo.userId}, id: ${todo.id}, completed: ${todo.completed}`
    );
  }
}

run().catch((error) => {
  console.error("fetch todos failed:", error.message);
  process.exit(1);
});
