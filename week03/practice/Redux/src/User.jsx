import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateName } from "./store/actions";
export default function User() {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  return (
    <>
      <div>
        User: {user.name} {user.age}
      </div>
      <button onClick={() => dispatch(updateName("xxxx"))}>update</button>
    </>
  );
}
