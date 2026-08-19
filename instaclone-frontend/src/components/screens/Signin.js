import React,{useState,useContext,} from 'react'
import {Link,useHistory} from 'react-router-dom'
import {UserContext} from '../../App'
import M from 'materialize-css'
import GoogleAuthButton from '../GoogleAuthButton'
import PasswordField from '../PasswordField'

const SignIn  = ()=>{
    const {dispatch} = useContext(UserContext)
    const history = useHistory()
    const [password,setPasword] = useState("")
    const [email,setEmail] = useState("")
    const PostData = ()=>{
        if(!/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)){
            M.toast({html:"That email does not look right",classes:"toast-error"})
            return
        }
        fetch("/signin",{
            method:"post",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                password,
                email
            })
        }).then(res=>res.json())
        .then(data=>{
            console.log(data)
           if(data.error){
              M.toast({html: data.error,classes:"toast-error"})
           }
           else{
               localStorage.setItem("jwt",data.token)
               localStorage.setItem("user",JSON.stringify(data.user))
               console.log(JSON.stringify(data.user))
               dispatch({type:"USER",payload:data.user})
               M.toast({html:"Signed in",classes:"toast-ok"})
               history.push('/')
           }
        }).catch(err=>{
            console.log(err)
        })
    }
   return (
      <div className="mycard">
          <div className="card auth-card input-field">
            <h2>Instaclone</h2>
            <input
            type="text"
            placeholder="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            />
            <PasswordField
            value={password}
            onChange={setPasword}
            autoComplete="current-password"
            />
            <button className="btn waves-effect waves-light"
            onClick={()=>PostData()}
            >
                Log in
            </button>
            <div className="auth-divider">OR</div>
            <GoogleAuthButton />
            <h6>
                <Link to="/signup">Dont have an account ?</Link>
            </h6>
            <h6>
                <Link to="/reset">Forgot password ?</Link>
            </h6>
    
        </div>
      </div>
   )
}


export default SignIn