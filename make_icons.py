import struct, zlib, os

def make_png(path, size, rgb):
    width = height = size
    r, g, b = rgb
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 for each scanline
        for x in range(width):
            raw += bytes((r, g, b))
    compressed = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)

os.makedirs('icons', exist_ok=True)
# Verde oscuro tipo billete, simple y limpio
make_png('icons/icon-192.png', 192, (22, 101, 52))
make_png('icons/icon-512.png', 512, (22, 101, 52))
print("done")
