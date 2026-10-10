# Актуальное состояние —v0.3.1-alpha / подготовка публичного релиза

Локальная версия подготовлена: README RU/EN, CHANGELOG, INSTALLATION, ROADMAP, release notes, безопасный .gitignore, отдельный alpha APK/code5. Движок/правила/CSV/модели неизменны. LAN/Wi-Fi, AI Evolution Lab и нейросетевые турниры —в разработке. Лицензия не выбрана.

Проверки58/58 TS,3/3 Python;7 уникальных Firefox сценариев подтверждены (5 в совместном прогоне,2 после отдельного повторного запуска; исправлено ожидание DOM в тесте). Web/tsc и Android build успешны. APK подпись/CRC/ресурсы/package проверены, прежние APK сохранены. Публичный source tree проверен на секреты и личные пути, датасеты/эксперименты/ключи локальны.

Origin: https://github.com/mistermetes-cloud/ShashBesh —подтверждённая цель. GitHub CLI установлен локально, но auth отсутствует; push/repository creation/GitHub Release не выполнены. Требуется gh auth login --hostname github.com --git-protocol https --web и проверка доступа. Публичная main имеет отдельный root; master и recovery-ветки/архивы сохраняют старую историю с локальными путями. develop/ai-lab и tagv0.3.1-alpha фиксируются на проверенной public версии. Force push и лицензирование не выполнялись.

Отчёт: [PUBLIC_RELEASE_REPORT.md](docs/PUBLIC_RELEASE_REPORT.md). Команды публикации: [PUBLICATION.md](docs/PUBLICATION.md). APK и checksum: artifacts/release-v0.3.1-alpha/. Физическая Android/Wi-Fi приёмка остаётся следующим этапом.

---

История предыдущих этапов (локальные пути очищены для публикации):

# Актуальное состояние — SHASHBESH MOBILE, 10.10.2026

Мобильный UI настольной игры реализован: простая главная, Tactical по умолчанию, 2–4 человека на устройстве, поле CSV с реальными фишками/двумя центральными кубиками, выбор фишки/клетки, цвет активного дома, отмена и скрытая история. Технический UI, все агенты, экспорт/обучающие данные/журнал сохранены через меню. Старые локальные сохранения мигрируют без потери данных; предыдущие партии архивируются.

Правила, Engine/shared, модели и геометрия НЕ изменены: SHA256 guard14 файлов и пустой Git diff защищённых каталогов. Автоматические проверки58/58 TS,3/3 Python;7 разных Firefox сценариев прошли (5 в основном прогоне,2 новых и повтор Wi-Fi в дополнительном). Проверены CSS360×800/393×873 и обе альбомные ориентации, simulated safe areas, нет прокрутки/перекрытий; подготовлено6 PNG. Физические телефоны пока отсутствуют.

APK_STATUS: READY. Новый APK org.shashbesh.game v0.3.1-mobile/code4, debug подпись совпадает с предыдущей; ресурсы совпали с production build. Файл: `<PROJECT_ROOT>/artifacts/mobile/shashbesh-mobile-v0.3.1-debug.apk`. SHA256 `b49f40c0e26b144c86d8b1c6098d99033705eb46b0df87ade8a9bc6d7a0c71f2`. Build: npm run android:mobile, отдельный build-mobile, offline Gradle1m38s успешен. Первая попытка была отменена при отключении Gradle-клиента; итоговая завершена exit0.

Предыдущий android/app/build/outputs/apk/debug/app-debug.apk сохранён по прежнему пути и копией в artifacts/mobile/previous-v0.3-debug.apk, hash8f3fc0fee424a7ee8cfcb3f9ea4ad238ba416949e32ca49455795b90398caa8e не изменился. Новые изменения не закоммичены/не опубликованы.

Следующий шаг: согласовать скриншоты и проверить APK на Huawei P Smart2021/RealmeRMX3630, включая физический Wi-Fi/NSD и offline игру. Browser discovery ограничен известным адресом; native NSD реализован ранее, но не выдаётся за протестированный на телефоне. Полный отчёт: [MOBILE_UI_REPORT.md](docs/MOBILE_UI_REPORT.md).

