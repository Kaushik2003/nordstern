export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

/** Slugify `base`, then ensure uniqueness against `exists`. */
export async function uniqueSlug(base: string, exists: (s: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || 'org';
  if (!(await exists(root))) return root;
  for (let i = 0; i < 100; i++) {
    const candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now()}`;
}
