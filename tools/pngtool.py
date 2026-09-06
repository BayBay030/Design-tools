import struct, zlib

def decode(path):
    d=open(path,'rb').read(); pos=8; idat=b''; w=h=bd=ct=None; plte=None; trns=None
    while pos<len(d):
        ln=struct.unpack('>I',d[pos:pos+4])[0]; typ=d[pos+4:pos+8]; data=d[pos+8:pos+8+ln]
        if typ==b'IHDR': w,h,bd,ct=struct.unpack('>IIBB',data[:10])
        elif typ==b'PLTE': plte=data
        elif typ==b'tRNS': trns=data
        elif typ==b'IDAT': idat+=data
        elif typ==b'IEND': break
        pos+=12+ln
    raw=zlib.decompress(idat)
    ch={0:1,2:3,3:1,4:2,6:4}[ct]; stride=w*ch
    out=bytearray(); prev=bytes(stride); i=0
    for y in range(h):
        f=raw[i]; i+=1; line=bytearray(raw[i:i+stride]); i+=stride
        if f:
            for x in range(stride):
                a=line[x-ch] if x>=ch else 0; b=prev[x]; c=prev[x-ch] if x>=ch else 0
                if f==1: line[x]=(line[x]+a)&255
                elif f==2: line[x]=(line[x]+b)&255
                elif f==3: line[x]=(line[x]+((a+b)>>1))&255
                else:
                    p=a+b-c; pa=abs(p-a); pb=abs(p-b); pc=abs(p-c)
                    line[x]=(line[x]+(a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)))&255
        out+=line; prev=bytes(line)
    px=bytearray(w*h*4)
    if ct==6: px=bytearray(out)
    elif ct==2:
        for k in range(w*h): px[k*4:k*4+3]=out[k*3:k*3+3]; px[k*4+3]=255
    elif ct==3:
        for k in range(w*h):
            idx=out[k]; px[k*4:k*4+3]=plte[idx*3:idx*3+3]
            px[k*4+3]=trns[idx] if (trns and idx<len(trns)) else 255
    return w,h,bytes(px)

def _chunk(t,d):
    return struct.pack('>I',len(d))+t+d+struct.pack('>I', zlib.crc32(t+d)&0xffffffff)

def encode_indexed(path, w, h, indices, palette):
    """palette: list of (r,g,b,a) <=256"""
    ihdr=struct.pack('>IIBBBBB', w,h,8,3,0,0,0)
    plte=b''.join(bytes(c[:3]) for c in palette)
    alphas=[c[3] for c in palette]
    trns=bytes(alphas[:len(alphas)-([a==255 for a in alphas][::-1].index(False)) ]) if any(a<255 for a in alphas) else None
    if any(a<255 for a in alphas):
        last=max(i for i,a in enumerate(alphas) if a<255)
        trns=bytes(alphas[:last+1])
    raw=bytearray()
    for y in range(h):
        raw.append(0)
        raw+=indices[y*w:(y+1)*w]
    body=zlib.compress(bytes(raw), 9)
    out=b'\x89PNG\r\n\x1a\n'+_chunk(b'IHDR',ihdr)+_chunk(b'PLTE',plte)
    if trns: out+=_chunk(b'tRNS',trns)
    out+=_chunk(b'IDAT',body)+_chunk(b'IEND',b'')
    open(path,'wb').write(out)
    return len(out)
