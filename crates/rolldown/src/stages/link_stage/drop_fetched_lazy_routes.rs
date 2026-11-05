use rolldown_common::Module;

use crate::hmr::utils::LAZY_PROXY_QUERY;

use super::LinkStage;

impl LinkStage<'_> {
  /// Under lazy compilation, leaves the routes that pages already fetched out of the full build.
  ///
  /// A fetched proxy's `import()` keeps its route in the module graph, so edits to the route
  /// are watched and hot-updated, and its scan cache entry stays warm for the next
  /// `/@vite/lazy` request. But the route would also become a dynamic entry here, and every
  /// later full build would chunk and render it, although no page loads a route from the build
  /// output: every lazy `import()` is a `requestLazy` call, and a route reaches a page as
  /// factories only (see internal-docs/lazy-compilation/design.md, "After Boot, Only
  /// Factories"). Dropping the entry before tree shaking keeps the modules only the route
  /// reaches out of every chunk.
  ///
  /// A route that something else also imports with `import()` keeps its entry, and a route
  /// module that the entry graph imports statically is still included through that import.
  pub(super) fn drop_fetched_lazy_routes(&mut self) {
    if self.options.experimental.dev_mode.as_ref().is_none_or(|dev| dev.lazy != Some(true)) {
      return;
    }
    let modules = &self.module_table.modules;
    self.entries.retain(|idx, entry_points| {
      if entry_points.iter().any(|entry| entry.kind.is_user_defined()) {
        return true;
      }
      let Module::Normal(module) = &modules[*idx] else {
        return true;
      };
      let importers = &module.ecma_view.dynamic_importers_idx;
      importers.is_empty()
        || importers.iter().any(|importer| !modules[*importer].id().contains(LAZY_PROXY_QUERY))
    });
  }
}
