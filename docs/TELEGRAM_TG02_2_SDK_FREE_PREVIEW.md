# TG-02.2 — SDK-free Telegram preview

**Результат: PREVIEW ОПУБЛИКОВАН И LIVE-ПРОВЕРЕН.** Это статическая веб-игра, открываемая внутри Telegram. Текущий Telegram CDN SDK в программу не включён и не загружается. Его актуальный license scope этим релизом не переопределяется.

## Релиз и публикация

- Source baseline: `894ea26501a44b0a4fbacc35bf5637e0807fd7fe`.
- GitHub: `mistermetes-cloud/ShashBesh`.
- Branch: `feature/telegram-mini-app-preview`.
- Preview commit: `ad692a0e7440f6da8cd5641fb2d7f2e061cdc5af`.
- This report is a documentation-only follow-up; the app/source release commit above and its published assets remain unchanged.
- GitHub push: успешный обычный push новой ветки.
- Cloudflare Pages project: `shashbesh`.
- Deployment ID: `2f1d39a7-3342-4a8e-be2f-89ad2695af11`.
- Deployment status: success.
- Preview URL: <https://2f1d39a7.shashbesh.pages.dev/>.
- Telegram entry: <https://2f1d39a7.shashbesh.pages.dev/telegram/>.

Cloudflare подтвердил SHA `ad692a0…` в GitHub check `Cloudflare Pages`. Production branch остался на `894ea26501a44b0a4fbacc35bf5637e0807fd7fe`; `main` остался на `af46155eff2a49780925109895bfa9a4924d4073`. Эти refs проверены в GitHub API после deployment. Production не публиковался и не запускался.

## SDK и архитектура

- `/telegram/` — второй Vite HTML input, который загружает тот же `/src/main.tsx`, что и `/`.
- Проверенная сборка создаёт один общий игровой JS payload. Дублированной реализации игры нет.
- В сборке и соответствующем source archive отсутствуют SDK loader `telegramSdk.ts` и `telegram-entry.ts`.
- Веб platform adapter этого preview возвращает только обычный browser context. Страница не читает `window.Telegram`, `initData` или `initDataUnsafe` и не вызывает Telegram API.
- Поисковые проверки собранных JS/CSS/HTML не нашли CDN URL, Telegram WebApp API, WebSocket, online-room/API markers или секреты известных форматов.
- Историческая TG-01 SDK-совместимая реализация остаётся в сохранённом архиве TG-01 и не используется этой публикацией.
- Ранее найденное различие между MIT-лицензированным upstream SDK и текущим CDN-файлом остаётся неразрешённым. Здесь SDK полностью исключён, поэтому он не является частью лицензируемого состава preview.

## Лицензии, источник и безопасность

- Owner code: GPL-3.0-only; owner-controlled content: CC BY 4.0; third-party notices сохранены.
- LICENSE_GATE: PASS для состава этого SDK-free preview.
- SECURITY_GATE: PASS в проверенном объёме: нет Telegram identity/auth, bot token, backend, online rooms, API-вызовов, WebSocket или внешних запросов браузера во время проверенных игровых сценариев. npm lock/dependencies не менялись.
- Source archive URL: `/shashbesh-source.tar.gz`.
- Source archive SHA-256: `bb8e114fb3a45060abbe5f932817476eeec6efe52ea451309a42a216a0387d33`.
- Source manifest SHA-256: `8a413545906145417a88e7a40691db7ca2f474ea71fd034a0d2804aeb525c1a7`.
- Archive contains 113 allowlisted source payload files plus the manifest/checksum. It excludes the SDK loader, TG-01 Telegram adapter implementation, private project files, model weights, datasets, credentials, `node_modules`, build output and Git history.
- Live archive returned HTTP 200; its downloaded bytes matched the local archive exactly, and all archive members matched the manifest.
- Live response headers included `Referrer-Policy: strict-origin-when-cross-origin` and `X-Content-Type-Options: nosniff`. No CSP header or CSP meta tag was present. No security header or Cloudflare setting was changed.

