import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = existsSync(join(process.cwd(), 'src/core'))
  ? join(process.cwd(), 'src')
  : join(process.cwd(), 'packages/account-sdk/src');

function productionFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

function imports(path: string): string[] {
  return [...readFileSync(path, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1]
  );
}

function forbiddenImports(
  directory: string,
  forbidden: RegExp
): { path: string; specifier: string }[] {
  return productionFiles(join(src, directory)).flatMap((path) =>
    imports(path)
      .filter((specifier) => forbidden.test(specifier))
      .map((specifier) => ({ path, specifier }))
  );
}

describe('architecture boundaries', () => {
  it('keeps session and transport free of namespace policy', () => {
    const upperLayers = /(?:^|[:/])(?:interfaces|namespaces|provider|translators)(?:\/|$)/;
    expect(forbiddenImports('core/message', upperLayers)).toEqual([]);
    expect(forbiddenImports('core/session', upperLayers)).toEqual([]);
    expect(
      forbiddenImports('core/transport', /(?:^|[:/])(?:namespaces|provider|session)(?:\/|$)/)
    ).toEqual([]);
  });

  it('keeps persistence below core and core below public interfaces', () => {
    expect(forbiddenImports('store', /(?:^|[:/])core(?:\/|$)/)).toEqual([]);
    expect(forbiddenImports('core', /(?:^|[:/])interface(?:\/|$)/)).toEqual([]);
  });

  it('keeps the application store off the transport surface', () => {
    const transportTypes = readFileSync(join(src, 'core/transport/types.ts'), 'utf8');
    const popupTransport = readFileSync(
      join(src, 'core/transport/popup/createPopupTransport.ts'),
      'utf8'
    );

    expect(transportTypes).not.toMatch(/^\s*store\s*:/m);
    expect(popupTransport).not.toMatch(/\bStoreInstance\b|\bbindStore\b|\bdefaultStoreInstance\b/);
    expect(forbiddenImports('core/transport', /:store\/store(?:\.js)?$/)).toEqual([]);
  });

  it('keeps CAIP Session free of EIP-1193 selection and mirror state', () => {
    const sessionSchema = readFileSync(join(src, 'storage/schema.ts'), 'utf8');
    const storeSource = readFileSync(join(src, 'store/store.ts'), 'utf8');

    expect(sessionSchema).not.toMatch(/\bselected\s*:/);
    expect(storeSource).not.toMatch(/\bAccountSlice\b|\bChainSlice\b/);
    expect(existsSync(join(src, 'core/namespaces/eip155/eip1193/state.ts'))).toBe(false);
    expect(
      productionFiles(join(src, 'core/namespaces/eip155/eip1193')).flatMap((path) =>
        readFileSync(path, 'utf8').includes('projectEip1193Session') ? [path] : []
      )
    ).toEqual([]);
  });

  it('has one vertical home for namespace policy', () => {
    expect(productionFiles(join(src, 'core/runtime'))).toEqual([]);
    expect(productionFiles(join(src, 'core/interfaces'))).toEqual([]);
    expect(productionFiles(join(src, 'core/translators'))).toEqual([]);
    expect(productionFiles(join(src, 'core/sub-account'))).toEqual([]);
  });
});
