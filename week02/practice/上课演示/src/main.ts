import "@/css/index.css";
import "./less/index.less";
import { checkUserName, checkPassWord } from "./utils/check";

import imgObj from "./assets/logo.png";

(document.querySelector(".logo-img") as HTMLImageElement).src = imgObj;

document.querySelector(".login-btn")!.addEventListener("click", () => {
  const username = (document.querySelector(".username") as HTMLInputElement)
    .value;
  const password = (document.querySelector(".password") as HTMLInputElement)
    .value;

  if (!checkUserName(username)) {
    alert("用户名长度要大于等于8位");
    return;
  } else if (!checkPassWord(password)) {
    alert("密码长度要求大于等于6位");
    return;
  }

  console.log("用户名和密码长度符合要求");
});


const arr: number[] = [1, 2, 3];
const result: number[] = arr.map((val: number) => val + 1);
console.log(result);
console.log(result);
console.log(result);

import axios from "axios";
axios.get('https://jsonplaceholder.typicode.com/users').then(console.log)