## Runtime и проверки

- Node.js: `v22.16.0`; clean offline `npm ci`: PASS (130 packages; lockfile unchanged).
- TypeScript: PASS.
- Existing game tests: 114/114 PASS.
- SDK-free output/source/license checks: 3/3 PASS.
- Local Firefox browser: 5/5 PASS (2 entry points, local 2–4 players, AI, dice, locales, keyboard/touch source link, archive integrity, no external/API/WebSocket calls).
- Build: `npm run build:public-preview` PASS; offline/security/source checks included.
- Live Firefox: PASS for `/` and `/telegram/`, HTTP 200, board/dice, Human-vs-AI, local 2/3/4 players, nine locales, clickable source download, no external requests, API calls, WebSockets or page errors.
- Published JavaScript SHA-256:
  - `assets/main-DJxVTN0v.js`: `7a4fbe094bed83d8468a074d0690942ac91fd5b5ddfc6a05301d76d97061ee2b`
  - `assets/RulesContent-4TOfURjV.js`: `2b43227c9f067ff612541b540be5d3d4f73d478a26f19bf728c9392b0eb31317`
- Published CSS SHA-256:
  - `assets/main-ChBztg36.css`: `a76091644cac5cd38ff075a2271607b931e128ae61d7c5bf52317bdede012598`

Browser checks ran in Firefox, including a mobile viewport/touch context. **Tests inside a real Telegram Android/Desktop/iOS client have not run**, so Telegram client acceptance remains with the owner.

## Изменённые release-файлы

- `apps/web/telegram/index.html`
- `apps/web/vite.config.ts`
- `apps/web/src/platform/index.ts`
- `SOURCE_DISTRIBUTION.md`
- `apps/web/public/SOURCE_DISTRIBUTION.md`
- `SOURCE_FILES.json`, `SOURCE_FILES.sha256`
- `apps/web/public/shashbesh-source.tar.gz`, `.sha256`
- `scripts/package-source.py`, `scripts/verify-public-preview.mjs`
- `package.json`
- `playwright.sdk-free.config.ts`
- `tests/browser/sdk-free-telegram.spec.ts`
- `tests/sdk-free-output.test.ts`

Game Core, canonical rules, dice/AI logic, Arena, Workers, Galaxy, AI Lab и production source не изменялись.

## @battle6x5_bot — ручная настройка BotFather

Bot token для статической игры не нужен; он не запрашивался и не сохранялся. Удалённые настройки бота не менялись.

1. В `@BotFather` откройте `/mybots` и выберите существующий `@battle6x5_bot`.
2. **Перед заменой** уже настроенной menu button запишите её текущие label и URL. Если меню активно, его замена изменит существующий запуск; сначала подтвердите это для себя.
3. В Bot Settings → Menu Button (или `/setmenubutton`) задайте выбранную подпись и URL `https://2f1d39a7.shashbesh.pages.dev/telegram/`.
4. В настройке Main Mini App укажите тот же HTTPS URL, если хотите запуск из профиля бота.
5. На Android откройте приложение именно из Telegram и проверьте touch, AI, локальную игру 2–4 игроков, языки и скачивание исходника. Запишите версию Telegram/Android и наблюдения. До такого прогона реальная Telegram-совместимость не подтверждена.

## Сохранность и замечание о staging

Основное дерево (`716` файлов) и исходная TG-01 рабочая копия (`123` файла) совпали с preservation hash snapshots; архив TG-01 и исходный patch SHA-256 совпали с сохранёнными значениями. Galaxy, AI Lab, Arena и production не изменялись.

При первом push у временного clone `origin` указывал на локальную TG-01 копию. Это создало там только дополнительный Git branch ref на тот же commit; исходные файлы, index и архивы остались byte-identical. Исправленный push выполнен напрямую в GitHub. Ни один production/main ref этим не затронут.
