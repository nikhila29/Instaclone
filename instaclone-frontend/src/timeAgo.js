/*
 * Short relative times, the way a feed shows them: "just now", "4h", "3d".
 *
 * Comments written before the createdAt field existed have no date, so the
 * time is recovered from the comment's own ObjectId — its first four bytes
 * are the creation time in seconds.
 */
const fromObjectId = (id)=>{
    if(typeof id !== "string" || !/^[0-9a-f]{24}$/i.test(id)){
        return null
    }
    return new Date(parseInt(id.slice(0,8),16) * 1000)
}

export const dateOf = (value,fallbackId)=>{
    if(value){
        const parsed = new Date(value)
        if(!isNaN(parsed.getTime())){
            return parsed
        }
    }
    return fromObjectId(fallbackId)
}

//"3d ago", but "just now" reads wrong with a suffix
export const timeAgoLabel = (value,fallbackId)=>{
    const short = timeAgo(value,fallbackId)
    if(!short || short === "just now"){
        return short
    }
    return short + " ago"
}

export const timeAgo = (value,fallbackId)=>{
    const date = dateOf(value,fallbackId)
    if(!date){
        return ""
    }
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if(seconds < 60){
        return "just now"
    }
    const minutes = Math.floor(seconds / 60)
    if(minutes < 60){
        return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    if(hours < 24){
        return `${hours}h`
    }
    const days = Math.floor(hours / 24)
    if(days < 7){
        return `${days}d`
    }
    const weeks = Math.floor(days / 7)
    if(days < 365){
        return `${weeks}w`
    }
    return `${Math.floor(days / 365)}y`
}

//the full date, for the tooltip behind the short one
export const fullDate = (value,fallbackId)=>{
    const date = dateOf(value,fallbackId)
    if(!date){
        return ""
    }
    return date.toLocaleString(undefined,{
        year:"numeric", month:"short", day:"numeric",
        hour:"2-digit", minute:"2-digit"
    })
}
