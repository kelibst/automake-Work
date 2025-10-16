import { writeFileSync } from 'fs';

// Minimal valid PNG file (1x1 transparent pixel) as base64
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Create icon files
['16', '48', '128'].forEach(size => {
  writeFileSync(`public/icons/icon-${size}.png`, minimalPNG);
  console.log(`Created public/icons/icon-${size}.png`);
});

console.log('✅ Placeholder icons created');
