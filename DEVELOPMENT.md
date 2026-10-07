# Разработка Testo Helper для Zed

Документ для тех, кто дорабатывает расширение. Пользователям он не нужен —
для установки и настройки см. [README.md](./README.md) и
[INSTALL.md](./INSTALL.md).

## Как устроено

Расширение Zed — это тонкая обёртка на Rust, скомпилированная в WebAssembly.
Вся логика языка живёт в **языковом сервере на Node.js без внешних
зависимостей** (`server/server.js`): наведение, переход к определениям,
форматирование, счётчик шагов и code action для Jira.

`src/lib.rs` запускает языковой сервер командой вида
`node server/server.js`. Node берётся из самого Zed
(`zed_extension_api::node_binary_path`), поэтому пользователю не нужно ставить
Node отдельно.

## Репозитории

| Репозиторий | Назначение |
|-------------|------------|
| [`testo-helper-zed`](https://github.com/PoWaR85691/testo-helper-zed) | расширение Zed (этот репозиторий) |
| [`tree-sitter-testo`](https://github.com/PoWaR85691/tree-sitter-testo) | tree-sitter-грамматика языка |
| [`Testo-Helper`](https://github.com/Romk-a/Testo-Helper) | исходный плагин для VS Code |

## Структура

```
testo-helper-zed/
├── extension.toml          # манифест расширения (язык, грамматика, языковой сервер, сниппеты)
├── Cargo.toml, src/lib.rs  # запуск языкового сервера
├── languages/testo/        # конфигурация языка и tree-sitter-запросы
│   ├── config.toml
│   ├── highlights.scm
│   ├── brackets.scm
│   ├── indents.scm
│   └── overrides.scm
├── snippets/testo.json     # сниппеты
├── server/                 # языковой сервер на Node.js
└── INSTALL.md              # инструкция по установке
```

## Грамматика

Zed подключает tree-sitter-грамматику по git-ссылке, а не из бандла
расширения. Поэтому грамматика лежит в отдельном репозитории
[`tree-sitter-testo`](https://github.com/PoWaR85691/tree-sitter-testo), а в
`extension.toml` указаны её URL и коммит:

```toml
[grammars.testo]
repository = "https://github.com/PoWaR85691/tree-sitter-testo"
rev = "<commit sha>"
```

`rev` должен указывать на коммит, в котором уже есть сгенерированный
`src/parser.c`. Сборка и публикация грамматики описаны в её README.

Запросы подсветки/скобок/отступов живут здесь (`languages/testo/*.scm`), а не в
репозитории грамматики: именно отсюда их читает Zed.

## Сборка и проверка

```sh
# Проверка, что расширение компилируется
cargo check

# Полная сборка под WebAssembly так, как это делает Zed
rustup target add wasm32-wasip2
cargo build --target wasm32-wasip2
```

Установка для проверки — через `zed: install dev extension` (см.
[INSTALL.md](./INSTALL.md)).

## Артефакты сборки

При установке как dev extension Zed работает с каталогом расширения напрямую
и создаёт в нём служебные файлы:

- `grammars/` — склонированная и скомпилированная tree-sitter-грамматика
  (вложенный git-репозиторий + `grammars/testo.wasm`);
- `extension.wasm` — скомпилированное расширение.

Это артефакты сборки, а не исходники: они не коммитятся (см. `.gitignore`).

## Где расширение берёт свои файлы

Zed запускает расширение с текущим каталогом = **рабочая директория**
(`<данные Zed>/extensions/work/<id>/`). WASI-песочница даёт расширению доступ
**только** к этой директории (read-write): каталог, в который установлено
расширение (`extensions/installed/<id>/`), недоступен даже на чтение. Поэтому
языковой сервер встроен в wasm (`include_str!`) и при запуске распаковывается в
рабочую директорию (`materialize_server` в `src/lib.rs`), откуда и запускается
`node server/server.js`. Так сервер работает и у dev-расширения, и у
опубликованного (где в `installed/<id>` лежат только `extension.toml`,
`extension.wasm`, `languages/`, `snippets/`, `grammars/`).

## Отладка

- Логи: `zed: open log`.
- Подробный вывод расширения: запустить Zed из терминала с `zed --foreground`.
- Изменения в `extension.toml`, `src/lib.rs`, `languages/**`, `snippets/**`
  требуют переустановки dev-расширения; изменения в `server/*.js` —
  перезапуска Zed.
