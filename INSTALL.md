# Установка Testo Helper в Zed

Расширения пока нет в официальном реестре Zed, поэтому оно устанавливается как
**dev extension**: Zed сам собирает его из исходников на вашем компьютере. Это
разовая процедура, занимает пару минут.

## Что понадобится

- **Zed** (стабильная версия).
- **Rust**, установленный через [rustup](https://rustup.rs) — нужен Zed для
  сборки расширения. Если Rust поставлен через rustup, Zed сам подтянет
  нужный компонент `wasm32-wasip2`.
  Проверить:
  ```sh
  rustup target list --installed      # в списке должен быть wasm32-wasip2
  ```
  Если Rust установлен другим способом (Homebrew, Nix, пакет дистрибутива),
  добавьте компонент вручную:
  ```sh
  rustup target add wasm32-wasip2
  ```

Больше ничего устанавливать не нужно: языковой сервер запускается через Node,
встроенный в Zed.

## Установка

1. Скачайте репозиторий расширения — любым удобным способом:
   ```sh
   git clone https://github.com/PoWaR85691/testo-helper-zed
   ```
   либо скачайте ZIP-архив и распакуйте его.
2. В Zed откройте палитру команд (`Ctrl+Shift+P`) → **`zed: install dev
   extension`** → выберите папку `testo-helper-zed`.
   Либо: раздел **Extensions** → кнопка **Install Dev Extension** → та же папка.
3. Zed соберёт расширение. При первом открытии файла `.testo` запустится
   языковой сервер.

> Если у вас уже была установлена версия расширения из реестра, dev-версия её
> заменит — в списке появится пометка «Overridden by dev extension».

## Проверка

Откройте любой файл `.testo`. Должны работать подсветка, наведение мыши,
переход к определению по `Ctrl+Click` и сниппеты.

## Дополнительные возможности

Часть функций включается отдельно:

- **Счётчик шагов `step`** — это inlay hints. Включите их в `settings.json`:
  ```json
  { "inlay_hints": { "enabled": true } }
  ```
- **Форматирование** — вызовите действие `editor: format` из палитры команд.
  Чтобы форматировать при сохранении:
  ```json
  { "languages": { "Testo": { "format_on_save": "on", "formatter": "language_server" } } }
  ```
- **Открытие тест-кейса в Jira** — задайте `jiraBaseUrl` (см. ниже), откройте
  файл вида `PROJECT-T1234.testo` и вызовите `editor: toggle code actions`.

## Настройки

```json
{
  "lsp": {
    "testo-helper-lsp": {
      "settings": {
        "jiraBaseUrl": "https://jira.company.ru/secure/Tests.jspa#/testCase/",
        "enableImageHover": true,
        "enableDocsHover": true,
        "enableMacroHover": true
      }
    }
  }
}
```

| Настройка | Что делает | По умолчанию |
|-----------|------------|--------------|
| `jiraBaseUrl` | Базовый URL Jira для открытия тест-кейса. Должен заканчиваться на `/` | — |
| `enableImageHover` | Превью изображений при наведении | `true` |
| `enableDocsHover` | Документация встроенных функций | `true` |
| `enableMacroHover` | Документация макросов | `true` |

## Обновление до новой версии

```sh
cd testo-helper-zed
git pull
```

Затем в Zed снова выполните `zed: install dev extension` для той же папки и
перезапустите Zed.

## Диагностика

- Язык файла должен быть **Testo** (проверьте в статус-баре в правом нижнем
  углу).
- Логи: палитра команд → **`zed: open log`**.
- Подробный вывод: запустите Zed из терминала командой `zed --foreground`.
