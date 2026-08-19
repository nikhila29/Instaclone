import React,{useState,useEffect} from 'react'
import {Link,useHistory} from 'react-router-dom'
import M from 'materialize-css'
import uploadImage from '../../uploadImage'
import GoogleAuthButton from '../GoogleAuthButton'
import PasswordField from '../PasswordField'
const SignIn  = ()=>{
    const history = useHistory()
    const [name,setName] = useState("")
    const [password,setPasword] = useState("")
    const [email,setEmail] = useState("")
    const [username,setUsername] = useState("")
    const [image,setImage] = useState("")
    const [url,setUrl] = useState(undefined)
    useEffect(()=>{
        if(url){
            uploadFields()
        }
        //fires when the upload finishes; uploadFields is redefined every render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[url])
    const uploadPic = ()=>{
        uploadImage(image)
        .then(hostedUrl=>{
           setUrl(hostedUrl)
        })
        .catch(err=>{
            console.log(err)
            //without this the upload failure is silent and signup never happens
            M.toast({html:err.message || "Could not upload the picture",classes:"toast-error"})
        })
    }
    const uploadFields = ()=>{
        if(!name || !password){
            M.toast({html:"Please fill in every field",classes:"toast-error"})
            return
        }
        if(!/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)){
            M.toast({html:"That email does not look right",classes:"toast-error"})
            return
        }
        fetch("/signup",{
            method:"post",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                name,
                username,
                password,
                email,
                pic:url
            })
        }).then(res=>res.json())
        .then(data=>{
           if(data.error){
              M.toast({html: data.error,classes:"toast-error"})
           }
           else{
               M.toast({html:data.message,classes:"toast-ok"})
               history.push('/signin')
           }
        }).catch(err=>{
            console.log(err)
        })
    }
    const PostData = ()=>{
        if(image){
            uploadPic()
        }else{
            uploadFields()
        }
       
    }

   return (
      <div className="mycard">
          <div className="card auth-card input-field">
            <h2>InstaClone</h2>
            <input
            type="text"
            placeholder="name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            />
            <input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e)=>setUsername(e.target.value.toLowerCase())}
            />
            <p className="field-hint">letters, numbers, dots and underscores — leave blank and we pick one</p>
            <input
            type="text"
            placeholder="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            />
            <PasswordField
            value={password}
            onChange={setPasword}
            autoComplete="new-password"
            />
            <div className="file-field input-field">
            <div className="btn">
                <span>Profile photo</span>
                <input type="file" onChange={(e)=>setImage(e.target.files[0])} />
            </div>
            <div className="file-path-wrapper">
                <input className="file-path validate" type="text" />
            </div>
            </div>
            <button className="btn waves-effect waves-light"
            onClick={()=>PostData()}
            >
                Sign up
            </button>
            <div className="auth-divider">OR</div>
            <GoogleAuthButton />
            <h5>
                <Link to="/signin">Already have an account ?</Link>
            </h5>
             
               
         
            
    
        </div>
      </div>
   )
}


export default SignIn