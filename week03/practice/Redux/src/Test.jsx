import React, { memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { increment } from "./store/actions";
export default memo(function Test() {
  const state = useSelector((state) => state.counter);
  const dispatch = useDispatch();
  console.log(1);
  return (
    <div>
      Test
      {state}
      <button onClick={() => dispatch(increment(1))}>update</button>
    </div>
  );
});
