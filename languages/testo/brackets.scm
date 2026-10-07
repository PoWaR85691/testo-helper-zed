; Bracket pairs for rainbow brackets and matching.
; Quotes are excluded on purpose: bracket matching across string content is
; confusing, and the auto-closing behaviour is configured in config.toml.

("{" @open "}" @close)
("[" @open "]" @close)
("(" @open ")" @close)
