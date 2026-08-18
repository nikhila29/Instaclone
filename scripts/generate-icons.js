/*
 * Generates the app icons in instaclone-frontend/public, replacing the ones
 * Create React App ships with.
 *
 * Written against Node's built-in zlib only — no image libraries are installed
 * on this machine, so the PNGs are rasterised and encoded here by hand.
 *
 *   node scripts/generate-icons.js
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const PUBLIC_DIR = path.join(__dirname,'..','instaclone-frontend','public')
const SS = 4 // supersampling factor, averaged down for smooth edges

// warm-to-purple diagonal, in the spirit of a photo app icon
const STOPS = [
    {at:0.00, rgb:[254,218,117]},
    {at:0.30, rgb:[250,125,80]},
    {at:0.60, rgb:[214,41,118]},
    {at:1.00, rgb:[122,47,191]}
]

const gradientAt = (t)=>{
    t = Math.max(0,Math.min(1,t))
    for(let i=1;i<STOPS.length;i++){
        if(t <= STOPS[i].at){
            const a = STOPS[i-1]
            const b = STOPS[i]
            const k = (t - a.at) / (b.at - a.at)
            return [0,1,2].map(c=>Math.round(a.rgb[c] + (b.rgb[c]-a.rgb[c])*k))
        }
    }
    return STOPS[STOPS.length-1].rgb
}

//signed distance to a rounded rectangle centred on the origin
const roundedRectDist = (x,y,halfW,halfH,r)=>{
    const dx = Math.abs(x) - (halfW - r)
    const dy = Math.abs(y) - (halfH - r)
    const outside = Math.hypot(Math.max(dx,0),Math.max(dy,0))
    return outside + Math.min(Math.max(dx,dy),0) - r
}

const renderIcon = (size)=>{
    const n = size * SS
    const acc = new Float64Array(size * size * 4)

    for(let py=0;py<n;py++){
        for(let px=0;px<n;px++){
            const x = (px + 0.5) / n            // 0..1
            const y = (py + 0.5) / n
            const cx = (x - 0.5) * 2            // -1..1
            const cy = (y - 0.5) * 2

            let r=0,g=0,b=0,a=0

            // tile: rounded square covering most of the canvas
            const tile = roundedRectDist(cx,cy,0.94,0.94,0.42)
            if(tile <= 0){
                const [gr,gg,gb] = gradientAt((x + y) / 2)
                r=gr; g=gg; b=gb; a=255

                // camera outline: rounded square ring
                const ringOuter = roundedRectDist(cx,cy,0.60,0.60,0.24)
                const onRing = ringOuter <= 0 && ringOuter >= -0.105
                // lens: circle ring
                const lens = Math.hypot(cx,cy)
                const onLens = lens <= 0.30 && lens >= 0.195
                // viewfinder dot, upper right
                const dot = Math.hypot(cx-0.40,cy+0.40)
                const onDot = dot <= 0.075

                if(onRing || onLens || onDot){
                    r=255; g=255; b=255
                }
            }

            const ox = Math.floor(px / SS)
            const oy = Math.floor(py / SS)
            const o = (oy * size + ox) * 4
            acc[o]+=r; acc[o+1]+=g; acc[o+2]+=b; acc[o+3]+=a
        }
    }

    const samples = SS * SS
    const out = Buffer.alloc(size * size * 4)
    for(let i=0;i<size*size*4;i++){
        out[i] = Math.round(acc[i] / samples)
    }
    return out
}

// ---- minimal PNG encoder ----
const crcTable = (()=>{
    const t = new Int32Array(256)
    for(let n=0;n<256;n++){
        let c = n
        for(let k=0;k<8;k++){
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        }
        t[n] = c
    }
    return t
})()
const crc32 = (buf)=>{
    let c = -1
    for(let i=0;i<buf.length;i++){
        c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    }
    return (c ^ -1) >>> 0
}
const chunk = (type,data)=>{
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type,'ascii'),data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len,body,crc])
}
const encodePng = (rgba,size)=>{
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(size,0)
    ihdr.writeUInt32BE(size,4)
    ihdr[8] = 8   // bit depth
    ihdr[9] = 6   // RGBA
    const raw = Buffer.alloc((size * 4 + 1) * size)
    for(let y=0;y<size;y++){
        raw[y * (size * 4 + 1)] = 0 // no filter
        rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
    }
    return Buffer.concat([
        Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
        chunk('IHDR',ihdr),
        chunk('IDAT',zlib.deflateSync(raw,{level:9})),
        chunk('IEND',Buffer.alloc(0))
    ])
}

// ---- ICO wrapper (PNG-compressed entries, which every current browser reads) ----
const encodeIco = (pngs)=>{
    const header = Buffer.alloc(6)
    header.writeUInt16LE(0,0)
    header.writeUInt16LE(1,2)
    header.writeUInt16LE(pngs.length,4)
    const dir = Buffer.alloc(16 * pngs.length)
    let offset = 6 + dir.length
    pngs.forEach((entry,i)=>{
        const o = i * 16
        dir[o] = entry.size >= 256 ? 0 : entry.size
        dir[o+1] = entry.size >= 256 ? 0 : entry.size
        dir[o+2] = 0
        dir[o+3] = 0
        dir.writeUInt16LE(1,o+4)
        dir.writeUInt16LE(32,o+6)
        dir.writeUInt32LE(entry.data.length,o+8)
        dir.writeUInt32LE(offset,o+12)
        offset += entry.data.length
    })
    return Buffer.concat([header,dir,...pngs.map(p=>p.data)])
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fedа75"/>
      <stop offset="0.3" stop-color="#fa7d50"/>
      <stop offset="0.6" stop-color="#d62976"/>
      <stop offset="1" stop-color="#7a2fbf"/>
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="94" height="94" rx="21" fill="url(#g)"/>
  <rect x="20" y="20" width="60" height="60" rx="12" fill="none" stroke="#fff" stroke-width="5.5"/>
  <circle cx="50" cy="50" r="14" fill="none" stroke="#fff" stroke-width="5.5"/>
  <circle cx="70" cy="30" r="3.8" fill="#fff"/>
</svg>
`.replace('#fedа75','#feda75')

const main = ()=>{
    const sizes = [16,32,48,64,192,512]
    const pngs = {}
    sizes.forEach(size=>{
        pngs[size] = encodePng(renderIcon(size),size)
        console.log(`rendered ${size}x${size}`)
    })

    fs.writeFileSync(path.join(PUBLIC_DIR,'favicon.ico'),encodeIco(
        [16,32,48,64].map(size=>({size,data:pngs[size]}))
    ))
    fs.writeFileSync(path.join(PUBLIC_DIR,'logo192.png'),pngs[192])
    fs.writeFileSync(path.join(PUBLIC_DIR,'logo512.png'),pngs[512])
    fs.writeFileSync(path.join(PUBLIC_DIR,'favicon.svg'),svg)
    console.log('wrote favicon.ico, favicon.svg, logo192.png, logo512.png')
}

main()
