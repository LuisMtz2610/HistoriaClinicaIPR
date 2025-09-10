import { promises as fs } from 'fs';
import path from 'path';

const DUPES = [
  "app/(clinic)/prescriptions/[id]/print/page.tsx",
  "app/(clinic)/radiology-orders/[id]/print/page.tsx",
  "app/(clinic)/lab-orders/[id]/print/page.tsx",
  "app/(clinic)/consents/[id]/print/page.tsx",
  "app/(clinic)/prescriptions/new/page.tsx",
  "app/(clinic)/radiology-orders/new/page.tsx",
  "app/(clinic)/lab-orders/new/page.tsx",
  "app/(clinic)/consents/new/page.tsx",
  "app/(clinic)/prescriptions/page.tsx",
  "app/(clinic)/radiology-orders/page.tsx",
  "app/(clinic)/lab-orders/page.tsx",
  "app/(clinic)/consents/page.tsx"
];

const root = process.cwd();
async function rmIfExists(rel) {
  const p = path.join(root, rel);
  try {
    await fs.stat(p);
  } catch { return false; }
  await fs.rm(p, { force: true });
  // Remove empty parent dirs if any
  let dir = path.dirname(p);
  while (dir.length > root.length) {
    try {
      const items = await fs.readdir(dir);
      if (items.length) break;
      await fs.rmdir(dir);
      dir = path.dirname(dir);
    } catch { break; }
  }
  console.log("✂ eliminado:", rel);
  return true;
}

let count = 0;
for (const rel of DUPES) {
  const ok = await rmIfExists(rel);
  if (ok) count++;
}
console.log(`Listo. Eliminados: ${count} duplicados.`);
