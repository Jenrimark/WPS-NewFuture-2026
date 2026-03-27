import React, { useState } from "react";
import Child from "./Child";

export default function Parent() {
  const [salary, setSalary] = useState(11.46);
  const updateSalary = (s) => {
    setSalary(salary + s)
  };
  return (
    <div style={{ border: "1px solid gray", padding: 20, width: 300 }}>
      <h3>父：平均工资 {salary}</h3>
      <Child salary={salary} updateSalary={updateSalary}></Child>
    </div>
  );
}