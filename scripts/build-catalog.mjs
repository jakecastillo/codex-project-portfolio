import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const applicationsDir = path.join(projectRoot, 'applications');
const jsonOutputPath = path.join(applicationsDir, 'catalog.json');
const jsOutputPath = path.join(applicationsDir, 'catalog.js');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function normalizeManifest(manifest, fallbackId) {
  const id = manifest.id ?? fallbackId;
  const order = typeof manifest.order === 'number' ? manifest.order : undefined;
  const baseHref = `./applications/${id}/${manifest.entry ?? `${id}.html`}`;

  const links = Array.isArray(manifest.links) ? manifest.links.map((link) => {
    if (link && typeof link === 'object') {
      const label = link.label ?? link.title ?? 'View project';
      const href = link.href ?? link.url ?? baseHref;
      const target = link.target ?? (href.startsWith('http') ? '_blank' : undefined);
      const rel = target === '_blank' ? (link.rel ?? 'noopener noreferrer') : link.rel;

      return { label, href, ...(target ? { target } : {}), ...(rel ? { rel } : {}) };
    }

    if (typeof link === 'string') {
      return { label: 'View project', href: link };
    }

    return { label: 'View project', href: baseHref };
  }) : [{ label: 'View project', href: baseHref }];

  return {
    id,
    order,
    tag: manifest.tag ?? '',
    title: manifest.title ?? id,
    summary: manifest.summary ?? '',
    description: manifest.description ?? '',
    highlights: Array.isArray(manifest.highlights) ? manifest.highlights : [],
    tech: Array.isArray(manifest.tech) ? manifest.tech : [],
    links,
    paneClass: manifest.paneClass ?? manifest.pane?.className ?? ''
  };
}

async function buildCatalog() {
  const entries = [];
  const dirEntries = await fs.readdir(applicationsDir, { withFileTypes: true });

  for (const dirent of dirEntries) {
    if (!dirent.isDirectory()) continue;

    const manifestPath = path.join(applicationsDir, dirent.name, 'manifest.json');

    try {
      const manifest = await readJson(manifestPath);
      const normalized = normalizeManifest(manifest, dirent.name);
      entries.push(normalized);
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }

      console.error(`Failed to process manifest for ${dirent.name}:`, error.message);
      throw error;
    }
  }

  entries.sort((a, b) => {
    const orderDelta = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
    if (orderDelta !== 0) return orderDelta;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

  const serialized = JSON.stringify(entries, null, 2);

  await Promise.all([
    fs.writeFile(jsonOutputPath, `${serialized}\n`, 'utf8'),
    fs.writeFile(jsOutputPath, `window.__APPLICATION_CATALOG__ = ${serialized};\n`, 'utf8')
  ]);

  console.log(`Catalog updated (${entries.length} project${entries.length === 1 ? '' : 's'}).`);
}

buildCatalog().catch((error) => {
  console.error('Catalog build failed:', error);
  process.exitCode = 1;
});
