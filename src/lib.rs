use std::env;
use std::fs;
use zed_extension_api as zed;

/// The language server entry point, relative to the extension working
/// directory.
const SERVER_ENTRY_POINT: &str = "server/server.js";

/// Every file the language server is made of.
///
/// Zed only gives an extension access to its own working directory
/// (`<data>/extensions/work/<id>`, preopened read-write), and *not* to the
/// directory the extension itself is installed in. The files are therefore
/// embedded into the wasm at build time and written into the working directory
/// before the server is started. This also means the extension keeps working
/// when it is published (where only `extension.toml`, `extension.wasm`,
/// `languages/`, `snippets/` and `grammars/` are present in the install dir).
const SERVER_FILES: &[(&str, &str)] = &[
    ("server/server.js", include_str!("../server/server.js")),
    ("server/lsp.js", include_str!("../server/lsp.js")),
    ("server/resolver.js", include_str!("../server/resolver.js")),
    ("server/markdown.js", include_str!("../server/markdown.js")),
    (
        "server/formatting.js",
        include_str!("../server/formatting.js"),
    ),
    (
        "server/builtinDocs.js",
        include_str!("../server/builtinDocs.js"),
    ),
    (
        "server/keysReference.js",
        include_str!("../server/keysReference.js"),
    ),
];

/// The Testo Helper Zed extension.
///
/// The extension itself is intentionally tiny: all of the language features
/// live in a dependency free Node.js language server (`server/`) that
/// implements hover, go-to-definition, formatting, the `step` inlay hints and
/// the "open in Jira" code action.
///
/// The language server is launched with the Node runtime that ships with Zed
/// (`zed::node_binary_path`), so users do not have to install anything.
struct TestoHelperExtension;

impl zed::Extension for TestoHelperExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> zed::Result<zed::Command> {
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![materialize_server()?],
            env: Default::default(),
        })
    }
}

/// Writes the embedded language server into the extension working directory
/// and returns the absolute path of its entry point.
fn materialize_server() -> zed::Result<String> {
    let work_dir = env::current_dir()
        .map_err(|err| format!("failed to determine the extension working directory: {err}"))?;

    fs::create_dir_all(work_dir.join("server"))
        .map_err(|err| format!("failed to create the server directory: {err}"))?;

    for (relative_path, contents) in SERVER_FILES {
        let path = work_dir.join(relative_path);

        // Only touch the file when its contents differ, so that repeated
        // language server launches are cheap.
        let up_to_date = fs::read_to_string(&path)
            .map(|existing| existing == *contents)
            .unwrap_or(false);

        if !up_to_date {
            fs::write(&path, contents)
                .map_err(|err| format!("failed to write {}: {err}", path.display()))?;
        }
    }

    Ok(work_dir
        .join(SERVER_ENTRY_POINT)
        .to_string_lossy()
        .into_owned())
}

zed::register_extension!(TestoHelperExtension);
