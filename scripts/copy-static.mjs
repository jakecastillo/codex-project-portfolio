import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const STATIC_ITEMS = [
  'applications',
  'projects',
  'shared',
  'styles.css',
  'game.js'
];

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyItem(item) {
  const source = path.join(projectRoot, item);
  if (!(await exists(source))) {
    return;
  }

  const destination = path.join(distDir, item);

  await fs.mkdir(path.dirname(destination), { recursive: true });

  const stats = await fs.stat(source);

  if (stats.isDirectory()) {
    await fs.cp(source, destination, { recursive: true });
  } else {
    await fs.copyFile(source, destination);
  }
}

async function copyStaticAssets() {
  const distExists = await exists(distDir);
  if (!distExists) {
    throw new Error('dist directory not found. Run build before copying assets.');
  }

  await Promise.all(STATIC_ITEMS.map(copyItem));
  console.log('Static assets copied to dist.');
}

copyStaticAssets().catch((error) => {
  console.error('Failed to copy static assets:', error);
  process.exitCode = 1;
});
