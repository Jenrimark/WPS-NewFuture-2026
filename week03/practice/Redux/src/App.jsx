import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { increment, decrement, decrementAsync } from "./store/actions";
import User from "./User";
import Test from "./Test";
const App = () => {
  const count = useSelector((state) => state.counter);
  const dispatch = useDispatch();
  return (
    <div>
      <h3>{count}</h3>
      <div>
        <button onClick={() => dispatch(increment(1))}>+1</button>
        <button onClick={() => dispatch(increment(5))}>+5</button>
        <button onClick={() => dispatch(decrement(1))}>-1</button>
        <button onClick={() => dispatch(decrement(5))}>-5</button>
        <button onClick={() => dispatch(decrementAsync(5))}>async -5</button>
      </div>
      <Test/>
      <User/>
    </div>
  );
};
export default App;