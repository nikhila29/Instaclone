import React,{useState} from 'react'

//a password box with the eye that reveals what you typed
const PasswordField = ({value,onChange,placeholder="password",autoComplete})=>{
    const [shown,setShown] = useState(false)

    return (
        <div className="password-field">
            <input
                type={shown ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                autoComplete={autoComplete}
                onChange={(e)=>onChange(e.target.value)}
            />
            <button
                type="button"
                className="password-toggle"
                //a label as well as a tooltip, since the icon carries the meaning
                title={shown ? "Hide password" : "Show password"}
                aria-label={shown ? "Hide password" : "Show password"}
                onClick={()=>setShown(open=>!open)}
            >
                <i className="material-icons">{shown ? "visibility_off" : "visibility"}</i>
            </button>
        </div>
    )
}

export default PasswordField
