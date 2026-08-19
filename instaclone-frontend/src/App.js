import React,{useEffect,createContext,useReducer,useContext} from 'react';
import Sidebar from './components/Sidebar'
import "./App.css"
import {BrowserRouter,Route,Switch,useHistory} from 'react-router-dom'
import Home from './components/screens/Home'
import Signin from './components/screens/Signin'
import Profile from './components/screens/Profile'
import Signup from './components/screens/Signup'
import CreatePost from './components/screens/CreatePost'
import {reducer,initialState} from './reducers/userReducer'
import UserProfile from './components/screens/UserProfile'
import SubscribedUserPosts from './components/screens/SubscribesUserPosts'
import Reset from './components/screens/Reset'
import NewPassword from './components/screens/Newpassword'
import Admin from './components/screens/Admin'
import Saved from './components/screens/Saved'
import Settings from './components/screens/Settings'
import Messages from './components/screens/Messages'


export const UserContext = createContext()


const Routing = ()=>{
  const history = useHistory()
  const {dispatch} = useContext(UserContext)
  useEffect(()=>{
    const user = JSON.parse(localStorage.getItem("user"))
    if(user){
      dispatch({type:"USER",payload:user})
    }else{
      //routes you must be able to reach while signed out
      const publicPaths = ['/signin','/signup','/reset']
      const path = history.location.pathname
      if(!publicPaths.some(publicPath=>path.startsWith(publicPath)))
           history.push('/signin')
    }
    //runs once on mount: this restores the stored session, it must not re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  
  return(
    <Switch>
      <Route exact path="/" >
      <Home />
      </Route>
      <Route path="/signin">
        <Signin />
      </Route>
      <Route path="/signup">
        <Signup />
      </Route>
      <Route exact path="/profile">
        <Profile />
      </Route>
      <Route path="/create">
        <CreatePost/>
      </Route>
      <Route path="/profile/:userid">
        <UserProfile />
      </Route>
      <Route path="/myfollowingpost">
        <SubscribedUserPosts />
      </Route>
      <Route path="/admin">
        <Admin />
      </Route>
      <Route path="/saved">
        <Saved />
      </Route>
      <Route path="/settings">
        <Settings />
      </Route>
      <Route path="/messages">
        <Messages />
      </Route>
      <Route exact path="/reset">
        <Reset/>
      </Route>
      <Route path="/reset/:token">
        <NewPassword />
      </Route>
      
    </Switch>
  )
}

function App() {
  const [state,dispatch] = useReducer(reducer,initialState)
  return (
    <UserContext.Provider value={{state,dispatch}}>
    <BrowserRouter>
      <Sidebar />
      <div className="app-shell">
        <Routing />
      </div>
    </BrowserRouter>
    </UserContext.Provider>
  );
}

export default App;