// store: 整个数据的仓库，负责关联 reducer 和 action，通过 store 对象可以给 reducer 分配 action
import { createStore, applyMiddleware  } from 'redux'
import reducer from './reducers'
import { thunk } from 'redux-thunk'
const store = createStore(reducer, applyMiddleware(thunk))
export default store