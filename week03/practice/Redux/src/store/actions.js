import { INCREMENT, DECREMENT, UPDATENAME } from './actionType'
export const increment = (payload) => ({
  type: INCREMENT,
  payload,
})

export const decrement = (payload) => ({
  type: DECREMENT,
  payload,
})
export const updateName = (payload) => ({
  type: UPDATENAME,
  payload,
})

export const decrementAsync = (payload) => {
  return (dispatch) => {
    setTimeout(() => {
      dispatch(decrement(payload))
    }, 2000)
  }
}