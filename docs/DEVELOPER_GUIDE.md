# Шашбеш Mobile

Основной экран: где играть, с кем и сколько игроков. Обычный компьютер использует Tactical. В партии нажимайте центральные кубики, выбирайте фишку и подсвеченную клетку; после окончания действий касание кубиков завершает бросок. Отмена доступна человеку до передачи очереди. История, архив, экспорт и прежний технический UI доступны через «Меню» → «Дополнительные возможности».

```bash
npm run dev
npm run lan:dev
npm run android:mobile
```

Новый APK: artifacts/mobile/shashbesh-mobile-v0.3.1-debug.apk. Старый android/app/build/outputs/apk/debug/app-debug.apk сохранён. Mobile build использует отдельный build-mobile и локальный Gradle кэш; не заменяет прежнюю сборку. Физическая установка/NSD пока не проверены. Скриншоты, результаты и ограничения: [MOBILE_UI_REPORT.md](docs/MOBILE_UI_REPORT.md).

---

Ниже сохранена техническая документация всех режимов.

# Шашбеш AI

Локальная стратегическая игра для 2–4 игроков: человек/человек, человек/бот и AI/AI. Пять фишек у каждого игрока, 48 клеток внешнего маршрута и 16 внутренних клеток домов. Движок проверяет ход и максимальную сумму использованных номиналов; интерфейс и боты не определяют допустимость самостоятельно.

## Запуск

Нужны Node.js 20.19+ и npm.

```bash
npm ci
npm run dev
```

Откройте http://127.0.0.1:5173. Выберите 2–4 игроков и их типы, нажмите «Начать новую партию». Для ручной игры бросьте жребий, затем кубики; выберите допустимое действие в списке или целевую клетку. После использования доступных действий завершите бросок. Для соревнования ботов назначьте всем игрокам стратегии и нажмите «Запустить ботов»; доступны пауза, скорость и один шаг.

Seed необязателен: с ним кубики воспроизводятся, без него используется Web Crypto с rejection sampling для честного d6. Игровые броски и выбор ботов имеют раздельные генераторы. После установки зависимостей игра не требует внешних сервисов.

```bash
npm test
npm run build
npm run tournament -- --games 100 --seed acceptance-v1 --agents random,greedy,tactical --output artifacts/tournament.json --replay artifacts/first-game.jsonl
```

CLI принимает 2–4 агента (`random`, `greedy`, `tactical`, `ai-v0.1`), вращает их по местам, сохраняет статистику и версии правил/политик. `--max-rolls 5000` — диагностический предел симуляции, не изменение игровых правил. При тайм-ауте победитель не назначается, CLI возвращает код 2. При успешной серии код 0. Одинаковый seed и состав дают одинаковый результат; стратегии не заявлены оптимальными.

## Журнал и повторы

«Экспорт журнала» сохраняет JSONL. «Открыть повтор» проверяет SHA-256 цепочку и повторно проигрывает каждое действие через движок; ползунок показывает состояния после команд. Повтор можно открыть до завершения игры. Импорт не заменяет текущую игру; «Вернуться к игре» возвращает её. Локальная игра автоматически сохраняется в IndexedDB и восстанавливается после перезагрузки через проверенный replay. Экспорт JSONL остаётся способом отдельного резервного сохранения.

События append-only, включают жребий, кубики, действия, сбития, фиксацию фишек, завершение бросков, очередь и победу. Хеш-цепочка обнаруживает изменение сохранённого журнала. Без внешнего контрольного хеша она не доказывает невозможность полной подмены партии. Seed не доказывает независимость выбора организатора.

## Структура

- `packages/shared`: типы состояния, действий, событий, политики.
- `packages/engine`: импорт CSV, чистые переходы, максимальные последовательности, фазы, журнал, replay, RNG.
- `packages/agents`: Random/Greedy/Tactical, нейросеть v0.1 и публичное наблюдение.
- `packages/tournament`: симулятор и CLI статистики.
- `apps/web`: React/Vite, поле и управление.
- `tests`: unit, property-based, integration, browser.

Геометрия импортируется только из [data/igra_64_koordinaty.csv](data/igra_64_koordinaty.csv). PNG/XLSX служат визуальной сверкой. Приоритет правил: [RULES_V1.md](docs/RULES_V1.md). Рабочие трактовки Q1/Q2/Q4/Q5/Q6/Q7 вынесены в [OPEN_RULE_QUESTIONS.md](docs/OPEN_RULE_QUESTIONS.md), записываются в RulePolicy журнала и не объявляются согласованными уточнениями.

Браузерная проверка (нужен браузер Playwright или установленный Chromium):

```bash
npx playwright install chromium
npm run test:browser
# Для своего Chromium: SHASHBESH_BROWSER_PATH=/path/to/chromium npm run test:browser
```

Отчёт: [docs/TEST_REPORT.md](docs/TEST_REPORT.md). Текущее состояние: [PROJECT_STATE.md](PROJECT_STATE.md).

## Расширенная проверка и подготовка обучения

Проверено 1053 партии: все 117 упорядоченных составов 2–4 игроков по 9 повторов. Завершение 100%, среднее 166.80 хода игрока, 32 543 сбития. Полные проценты побед, влияние места/очередности и частоты кубиков: [SIMULATION_REPORT.md](docs/SIMULATION_REPORT.md).

