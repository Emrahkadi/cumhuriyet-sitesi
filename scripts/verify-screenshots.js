// Verify screenshots meet Play Store requirements
const fs = require('fs');
const path = require('path');

const storeDir = 'C:\\Users\\emrah\\Desktop\\kurbanciniz\\cumhuriyet-sitesi\\public\\store';
const files = ['screenshot-1-home.png', 'screenshot-2-duyurular.png', 'screenshot-3-kentsel.png', 'screenshot-4-login.png'];

// Read PNG dimensions from binary
function getPngSize(filename) {
    const buf = fs.readFileSync(filename);
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return null;
    // Width at offset 16, Height at 20, 4 bytes big-endian
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
}

files.forEach(f => {
    const p = path.join(storeDir, f);
    if (!fs.existsSync(p)) {
        console.log(f, 'NOT FOUND');
        return;
    }
    const size = getPngSize(p);
    console.log(`${f}: ${size.width}x${size.height} (${(fs.statSync(p).size/1024).toFixed(1)} KB)`);
});

// Check feature graphic
const fg = path.join(storeDir, 'feature-graphic.png');
if (fs.existsSync(fg)) {
    const size = getPngSize(fg);
    console.log(`feature-graphic.png: ${size.width}x${size.height} (Play Store ideal: 1024x500)`);
}
