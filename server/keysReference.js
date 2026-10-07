/**
 * Справочник клавиш для языка Testo-lang
 */
const keysReference = {
    'Основные': [
        { key: 'ESC', desc: 'Клавиша "Escape"' },
        { key: 'ENTER', desc: 'Клавиша "Enter"' },
        { key: 'SPACE', desc: 'Пробел' },
        { key: 'TAB', desc: 'Клавиша "Tab"' },
        { key: 'BACKSPACE', desc: 'Клавиша "Backspace"' }
    ],
    'Числовые': [
        { key: 'ZERO', desc: 'Клавиша "0"' },
        { key: 'ONE', desc: 'Клавиша "1"' },
        { key: 'TWO', desc: 'Клавиша "2"' },
        { key: 'THREE', desc: 'Клавиша "3"' },
        { key: 'FOUR', desc: 'Клавиша "4"' },
        { key: 'FIVE', desc: 'Клавиша "5"' },
        { key: 'SIX', desc: 'Клавиша "6"' },
        { key: 'SEVEN', desc: 'Клавиша "7"' },
        { key: 'EIGHT', desc: 'Клавиша "8"' },
        { key: 'NINE', desc: 'Клавиша "9"' }
    ],
    'Буквенные': [
        { key: 'A-Z', desc: 'Клавиши от A до Z' }
    ],
    'Специальные символы': [
        { key: 'MINUS', desc: 'Клавиша "-"' },
        { key: 'EQUALSIGN', desc: 'Клавиша "="' },
        { key: 'LEFTBRACE', desc: 'Клавиша "["' },
        { key: 'RIGHTBRACE', desc: 'Клавиша "]"' },
        { key: 'SEMICOLON', desc: 'Клавиша ";"' },
        { key: 'APOSTROPHE', desc: 'Клавиша "\'"' },
        { key: 'GRAVE', desc: 'Клавиша "`"' },
        { key: 'BACKSLASH', desc: 'Клавиша "\\"' },
        { key: 'COMMA', desc: 'Клавиша ","' },
        { key: 'DOT', desc: 'Клавиша "."' },
        { key: 'SLASH', desc: 'Клавиша "/"' }
    ],
    'Модификаторы': [
        { key: 'LEFTCTRL', desc: 'Левый Control' },
        { key: 'RIGHTCTRL', desc: 'Правый Control' },
        { key: 'LEFTSHIFT', desc: 'Левый Shift' },
        { key: 'RIGHTSHIFT', desc: 'Правый Shift' },
        { key: 'LEFTALT', desc: 'Левый Alt' },
        { key: 'RIGHTALT', desc: 'Правый Alt' },
        { key: 'LEFTMETA', desc: 'Левая мета-клавиша (Windows/Command)' },
        { key: 'RIGHTMETA', desc: 'Правая мета-клавиша' }
    ],
    'Функциональные': [
        { key: 'F1', desc: 'Клавиша "F1"' },
        { key: 'F2', desc: 'Клавиша "F2"' },
        { key: 'F3', desc: 'Клавиша "F3"' },
        { key: 'F4', desc: 'Клавиша "F4"' },
        { key: 'F5', desc: 'Клавиша "F5"' },
        { key: 'F6', desc: 'Клавиша "F6"' },
        { key: 'F7', desc: 'Клавиша "F7"' },
        { key: 'F8', desc: 'Клавиша "F8"' },
        { key: 'F9', desc: 'Клавиша "F9"' },
        { key: 'F10', desc: 'Клавиша "F10"' },
        { key: 'F11', desc: 'Клавиша "F11"' },
        { key: 'F12', desc: 'Клавиша "F12"' }
    ],
    'Клавиши на Numpad': [
        { key: 'KP_0', desc: 'Клавиша "0"' },
        { key: 'KP_1', desc: 'Клавиша "1"' },
        { key: 'KP_2', desc: 'Клавиша "2"' },
        { key: 'KP_3', desc: 'Клавиша "3"' },
        { key: 'KP_4', desc: 'Клавиша "4"' },
        { key: 'KP_5', desc: 'Клавиша "5"' },
        { key: 'KP_6', desc: 'Клавиша "6"' },
        { key: 'KP_7', desc: 'Клавиша "7"' },
        { key: 'KP_8', desc: 'Клавиша "8"' },
        { key: 'KP_9', desc: 'Клавиша "9"' },
        { key: 'KP_PLUS', desc: 'Клавиша "+"' },
        { key: 'KP_MINUS', desc: 'Клавиша "-"' },
        { key: 'KP_SLASH', desc: 'Клавиша "/"' },
        { key: 'KP_ASTERISK', desc: 'Клавиша "*"' },
        { key: 'KP_ENTER', desc: 'Клавиша "Enter"' },
        { key: 'KP_DOT', desc: 'Клавиша "."' }
    ],
    'Управление курсором': [
        { key: 'UP', desc: 'Стрелка вверх' },
        { key: 'DOWN', desc: 'Стрелка вниз' },
        { key: 'LEFT', desc: 'Стрелка влево' },
        { key: 'RIGHT', desc: 'Стрелка вправо' },
        { key: 'PAGEUP', desc: 'Клавиша "Page Up"' },
        { key: 'PAGEDOWN', desc: 'Клавиша "Page Down"' },
        { key: 'HOME', desc: 'Клавиша "Home"' },
        { key: 'END', desc: 'Клавиша "End"' }
    ],
    'Дополнительные': [
        { key: 'INSERT', desc: 'Клавиша "Insert"' },
        { key: 'DELETE', desc: 'Клавиша "Delete"' },
        { key: 'CAPSLOCK', desc: 'Клавиша "Caps Lock"' },
        { key: 'NUMLOCK', desc: 'Клавиша "Num Lock"' },
        { key: 'SCROLLLOCK', desc: 'Клавиша "Scroll Lock"' },
        { key: 'PRINTSCREEN', desc: 'Клавиша "Print Screen"' },
        { key: 'SCROLLUP', desc: 'Скролл вверх' },
        { key: 'SCROLLDOWN', desc: 'Скролл вниз' }
    ]
};

module.exports = keysReference;
