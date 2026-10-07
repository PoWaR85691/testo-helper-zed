; Auto indentation for `{ ... }` blocks.
; config.toml also declares regex based rules as a fallback.

(block
  "{" @start
  "}" @end) @indent
