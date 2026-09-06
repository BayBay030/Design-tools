import struct, zlib, collections, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngtool import decode

def _chunk(t, d):
    return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)

def median_cut(counter, ncol=256):
    """counter: {(r,g,b,a): count} -> palette list"""
    boxes = [list(counter.items())]
    while len(boxes) < ncol:
        # 挑「顏色數量 x 色域寬度」最大的盒子來切
        best, bi = -1, -1
        for i, b in enumerate(boxes):
            if len(b) < 2: continue
            ext = max(max(c[k] for c, _ in b) - min(c[k] for c, _ in b) for k in range(4))
            wgt = sum(n for _, n in b)
            score = ext * (wgt ** 0.5)
            if score > best: best, bi = score, i
        if bi < 0: break
        b = boxes.pop(bi)
        ch = max(range(4), key=lambda k: max(c[k] for c, _ in b) - min(c[k] for c, _ in b))
        b.sort(key=lambda it: it[0][ch])
        half = sum(n for _, n in b) / 2.0
        acc, cut = 0, 1
        for i, (_, n) in enumerate(b):
            acc += n
            if acc >= half: cut = max(1, min(i + 1, len(b) - 1)); break
        boxes += [b[:cut], b[cut:]]
    pal = []
    for b in boxes:
        tot = sum(n for _, n in b) or 1
        pal.append(tuple(int(round(sum(c[k] * n for c, n in b) / tot)) for k in range(4)))
    return pal

def encode_indexed(path, w, h, idx, pal):
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 3, 0, 0, 0)
    plte = b''.join(bytes(c[:3]) for c in pal)
    chunks = b'\x89PNG\r\n\x1a\n' + _chunk(b'IHDR', ihdr) + _chunk(b'PLTE', plte)
    alphas = [c[3] for c in pal]
    if any(a < 255 for a in alphas):
        last = max(i for i, a in enumerate(alphas) if a < 255)
        chunks += _chunk(b'tRNS', bytes(alphas[:last + 1]))
    best = None
    for ftype in (0, 2):                       # None / Up，取小的
        raw = bytearray()
        prev = bytes(w)
        for y in range(h):
            row = idx[y * w:(y + 1) * w]
            raw.append(ftype)
            if ftype == 0: raw += row
            else: raw += bytes((row[x] - prev[x]) & 255 for x in range(w))
            prev = row
        body = zlib.compress(bytes(raw), 9)
        if best is None or len(body) < len(best): best = body
    out = chunks + _chunk(b'IDAT', best) + _chunk(b'IEND', b'')
    open(path, 'wb').write(out)
    return len(out)

def process(path, ncol=256):
    w, h, px = decode(path)
    cnt = collections.Counter(px[i:i + 4] for i in range(0, len(px), 4))
    uniq = dict(cnt)
    if len(uniq) <= ncol:
        pal = [tuple(k) for k in uniq]
    else:
        pal = median_cut(uniq, ncol)
    # 每個「獨立顏色」找最近的色盤色，之後查表就好
    lut = {}
    maxerr = 0
    for c in uniq:
        bi, bd = 0, 1 << 30
        for i, p in enumerate(pal):
            d = (c[0]-p[0])**2 + (c[1]-p[1])**2 + (c[2]-p[2])**2 + 3*(c[3]-p[3])**2
            if d < bd: bd, bi = d, i
        lut[c] = bi
        if c[3] > 200:
            e = max(abs(c[k] - pal[bi][k]) for k in range(3))
            if e > maxerr: maxerr = e
    idx = bytes(lut[px[i:i + 4]] for i in range(0, len(px), 4))
    before = os.path.getsize(path)
    after = encode_indexed(path, w, h, idx, pal)
    return dict(name=os.path.basename(path), colors=len(uniq), pal=len(pal),
                before_kb=before // 1024, after_kb=after // 1024, max_err=maxerr)
