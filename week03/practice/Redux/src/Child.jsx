const Child = (props) => {
  return <div style={{ border: "1px solid red" }}>
    子：{props.salary}
    <button onClick={() => props.updateSalary(1)}>涨工资</button>
    <button onClick={() => props.updateSalary(-1)}>降工资</button>
    </div>;
};

export default Child;