---

Ниже — история предыдущих этапов.

# Актуальное состояние — Android debug release, 10.10.2026

APK_STATUS: READY. ANDROID_BUILD: BUILD SUCCESSFUL, 85 tasks, первая сборка19m39s.

APK: `<PROJECT_ROOT>/android/app/build/outputs/apk/debug/app-debug.apk` — 4253550 байт, SHA256 `8f3fc0fee424a7ee8cfcb3f9ea4ad238ba416949e32ca49455795b90398caa8e`. Проверены ID org.shashbesh.game, SDK23/35, LAN permissions/cleartext, подпись v1/v2, native классы и совпадение bundled web assets/нейросети с последней сборкой.

Установлены локальные JDK21, SDK35, tools/Gradle; системные настройки и глобальная Java не изменены. Добавлен Android-host: native HTTP/WebSocket transport использует существующий Engine/Authority. Ubuntu может подключаться по IP телефона; Android может размещать комнаты либо подключаться к Ubuntu. Данные комнат восстанавливаются, client state только подтверждённый, кубики принадлежат узлу.

Проверки: 56/56 TS, 3/3 Python, все3 Firefox сценария (game/AI повторён после HMR), 1/1 native Java transport LAN test. Web/TypeScript и Android build успешны. На физическом устройстве не проверено — adb devices пуст. Android-host требует открытого приложения, не background service.

Git локально инициализирован; состав исходников/модели/документации проверен перед первым коммитом. .gitignore исключает toolchain, builds, APK/keys, artifacts/local configs; remote отсутствует, публикации нет. CSV CRLF сохранён .gitattributes. Никакие пользовательские файлы не удалялись и не откатывались.

Следующий шаг: установить APK на телефон и выполнить [ANDROID_DEVICE_TEST_PLAN.md](docs/ANDROID_DEVICE_TEST_PLAN.md) в обе стороны. Подробные результаты: [ANDROID_LAN_REPORT.md](docs/ANDROID_LAN_REPORT.md); воспроизводимая сборка: [ANDROID_BUILD_GUIDE.md](docs/ANDROID_BUILD_GUIDE.md). Контрольные AI результаты сохранены, превосходство над Tactical не заявляется.

---

Ниже история проверок до Android release, включая прежние уже устранённые toolchain блокеры.

# Актуальное состояние — 10.10.2026, аварийное восстановление / v0.3

PROJECT_STATUS: PARTIAL. Engine/Desktop/AI/Statistics прошли локальные проверки. Git отсутствует как действующий репозиторий. Android-проект подготовлен и синхронизирован, APK заблокирован отсутствием JDK21/SDK35.

Последняя завершённая часть: v0.3 интерфейс/история/отмена/автосохранение и LAN реализация с локальными контрольными проверками. Прерванная часть: итоговые отчёты, актуализация Android assets, приёмка APK/реального Wi-Fi. Документация и assets восстановлены без удаления/отката данных. Минимально исправлены запоздалые callbacks поиска Android NSD; native compile ещё не проверен.

Проверки: 55/55 TS (в том числе 4 WS клиента), 3/3 Python, 3/3 Firefox (включая AI v0.1, undo/history/dice/persistence, 2 LAN браузера/reconnect). TypeScript/production build успешны: 55 модулей, JS377.49kB/gzip131.64kB. cap sync успешен. android:build реально exit2: отсутствует Java. Исходные JSON/XML: 26 проверены без ошибок. Зависимости npm разрешены. Результаты в artifacts/recovery; правила и CSV не изменены. drand/DiceChain/блокчейн/токены не реализованы; исследовательские каталоги пока отсутствуют. GitHub публикации не выполнялись.

Следующий шаг: подготовить JDK21/SDK35 и собрать APK, затем проверить native NSD и два физических устройства Wi-Fi. Предыдущие 1053 симуляции и контрольные турниры нейросети сохранены, повторное обучение не запускалось. Превосходство v0.1 над Tactical не заявляется.

