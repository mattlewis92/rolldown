import type { BindingRenderedChunk } from '../binding.cjs';
import type { RenderedChunk } from '../types/rolldown-output';
import { transformToRenderedModule } from './transform-rendered-module';

/**
 * Every read of a binding field crosses into Rust and copies the value out, and a `renderChunk`
 * hook that walks the chunk graph through `meta.chunks` reads the same chunks' fields once per
 * chunk it renders, so each field is read once.
 */
function lazy<T>(read: () => T): () => T {
  let value: T;
  let pending = true;
  return () => {
    if (pending) {
      value = read();
      pending = false;
    }
    return value;
  };
}

export function transformRenderedChunk(chunk: BindingRenderedChunk): RenderedChunk {
  const name = lazy(() => chunk.name);
  const isEntry = lazy(() => chunk.isEntry);
  const isDynamicEntry = lazy(() => chunk.isDynamicEntry);
  const facadeModuleId = lazy(() => chunk.facadeModuleId);
  const moduleIds = lazy(() => chunk.moduleIds);
  const exports = lazy(() => chunk.exports);
  const fileName = lazy(() => chunk.fileName);
  const imports = lazy(() => chunk.imports);
  const dynamicImports = lazy(() => chunk.dynamicImports);
  const modules = lazy(() => transformChunkModules(chunk.modules));
  return {
    type: 'chunk',
    get name() {
      return name();
    },
    get isEntry() {
      return isEntry();
    },
    get isDynamicEntry() {
      return isDynamicEntry();
    },
    get facadeModuleId() {
      return facadeModuleId();
    },
    get moduleIds() {
      return moduleIds();
    },
    get exports() {
      return exports();
    },
    get fileName() {
      return fileName();
    },
    get imports() {
      return imports();
    },
    get dynamicImports() {
      return dynamicImports();
    },
    get modules() {
      return modules();
    },
  };
}

export function transformChunkModules(
  modules: BindingRenderedChunk['modules'],
): RenderedChunk['modules'] {
  const result: RenderedChunk['modules'] = {};
  for (let i = 0; i < modules.values.length; i++) {
    let key = modules.keys[i];
    const mod = modules.values[i];
    result[key] = transformToRenderedModule(mod);
  }
  return result;
}
