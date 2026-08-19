import React,{useContext,useState} from 'react'
import {Link,useHistory} from 'react-router-dom'
import M from 'materialize-css'
import {closeSocket} from '../../socket'
import {UserContext} from '../../App'

/*
 * Settings, laid out like Instagram's: a list of sections on the left and the
 * chosen one on the right. Account privacy is the only section with real
 * settings behind it so far.
 */
const Settings = ()=>{
    const {state,dispatch} = useContext(UserContext)
    const history = useHistory()
    const [section,setSection] = useState("privacy")
    const [saving,setSaving] = useState(false)

    const togglePrivacy = (isPrivate)=>{
        setSaving(true)
        fetch('/privacy',{
            method:"put",
            headers:{
                "Content-Type":"application/json",
                "Authorization":"Bearer "+localStorage.getItem("jwt")
            },
            body:JSON.stringify({isPrivate})
        })
        .then(res=>res.json())
        .then(updated=>{
            setSaving(false)
            if(updated.error){
                M.toast({html:updated.error,classes:"toast-error"})
                return
            }
            //the stored session drives what the rest of the app shows
            localStorage.setItem("user",JSON.stringify({
                ...state,
                isPrivate:updated.isPrivate,
                followers:updated.followers
            }))
            dispatch({type:"PRIVACY",payload:updated.isPrivate})
            M.toast({
                html:updated.isPrivate
                    ? "Your account is private"
                    : "Your account is public — pending requests were accepted",
                classes:"toast-ok"
            })
        })
        .catch(err=>{
            setSaving(false)
            console.log(err)
        })
    }

    return (
        <div className="page settings-page">
            <div className="settings-nav">
                <h4>Settings</h4>
                <p className="settings-group">Who can see your content</p>
                <button
                    className={section === "privacy" ? "settings-item active" : "settings-item"}
                    onClick={()=>setSection("privacy")}
                >
                    <i className="material-icons">lock</i> Account privacy
                </button>
                <p className="settings-group">How you use Instaclone</p>
                <Link className="settings-item" to="/profile">
                    <i className="material-icons">person</i> Your profile
                </Link>
                <Link className="settings-item" to="/saved">
                    <i className="material-icons">bookmark_border</i> Saved
                </Link>
                <div className="settings-divider"></div>
                <button className="settings-item danger" onClick={()=>{
                    //drop the websocket too, so it does not reconnect as the old user
                    closeSocket()
                    localStorage.clear()
                    dispatch({type:"CLEAR"})
                    history.push('/signin')
                }}>
                    <i className="material-icons">logout</i> Log out
                </button>
            </div>

            <div className="settings-pane">
                <h4>Account privacy</h4>
                <div className="panel settings-card">
                    <div className="settings-row">
                        <div>
                            <h5>Private account</h5>
                            <p className="muted small">
                                While your account is public, anyone signed in to Instaclone can see
                                your posts, followers and following.
                            </p>
                            <p className="muted small">
                                While it is private, only followers you approve can see them. Your
                                username and profile picture stay visible to everyone, and people who
                                already follow you are not removed.
                            </p>
                        </div>
                        <label className="ic-switch" title="Private account">
                            <input
                                type="checkbox"
                                checked={!!state?.isPrivate}
                                disabled={saving}
                                onChange={(e)=>togglePrivacy(e.target.checked)}
                            />
                            {/* a div, not a span: materialize decorates any
                                span that follows a checkbox with its own tick */}
                            <div className="ic-slider"></div>
                        </label>
                    </div>
                </div>
                <p className="muted small" style={{marginTop:"12px"}}>
                    Turning your account public accepts everyone who is currently waiting for approval.
                </p>
            </div>
        </div>
    )
}

export default Settings
