import React from 'react'

/*
 * Material Icons only ships filled glyphs, and the filled paper plane does not
 * read as "share". These are outlined to match what the app they imitate uses.
 */
export const ShareIcon = ({size=26})=>(
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
)

export const CommentIcon = ({size=26})=>(
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"/>
    </svg>
)

/*
 * Brand marks. Material Icons has no logos, so these are drawn inline —
 * a speech bubble is not a WhatsApp icon.
 */
export const WhatsAppIcon = ({size=22})=>(
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.2.4-.5.6-.7.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.7-1.7-.9-2.3-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 .9-1 2.3s1 2.7 1.1 2.9c.1.2 1.5 2.5 3.8 3.5 1.9.8 2.4.8 3 .7.4-.1 1.3-.5 1.5-1.1.2-.5.2-1 .2-1.1 0-.2-.2-.2-.4-.3z"/>
        <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/>
    </svg>
)

export const FacebookIcon = ({size=22})=>(
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/>
    </svg>
)

export const MessengerIcon = ({size=22})=>(
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M12 2C6.3 2 2 6.2 2 11.6c0 2.8 1.2 5.3 3.1 7v3.1l3-1.6c.9.3 1.9.4 2.9.4 5.7 0 10-4.2 10-9.6S17.7 2 12 2zm1 12.6-2.5-2.7-4.9 2.7 5.4-5.7 2.6 2.6 4.8-2.6-5.4 5.7z"/>
    </svg>
)

export const EmailIcon = ({size=22})=>(
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2"/>
        <path d="M3 6l9 6.5L21 6"/>
    </svg>
)

export const XIcon = ({size=20})=>(
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M17.5 3h3.2l-7 8 7.8 10h-6l-4.7-6.1L5.3 21H2l7.4-8.4L2 3h6.1l4.4 5.8L17.5 3zm-1.1 16h1.7L7.2 4.7H5.4L16.4 19z"/>
    </svg>
)

export const LinkIcon = ({size=22})=>(
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/>
        <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>
    </svg>
)
