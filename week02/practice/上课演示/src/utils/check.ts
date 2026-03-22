// src/utils/check.js
export const checkUserName = (uname: string) => {
  return uname.length >= 8;
};
export const checkPassWord = (pwd: string) => {
  return pwd.length >= 6;
};

export default {
  checkUserName,
  checkPassWord,
};