; Syntactic scopes referenced from config.toml.
;
; IMPORTANT: every scope named in config.toml — both `[overrides.<scope>]` and
; `not_in = [...]` — must also be defined here. Otherwise Zed fails to load the
; whole language ("has overrides in config not in query: ...").

(comment) @comment

(string) @string

(multiline_string) @string
