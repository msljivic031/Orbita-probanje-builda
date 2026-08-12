import path from 'node:path';
import process from 'node:process';
import { build } from 'vite';
const root = path.resolve(process.argv[2] || 'candidate');
await build({
  root,
  configFile: false,
  logLevel: 'info',
  build: {
    emptyOutDir: false,
    outDir: path.join(root, 'dist-electron', 'preload'),
    lib: {
      entry: path.join(root, 'src', 'preload', 'preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.cjs',
    },
    rollupOptions: { external: ['electron'] },
    minify: false,
    sourcemap: false,
  },
});
console.log('SANDBOX_PRELOAD_BUNDLE_READY:' + path.join(root,'dist-electron','preload','preload.cjs'));
