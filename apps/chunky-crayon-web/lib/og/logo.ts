import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Load the C logo mark used in header/footer and embed it as a base64
 * data URL so Satori can render it inline in <img>. Avoids any reliance
 * on absolute URLs at OG render time (which differ across local / preview
 * / production).
 */
export async function loadOGLogo(): Promise<string> {
  const path = join(process.cwd(), 'public', 'logos', 'cc-logo-no-bg.svg');
  const data = await readFile(path);
  const base64 = data.toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
