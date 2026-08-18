export const initialState = null

export const reducer = (state,action)=>{
    if(action.type==="USER"){
        return action.payload
    }
    if(action.type==="CLEAR"){
        return null
    }
    if(action.type==="UPDATE"){
        return {
            ...state,
            followers:action.payload.followers,
            following:action.payload.following
        }
    }
    if(action.type==="SAVED"){
        return {
            ...state,
            saved:action.payload
        }
    }
    if(action.type==="PRIVACY"){
        return {
            ...state,
            isPrivate:action.payload
        }
    }
    if(action.type==="UPDATEPIC"){
        return {
            ...state,
            pic:action.payload
        }
    }
    return state
}