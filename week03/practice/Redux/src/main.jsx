import React from "react";
import ReactDOM from "react-dom/client";
import store from './store';
import { Provider } from "react-redux";
import App from './App';

// React 根节点
const root = ReactDOM.createRoot(document.getElementById("root"));

// 渲染 React 元素
root.render(<Provider store={store}><App/></Provider>);
// root.render(App());
