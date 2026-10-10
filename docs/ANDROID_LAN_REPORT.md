# Дополнение: SHASHBESH MOBILE, 10.10.2026

Собран отдельный APK v0.3.1-mobile/code4: android/app/build-mobile/outputs/apk/debug/app-debug.apk; файл для передачи artifacts/mobile/shashbesh-mobile-v0.3.1-debug.apk. Предыдущий working APK в app/build не изменён. Новый физический UI, Tactical default, простые Wi-Fi действия и скрытые технические функции проверены58 TS/3 Python/7 Firefox сценариями. Подпись совпадает с предыдущей; old save migration проверен браузером. Телефонов нет, native NSD/реальный Wi-Fi и установка остаются вне выполненных проверок. Подробно [MOBILE_UI_REPORT.md](MOBILE_UI_REPORT.md).

---

# Android debug release — 10.10.2026

APK_STATUS: READY. ANDROID_BUILD: BUILD SUCCESSFUL (85 tasks, 19m39s первая сборка с загрузками). Это debug APK для локальной установки, не опубликованный релиз Google Play.

Полный путь: `<PROJECT_ROOT>/android/app/build/outputs/apk/debug/app-debug.apk`. Размер: 4253550 байт (~4.06 MiB). SHA256: `8f3fc0fee424a7ee8cfcb3f9ea4ad238ba416949e32ca49455795b90398caa8e`.

## Toolchain и проверка APK

Установлены локально в `.local-tools`: Temurin JDK21.0.12.1+1, Android command-line tools22, platform35 revision2, build-tools35.0.0, platform-tools37.0.1. Gradle wrapper8.11.1/AGP8.7.2 сохранены. AGP автоматически установил свои default build-tools34.0.0; они также находятся в локальном SDK. Системная Java, глобальный Gradle, Ubuntu/VPN настройки не изменены. adb создал стандартный пользовательский ~/.android и служебный adb-server для поиска устройств; подключённых устройств нет.

`npm run android:build` прошёл production web build, TypeScript, Capacitor sync и assembleDebug. Проверка actual APK: ZIP CRC без ошибок; подпись debug v1/v2 проверена apksigner; package `org.shashbesh.game`, versionCode3/versionName0.3.0, minSdk23/target35/compile35. Манифест содержит INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE и usesCleartextTraffic=true. MainActivity запускается через launcher intent. В DEX присутствуют LanHostPlugin, LanHttpServer и LanDiscoveryPlugin. Все три production web файла совпадают побайтово с assets/public внутри APK; включены модель AI v0.1, иконки и ресурсы. Установка/запуск на Android ещё НЕ проверены.

Предупреждения первой сборки: flatDir в сгенерированном Capacitor шаблоне; SDK XML v4 против reader v3 старой AGP toolchain; deprecated API в Capacitor; SDK CLI сообщает deprecated sdkmanager. Они не остановили сборку. Версии зависимостей не обновлялись ради удаления предупреждений.

## Две схемы LAN

Ubuntu host: `npm run lan:dev` → Android вводит http://IP-UBUNTU:8787 → может создать комнату на узле либо подключиться к комнате Ubuntu.

Android host: в приложении «Разместить узел на Android» → «Создать комнату» на http://127.0.0.1:8787 → Ubuntu открывает показанный IP телефона:8787, находит комнату и подключается. Java NanoHTTPD/WebSocket обслуживает сеть и bundled UI; существующие TypeScript Authority/Engine проверяют намерения и генерируют кубики Web Crypto. Правила в Java не дублируются. HostSession сохраняет ID/token/game/event/receipt; native NSD публикует _shashbesh._tcp., IP остаётся резервом. После перезагрузки WebView ранее включённый узел автоматически поднимается, комнаты восстанавливаются replay, старые сокеты закрываются для повторной авторизации. Android-комнаты сохраняются в localStorage; Ubuntu — в атомарных JSON. Native heartbeat отслеживает потерянные сокеты.

Android узел работает в процессе открытого приложения. Постоянный foreground service не реализован; для приёмки держать приложение открытым/экран включённым. Размер localStorage ограничен WebView; сценарии переполнения хранилища и disk-error rollback остаются вне проверенной приёмки. Перед длительными партиями сохранять JSONL.

## Программные проверки

- 56/56 TypeScript: движок, нейросеть, undo/history/persistence, server-owned RNG, маски, idempotence и reconnect. Включены реальных 4 WS клиента, Android host adapter/Ubuntu join и восстановление сохранённой комнаты.
- 3/3 Python.
- Firefox: LAN и v0.3 сценарии passed; первый game/AI сценарий прервался из-за HMR во время редактирования панели и восстановления на паузе. Повтор на стабильных исходниках passed (2.3m); все 3 сценария подтверждены. Это был тестовый сбой, а не доказанная ошибка движка.
- 1/1 отдельный JVM network test: запускается ТОТ ЖЕ LanHttpServer.java, Java transport связан с TypeScript Authority через harness, phone-client создаёт комнату, Ubuntu-client подключается, fake dice отклонены, подтверждённые состояния/replay одинаковы, разрыв/rejoin восстанавливает игру. Это НЕ физический Android WebView/NSD тест.
- Web/TypeScript build: 58 modules, JS385.88kB/gzip134.31kB. Android build: exit0.

Журналы и проверки: artifacts/recovery/android-release-*.log, *.tap, apk-verification.json, apk-badging.txt, apk-permissions.txt, apk-signature.txt, apk-manifest-tree.txt. Отдельные tests scripts сохранены в Git, build/tool caches и данные пользователей исключены. Первый локальный Git-коммит подготовлен после проверки состава; remote отсутствует, push не выполняется. Технический автор по умолчанию ShashBesh Local <shashbesh@localhost>, без global Git config.