```bash
npm run validate:simulations -- --games 1053 --seed validation-v2 --output artifacts/validation-1053
# Продолжить сохранённую серию: добавить --resume
npm run reproduce -- --metadata artifacts/diagnostic-test/suspicious/game-0.json --output artifacts/reproduced.jsonl
npm run dataset -- --input artifacts/training-self-play.jsonl --output artifacts/training/decisions.jsonl
npm run audit -- --input artifacts/training-self-play.jsonl --output artifacts/training/checkpoint.json
```

Новая кнопка «Наблюдать AI vs AI» запускает наблюдаемую партию; пауза и скорость сохраняются. «Экспорт данных ИИ» выгружает проверенные решения человека/бота, включая вынужденные пропуски, с состояниями до/после, маской допустимых ходов и итоговыми метками. CLI датасета дополнительно создаёт числовые признаки и manifest для собственной нейросети. Поддерживаются human-human, human-ai, ai-ai и self-play; на этапе подготовки веса ещё не обучались; текущая обученная v0.1 описана ниже. Формат и предотвращение утечки результата в признаки: [TRAINING_DATA.md](docs/TRAINING_DATA.md).

Журнал v2 добавляет ID событий, номер партии, UTC-время, источник времени и автора решения, сохраняя чтение v1. UI и CLI записывают реальное время; чистое ядро по умолчанию использует явно отмеченное логическое время. «Контрольный хеш» экспортирует checkpoint. Архитектура будущего сетевого адаптера и границы доверия: [EVENT_CHAIN.md](docs/EVENT_CHAIN.md). Отдельная блокчейн-сеть не создавалась.

## Обученная ShashBesh AI v0.1

В выборе игроков появился **ShashBesh AI v0.1**. Модель работает локально в браузере; Python нужен только для обучения. Первая MLP (269→24→1) обучена на 11 221 решении Tactical; контрольные результаты: 41/48 побед против Random, 34/48 против Greedy, 19/48 против Tactical. Превосходство над Tactical не подтверждено. Полный отчёт, ограничения и ресурсы: [AI_TRAINING_REPORT.md](docs/AI_TRAINING_REPORT.md).

```bash
npm run tournament -- --games 20 --seed demo-v01 --agents ai-v0.1,tactical
npm run ai:prepare -- --games 64
npm run ai:train -- --data artifacts/ai-v01/data --output artifacts/ai-v02/candidate.json --model-version "ShashBesh AI v0.2" --epochs 12 --max-seconds 120
npm run ai:evaluate -- --pairs 24 --seed-prefix control-v01
npm run ai:selfplay -- --games 2
npm run test:neural-python
```

Обучение использует NumPy (см. packages/neural/python/requirements.txt), game-level split и только публичные before-features. Оно не активирует новый checkpoint автоматически. Для другой версии задайте новые имя/путь и свежие контрольные seed, не перезаписывайте проверенные версии. Длительный self-play не запускается: команда сохраняет небольшой пилот, исходы обеих сторон и behavior probabilities. Registry хранит checkpoint-архив и предыдущую версию; candidate/champion сравниваются до promotion, при ухудшении предусмотрен rollback. Первой v0.1 пока некуда откатываться.

```bash
# Для будущей версии с подготовленным evidence от compareModels:
npm run ai:registry -- --operation promote --candidate artifacts/ai-v02/candidate.json --evidence artifacts/ai-v02/evidence.json
npm run ai:registry -- --operation monitor --evidence artifacts/ai-v02/health.json
npm run ai:registry -- --operation rollback --reason "confirmed regression"
```

После активации начинать новую партию/пересобирать production bundle. Нейросеть выбирает только максимальные легальные префиксы; проверка правил принадлежит Engine.


## v0.3: история, Android и LAN

Панель хранит последний фактический бросок каждого игрока. «История» показывает позиции до/после без изменения партии; «Отменить ход» действует только для человека внутри своей незавершённой очереди, сохраняя журнал и уже известные кубики.

```bash
npm run dev                  # Ubuntu, http://127.0.0.1:5173
npm run lan:dev              # авторитетный Wi-Fi/LAN сервер, порт 8787
npm run android:sync         # web build и копирование ресурсов Android
npm run android:build        # нужен установленный JDK21 и Android SDK35
```

Debug APK собран: `android/app/build/outputs/apk/debug/app-debug.apk`. JDK21 и SDK35 установлены локально в `.local-tools`. Android может размещать узел (кнопка «Разместить узел на Android») и подключаться к Ubuntu; браузер подключается по IP узла. Установка на физическом телефоне пока не проверена. Детали и ограничения: [ANDROID_LAN_REPORT.md](docs/ANDROID_LAN_REPORT.md). Аварийная проверка: [PROJECT_RECOVERY_REPORT.md](PROJECT_RECOVERY_REPORT.md). Git инициализирован локально; удалённого репозитория и публикации нет.

Протокол установки/проверки устройств: [ANDROID_DEVICE_TEST_PLAN.md](docs/ANDROID_DEVICE_TEST_PLAN.md). Инструменты/сборка: [ANDROID_BUILD_GUIDE.md](docs/ANDROID_BUILD_GUIDE.md). Native transport test: `npm run test:android-transport` после загрузки Gradle зависимостей.