Подробно: [PROJECT_RECOVERY_REPORT.md](PROJECT_RECOVERY_REPORT.md), [ANDROID_LAN_REPORT.md](docs/ANDROID_LAN_REPORT.md).

---

# Состояние ShashBesh AI — 09.10.2026

## Этап 5 — ShashBesh AI v0.1, завершён

Первая обучаемая сеть реализована, обучена на Tactical, проверена на невстречавшихся партиях и интегрирована в CLI/UI как `ai-v0.1`. Random/Greedy/Tactical сохранены. RULES_V1.md и CSV не изменены.

- Архитектура: 269 → 24 tanh → 1, 6505 параметров; NumPy CPU для обучения, TypeScript для inference. Выход — логит предпочтения, а не вероятность выигрыша.
- Проверены 19 044 записи; 14 276 Tactical-решений. Использованы существующие JSONL/числовые признаки и 64 новые завершённые teacher-партии. Проверяются before/after, маска, выбор, кубики, захваты и результат. Existing export 201 строк совпал с исходным replay/признаками.
- Game-level split: train 11 221 решений/55 партий, validation 411/2, test 2644/9. Пересечений нет; X не содержит outcome/after/seed/следующего броска. Одна дополнительная Greedy source-партия проверена, но не входит в supervised fit.
- Обучение: Adam lr .002, batch 64, 12 эпох, seed 20261009; выбран checkpoint эпохи 11 по validation loss. Время цикла 11.19 с, CPU 7.64 с, peak RSS 222.24 МиБ. До запуска оценены 2 ядра Pentium B970, 8 ГБ RAM, доступно ~3.8 ГБ; budget 120 с/512 МиБ, один BLAS-поток.
- Unseen test: точный top-1 69.06%, deployment-equivalent 73.22%; реальный выбор 52.26% (1483 случая). Validation только 2 партии — явное ограничение.
- Контроли: 144/144 завершены, 24 парных seed ×2 места на соперника. NN занимает каждое физическое место и начинает по 24 раза. Победы NN: Random 41/48 (85.42%), Greedy 34/48 (70.83%), Tactical 19/48 (39.58%). Превосходство над Tactical/оптимальность не заявляются. Все журналы и контрольные seed сохранены.
- Self-play: только 2 короткие exploratory партии, 432 перехода, обе стороны/награды/вероятности/хеш модели сохранены. Веса не обновлялись. Подготовлен и проверен signed-return policy gradient; длительный цикл не запускался.
- Версии: сохранённый v0.1, active-model, registry active/previous/checksum/parent. Сравнение candidate/champion на paired seeds, promotion gate, monitor и rollback. При promotion файл архивируется по хешу; откат восстанавливает точные веса. У первой v0.1 previous пока отсутствует.
- UI содержит выбор ShashBesh AI v0.1; данные и журнал фиксируют его версию. Решения принимаются по свежей максимальной маске, повторно валидируются Engine; checkpoint заморожен на rollout.

Проверки: **47/47 TypeScript-тестов**, **3/3 Python-теста**, **1/1 Playwright**. Браузер проверил новую модель против Tactical до победы и экспорт её решений. Исправлена ESM-загрузка JSON (import attribute); visual deadline учитывает двухъядерный CPU и задержки UI. TypeScript/production build успешны (45 модулей, JS ~350.89 KB, gzip ~122.77 KB).

Артефакты: packages/agents/models/shashbesh-v0.1.json, active-model.json, registry.json; artifacts/ai-v01/{data,training-config.json,training-metrics.json,tournaments,selfplay,inference-oracle.json,resource-assessment.json}. TAP: artifacts/ai-v01/tests-final.tap. Python requirements: NumPy 2.2.6; игра не требует Python.

Полный отчёт: docs/AI_TRAINING_REPORT.md. Следующие шаги: больше validation/control партий, проверенная симметрийная augmentation CSV, учёт допустимых продолжений текущего броска, value head/advantage и ограниченный self-play fine-tuning с проверкой ресурсов и champion gate. Ничего из этого не выдаётся за уже обученную v0.2.