Не проверены на устройствах: установка/запуск APK, реальные Ubuntu↔Android обе схемы, NSD/mDNS конкретного маршрутизатора, Android offline AI, ориентация/WebView lifecycle и реальный Wi-Fi разрыв. Инструкции: [ANDROID_DEVICE_TEST_PLAN.md](ANDROID_DEVICE_TEST_PLAN.md), [ANDROID_BUILD_GUIDE.md](ANDROID_BUILD_GUIDE.md).

Правила/CSV сохранены. drand, DiceChain, блокчейн, токены не реализованы; длительное обучение не запускалось; GitHub публикации нет.

---

Ниже — сохранённый отчёт до подготовки toolchain, его блокеры APK относятся к предыдущему состоянию.

# ShashBesh v0.3 — Android и LAN, 10.10.2026

## Реализовано и проверено

Ubuntu UI сохранён: React/Vite, единая цветная панель игрока/кубиков, последние броски каждого игрока, активные/использованные значения и дополнительный бросок. История содержит before/after, маршрут, захваты и время; просмотр не меняет текущую игру. Отмена только собственных человеческих действий незавершённого хода, append-only событие, точное восстановление и повторное использование уже выпавших дополнительных кубиков. IndexedDB сохраняет локальную игру; восстановление проверяет журнал через Engine.replay. Random/Greedy/Tactical/AI v0.1 сохранены.

55/55 TS тестов; 3/3 Python; 3/3 Firefox Playwright. LAN протестирован четырьмя реальными WebSocket-клиентами и двумя независимыми браузерными контекстами. Проверены запрет клиентских кубиков, чужих ходов, устаревшего head, duplicate request ID, восстановление после разрыва/reload и одинаковые подтверждённые состояния. Production build/TypeScript успешны; native compile не выполнен.

## Android

Создан настоящий Capacitor 7.6.9 Android Gradle-проект: org.shashbesh.game, версия 0.3.0, minSdk23, target/compile35, Gradle8.11.1/AGP8.7.2. В APK включается собранный web UI и веса нейросети; локальная человек–ИИ игра не обращается в интернет. Touch/CSS safe areas/обе ориентации и сохранение подготовлены, браузерная адаптация проверена. Android MainActivity регистрирует LanDiscoveryPlugin, NSD ищет _shashbesh._tcp. с multicast lock; callbacks ограничены одной попыткой поиска.

`npx cap sync android` успешен, ресурсы обновлены до последней production сборки. Реальный запуск `npm run android:build` завершился exit2: отсутствует Java. JDK21, Android SDK platform35/build-tools35.0.0, adb/sdkmanager и Android Studio в окружении не обнаружены. APK НЕ собран; нативный плагин и Android устройство НЕ проверены.

Воспроизводимая сборка после подготовки toolchain:

```bash
npm ci
# Указать установленный SDK через ANDROID_SDK_ROOT либо android/local.properties.
# Gradle должен использовать JDK 21.
npm run android:build
# Результат: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Первая загрузка Gradle/Maven/npm зависимостей требует интернета либо заполненного кэша. Глобальные зависимости автоматически не устанавливались. Требования: [Capacitor environment](https://capacitorjs.com/docs/v7/getting-started/environment-setup), [Capacitor 7 migration](https://capacitorjs.com/docs/v7/updating/7-0). NSD: [Android documentation](https://developer.android.com/develop/connectivity/wifi/use-nsd). Подключение по IP работает как резерв; физический discovery в Wi-Fi требует отдельного испытания.

## Локальная сеть

```bash
npm run lan:dev
# Или после npm run build:
npm run lan:start
```

Авторитетный Node-узел Ubuntu слушает 0.0.0.0:8787; CLI показывает адреса. Все устройства подключаются к одной Wi-Fi/LAN, открывают http://IP-УЗЛА:8787 либо вводят этот адрес в панели LAN приложения. Создатель создаёт комнату на 2–4 места, остальные подключаются, затем создатель начинает игру. Интернет для партии не нужен. На Android подготовлено NSD; браузер не может сам отправлять UDP mDNS, поэтому сначала нужен известный IP, затем /api/discovery. mDNS публикация и поиск реализованы через bonjour-service. Android здесь клиент, самостоятельное размещение авторитетного Node-сервера на телефоне не реализовано.

Server проверяет токен места, активного игрока, текущий hash и legal actions; только сервер генерирует кубики и подтверждает переходы. Клиент строит состояние replay подтверждённых событий, не двигает фишки оптимистически. Идентификаторы комнаты/партии/игрока/request/event и SHA256 цепочка присутствуют. Переподключение получает полный снимок событий; неподтверждённый intent повторяется с тем же request ID. JSON комнат сохраняется атомарно в artifacts/lan/rooms, содержит приватные токены и не предназначен для публикации. LocalStorage хранит только собственное подключение; `.gitignore` исключает artifacts.

Ограничения: испытания были loopback, не физическая Wi-Fi сеть; изоляция клиентов/блокировка multicast в роутере может мешать discovery. HTTP/WS рассчитаны на доверенную локальную сеть, не публичный хостинг. Ошибки диска при записи комнаты пока не покрыты транзакционным rollback. Реальное Android NSD и восстановление после уничтожения процесса должны быть проверены на устройстве после сборки. Новый блокчейн, drand, DiceChain и токены не реализовывались.

Следующая приёмка: JDK21/SDK35 → assembleDebug → два Android/Firefox устройства в одной Wi-Fi → поиск и IP fallback, offline AI, поворот, остановка/возобновление приложения, разрыв Wi-Fi и точный replay после возврата.
