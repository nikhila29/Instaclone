import React,{useContext} from 'react'
import {GoogleLogin} from '@react-oauth/google'
import {useHistory} from 'react-router-dom'
import M from 'materialize-css'
import {UserContext} from '../App'

//shared by the Signin and Signup screens — the first google sign-in creates the account
const GoogleAuthButton = ()=>{
    const {dispatch} = useContext(UserContext)
    const history = useHistory()

    const onSuccess = (credentialResponse)=>{
        fetch("/google-login",{
            method:"post",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                //the google id token, verified server side before we trust the email
                credential:credentialResponse.credential
            })
        }).then(res=>res.json())
        .then(data=>{
            if(data.error){
                M.toast({html:data.error,classes:"toast-error"})
                return
            }
            localStorage.setItem("jwt",data.token)
            localStorage.setItem("user",JSON.stringify(data.user))
            dispatch({type:"USER",payload:data.user})
            M.toast({html:"Signed in with Google",classes:"toast-ok"})
            history.push('/')
        }).catch(err=>{
            console.log(err)
            M.toast({html:"Google sign-in failed",classes:"toast-error"})
        })
    }

    if(!process.env.REACT_APP_GOOGLE_CLIENT_ID){
        //without a client id the google button renders nothing, so say why
        return <h6 style={{color:"grey"}}>Google sign-in is not configured</h6>
    }

    return (
        <div style={{display:"flex",justifyContent:"center",margin:"10px 0px"}}>
            <GoogleLogin
                onSuccess={onSuccess}
                onError={()=>{
                    M.toast({html:"Google sign-in failed",classes:"toast-error"})
                }}
            />
        </div>
    )
}

export default GoogleAuthButton
