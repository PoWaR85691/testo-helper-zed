; Syntax highlighting for the Testo language.

(comment) @comment

(string) @string
(multiline_string) @string
(escape_sequence) @string.escape

(interpolation
  (identifier) @variable)

(variable
  (identifier) @variable)

(number) @number
(time_interval) @number
(size_specifier) @number
(angle_specifier) @number
(boolean) @boolean

(control_keyword) @keyword
(action_keyword) @keyword

(select_keyword) @function

(comparison_keyword) @operator
(logic_keyword) @operator

(operator) @operator
(punctuation) @punctuation

(identifier) @variable