```bash
npm run dev
npm run tournament -- --games 20 --seed demo-v01 --agents ai-v0.1,tactical
npm run ai:prepare -- --games 64
npm run ai:train -- --output artifacts/ai-v02/candidate.json --model-version "ShashBesh AI v0.2" --epochs 12 --max-seconds 120
npm run ai:evaluate -- --pairs 24 --seed-prefix control-v01
npm run ai:selfplay -- --games 2
npm run test:neural-python
npm test
npm run build
```

Ниже — история предыдущих этапов, её числа относятся к прежним версиям проекта.

## Текущее продолжение — 4 этапа

Завершены расширенная проверка 1053 партий, подготовка данных нейросети, журнал v2 и доработка наблюдения AI-vs-AI. Правила RULES_V1.md и CSV не изменены. Базовые боты остались random/greedy/tactical; обучение весов собственной нейросети пока не выполняется.

| Этап текущего запроса | Реализация | Проверки |
|---|---|---|
| 1. Симуляции | Все 117 упорядоченных сочетаний для 2–4 игроков, по 9 партий; seed каждой сохранён, статистика ходов/бросков/позиций/агентов/сбитий/кубиков; suspicious JSONL + sidecar; возобновление и точное воспроизведение | 1053/1053 победы; 0 подозрительных; 117 replay; 4 теста метрик/диагностики; отдельные 3 timeout-партии сохранены и одна точно воспроизведена |
| 2. Данные обучения | packages/training: состояния до/после, actor, dice, legal mask, действие/pass, captures, автор, финальные labels; четыре режима, JSON Schema, encoder, game-level split | 4 теста; self-play CLI: 201 запись, каждая прошла независимую JSON Schema; manifest и признаки сохранены |
| 3. Проверяемая цепочка | v2: eventId, gameNumber, seq, UTC timestamp, prevHash/hash, действие/автор; чтение v1, checkpoint и audit CLI | 3 теста: wall replay, подмена времени/ID, обрезание хвоста, v1 compatibility; CLI повторно проверил checkpoint из 498 событий |
| 4. UI | Поле и дома CSV, 2–4 игрока ×5, два кубика, легальные ходы и журнал; явная кнопка наблюдения; экспорт данных ИИ и контрольного хеша; UTC-время истории | Playwright 1/1: ручной ход, v2 JSONL, обучающий экспорт, checkpoint, mobile, replay, пауза/возобновление, AI-vs-AI до победы |

Итоговый набор: **39 тестов passed, 0 failed**, browser 1 passed, TypeScript и production build успешны. TAP: artifacts/tests-next.tap. Lockfile включает новый workspace training.

Статистика сбалансированной серии: 100% завершения; ходы среднее 166.80, минимум 37, максимум 387; броски среднее 214.48, минимум 53, максимум 496. 32 543 сбития. Дубли 37 922 (16.791%), 6–5/5–6 12 491 (5.531%), всего 225 850 бросков. Доля всех побед: random 19.09%, greedy 30.10%, tactical 50.81%. Проценты на собственное участие и влияние физических мест/порядка после жребия — docs/SIMULATION_REPORT.md.

Артефакты: artifacts/validation-1053/summary.json и results.json; первые 1000 также сохранены отдельно. Контрольные seed для 2/3/4 игроков сохранили прежний state hash после расширения журнала (metadata-regression.json). Подозрительных партий в основной серии нет; механизм сохранения проверен в artifacts/diagnostic-test/suspicious. Порог 5000 бросков относится только к диагностике, не к правилам.

Документы: docs/SIMULATION_REPORT.md, docs/TRAINING_DATA.md, docs/EVENT_CHAIN.md, актуализированные README и TEST_REPORT. Криптографическая цепочка подготовлена к внешнему адаптеру, отдельная блокчейн-сеть/подписи не создавались. Реальное время записывается UI/CLI внешним clock; чистое ядро использует явно помеченное логическое время. Часы не влияют на игровые действия.

