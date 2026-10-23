use std::borrow::Cow;

use rolldown::{BundlerOptions, InputItem};
use rolldown_common::{
  CodeSplittingMode, EmittedAsset, InlineCommonChunksOptions, ManualCodeSplittingOptions,
  PreserveEntrySignatures,
};
use rolldown_plugin::{HookTransformOutput, HookUsage, Plugin};
use rolldown_testing::{manual_integration_test, test_config::TestMeta};

/// Emits an asset for `shared.js` and puts its reference id into the `__REF__` placeholder.
#[derive(Debug)]
struct EmitAsset;

impl Plugin for EmitAsset {
  fn name(&self) -> Cow<'static, str> {
    "emit-asset".into()
  }

  async fn transform(
    &self,
    ctx: rolldown_plugin::SharedTransformPluginContext,
    args: &rolldown_plugin::HookTransformArgs<'_>,
  ) -> rolldown_plugin::HookTransformReturn {
    if !args.id.ends_with("shared.js") {
      return Ok(None);
    }
    let reference_id = ctx.emit_file(
      EmittedAsset {
        name: Some("asset.txt".into()),
        original_file_name: None,
        file_name: None,
        source: "asset".to_string().into(),
      },
      None,
      None,
    )?;
    Ok(Some(HookTransformOutput {
      code: Some(args.code.replace("__REF__", &reference_id)),
      ..Default::default()
    }))
  }

  fn register_hook_usage(&self) -> HookUsage {
    HookUsage::Transform
  }
}

/// `shared.js` reads `import.meta.ROLLDOWN_FILE_URL_*`, which is rendered as a URL resolved
/// against `import.meta.url`. With every chunk in one directory and `allowImportMetaUrl` on, the
/// common chunk is still a record: each copy resolves the asset to the same URL.
#[tokio::test(flavor = "multi_thread")]
async fn import_meta_file_url() {
  manual_integration_test!()
    .build(TestMeta { hidden_runtime_module: false, ..Default::default() })
    .run_with_plugins(
      BundlerOptions {
        input: Some(vec![
          InputItem { name: Some("a".into()), import: "./a.js".into() },
          InputItem { name: Some("b".into()), import: "./b.js".into() },
        ]),
        preserve_entry_signatures: Some(PreserveEntrySignatures::False),
        code_splitting: Some(CodeSplittingMode::Advanced(ManualCodeSplittingOptions {
          experimental_inline_common_chunks: Some(InlineCommonChunksOptions {
            max_size: Some(4096.0),
            allow_import_meta_url: Some(true),
            exclude: None,
          }),
          ..Default::default()
        })),
        ..Default::default()
      },
      vec![Plugin::new_shared(EmitAsset)],
    )
    .await;
}
