const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '../app/frontend');
const standaloneDir = path.join(frontendDir, '.next/standalone');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Source not found: ${src}`);
    return;
  }

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying static files for Next.js standalone...');

// Copy .next/static to standalone/.next/static
const staticSrc = path.join(frontendDir, '.next/static');
const staticDest = path.join(standaloneDir, '.next/static');
console.log(`Copying ${staticSrc} -> ${staticDest}`);
copyRecursive(staticSrc, staticDest);

// Copy public folder to standalone/public
const publicSrc = path.join(frontendDir, 'public');
const publicDest = path.join(standaloneDir, 'public');
if (fs.existsSync(publicSrc)) {
  console.log(`Copying ${publicSrc} -> ${publicDest}`);
  copyRecursive(publicSrc, publicDest);
} else {
  console.log('No public folder found, skipping...');
}

console.log('Static files copied successfully!');