```bash
npm run dev
npm run validate:simulations -- --games 1053 --seed validation-v2 --output artifacts/validation-1053
npm run reproduce -- --metadata artifacts/diagnostic-test/suspicious/game-0.json --output artifacts/reproduced.jsonl
npm run dataset -- --input artifacts/training-self-play.jsonl --output artifacts/training/decisions.jsonl
npm run audit -- --input artifacts/training-self-play.jsonl --output artifacts/training/checkpoint.json
```

Ниже — сохранённая история первоначальной реализации; её числа относятся к прежнему этапу.

Локальная игра реализована и проверена: 2–4 игрока, человек/человек, человек/AI, AI/AI, три стратегии, CLI турниров, журнал и повторы. Согласованные RULES_V1.md и координаты CSV не изменены. Рабочие трактовки отмечены отдельно в docs/OPEN_RULE_QUESTIONS.md и сохраняются в журнале.

## Аудит и план

Прочитаны START_HERE_CODEX.md, исходный README, все документы docs, CSV, PNG и обе таблицы XLSX. Исходного кода не было. CSV соответствует эталонам; PNG/XLSX не являются источником координат для приложения.
Среда: Node v20.20.2, npm 10.8.2, Linux. Каталог .git не является рабочим Git-репозиторием; коммиты не выполнялись. Деплой не выполнялся.

Выбран TypeScript-монорепозиторий: engine → shared types → agents → tournament CLI → React/Vite web. Порядок реализации: аудит → геометрия → движок → журнал → AI → UI → итоговые проверки.

## Этапы и проверки

| Этап | Результат | Проверка |
|---|---|---|
| 0. Аудит | спецификация, стек, среда, визуальная сверка | все исходные документы прочитаны; исходного кода нет |
| 1. Геометрия и типы | CSV BOM/кириллица, 48+16 уникальных клеток, 4 общих входа | T01–T03, отказ на некорректном CSV, TypeScript |
| 2. Движок | жребий, очередь, независимые броски, дубль/5–6, максимальная сумма, движение, сбития, обязательные углы, дом, атомарная победа | T04–T27; исправлены ошибочные тестовые расстановки, итог без ошибок |
| 3. Журнал | неизменяемые события, канонический SHA-256, JSONL, replay через движок | T28–T30, завершённая игра и одинаковый state hash; подмены/обрыв отклоняются |
| 4. AI и турниры | random/greedy/tactical, публичное наблюдение, ротация мест, статистика | 3 smoke-партии и 100 партий до победы, 0 тайм-аутов; T31 |
| 5. UI | поле CSV, фишки, кубики, допустимые действия, режимы, скорость/пауза, журнал, импорт/экспорт, ползунок повтора, мобильная сетка | T32 SSR + Playwright desktop/mobile, ручной ход и AI/AI до победы |
| 6. Сдача | README, TEST_REPORT, OPEN_RULE_QUESTIONS, lockfile, инструкции | 28/28 unit/property/integration; 1/1 browser; production build успешен |

## Итоговые результаты

- `npm test`: 28 passed, 0 failed после форматирования. Fast-check: 25 seed × 12 бросков; интеграционный тест отдельно проводит 100 симуляций.
- `npm run build`: TypeScript без ошибок, Vite 41 модуль, JS 258.74 KB (gzip 82.54 KB).
- `npm run test:browser`: 1 passed; проверены ручной ход, запрет преждевременного броска, экспорт, импорт победного replay, ползунок, мобильная ширина, пауза/возобновление и AI-vs-AI до победы. Использован установленный Brave/Chromium через SHASHBESH_BROWSER_PATH.
- CLI 100 игр, seed acceptance-v1: 100 побед, 0 тайм-аутов, среднее 161.11 броска; tactical 56, greedy 26, random 18; 2047 сбитий, 1091 прыжок, 109647 использованных номинальных очков. Стратегии не объявляются оптимальными.
- Артефакты: artifacts/acceptance-100.json, acceptance-first.jsonl, tests.tap, desktop.png, mobile.png. Скриншоты визуально проверены.

История исправлений тестов и подробное покрытие T01–T32: docs/TEST_REPORT.md. Перезапуск сервера прервал первоначальную установку; зависимости установлены, lockfile сохранён. Браузерному прогону потребовались исправление ожидания повторного жребия, явные доступные названия селектов и повтор после перезагрузки Vite при форматировании. Финальные проверки успешны.

## Запуск

```bash
npm ci
npm run dev
# http://127.0.0.1:5173
npm test
npm run build
npm run tournament -- --games 100 --seed acceptance-v1 --agents random,greedy,tactical --output artifacts/tournament.json --replay artifacts/first-game.jsonl
```

Браузерные тесты: `npx playwright install chromium`, затем `npm run test:browser`; для установленного Chromium задайте SHASHBESH_BROWSER_PATH.

## Явные ограничения

- Политики Q1/Q2/Q4/Q5/Q6/Q7 из EDGE_CASES.md не объявляются согласованными уточнениями; они перечислены в OPEN_RULE_QUESTIONS.md и записаны в первом событии партии.
- Боты базовые, без обучения; турниры доступны через CLI.
- Импорт предназначен для просмотра повтора, не для продолжения импортированной партии. Текущая партия доступна после возврата из повтора. Для хранения перед закрытием страницы экспортируйте JSONL; автосохранения нет.
- Журнал содержит все события, UI показывает последние 100; вся история доступна в экспорте и ползунке повтора.
- Без внешнего контрольного хеша журнал не защищён от полной подмены; seed не доказывает независимость выбора организатора.
- Диагностический лимит симулятора не меняет правила и не назначает победителя. Серии дополнительных бросков в движке не ограничены.

## SHASHBESH v0.3 — этапы 1–3, 10.10.2026

Панель игрока объединяет имя, два кубика и кнопку броска. Цвет соответствует активному игроку; последний бросок остаётся после передачи очереди неактивным; отдельная память результатов каждого игрока. Дубль отображает четыре доступных единицы действия (по две на грань), дополнительный бросок отмечен до его реализации.
История предоставляет оригинальные before/after, dice, piece/path/captures/time, выделение начала/конца, без изменения live state. Отменённые записи помечены и остаются в журнале.
Отмена человека добавляет undo_action и восстановление через проверенный replay. Можно отменять собственные действия незавершённого хода, включая перед дополнительным броском; передачи очереди и победа являются границами отмены. Уже увиденные последующие кубики сохраняются в pendingRolls и повторно используются — RNG при отмене не вызывается. Отменённые действия исключаются из экспортируемых обучающих решений, исходная цепочка остаётся полной.
Проверки интерфейса/истории/undo: 52/52 существующих и новых теста passed, TypeScript/build passed. Первоначально тест сбития создавал позицию вручную без событий; заменён воспроизводимой расстановкой через полные законные ходы. Исполняемые команды добавляются по стадиям; правила и CSV не менялись.
Для Android добавлено IndexedDB autosave/replay restore; RNG восстанавливается по фактическим броскам, сохранившиеся результаты не перегенерируются. Android toolchain проверяется следующим этапом: Java/SDK/adb отсутствуют.

## v0.3 — этап 4, Android
Capacitor 7.6.9 установлен и зафиксирован в lockfile (совместим с текущим Node 20). Нативный android/ проект с Gradle wrapper 8.11.1 сгенерирован; minSdk 23, compile/targetSdk 35. Прежний Ubuntu/Vite интерфейс сохраняется; web assets/движок/AI bundled для offline. Индексированное сохранение и replay restore, адаптация ориентации, touch action controls.
Добавлен нативный NSD plugin для _shashbesh._tcp. и network/Wi-Fi permissions. runtime/Java compilation пока не проверены на устройстве.
`npm run android:build` выполнен: остановлен с кодом 2, отсутствует Java JDK 21. Также отсутствуют Android SDK/adb. Подготовлен scripts/android-build.sh; APK не выдаётся за собранный. `cap add android` и копирование web assets прошли. После подготовки: 53/53 существующих теста passed, web build/TypeScript passed.
Следующий этап: авторитетный LAN-host на Ubuntu, Android/Firefox клиенты по WebSocket, mDNS/NSD discovery и IP fallback.
