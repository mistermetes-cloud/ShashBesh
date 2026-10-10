# Установка / Installation —v0.3.1-alpha

## Android APK

После публикации откройте [Releases](https://github.com/mistermetes-cloud/ShashBesh/releases/tag/v0.3.1-alpha), загрузите `ShashBesh-v0.3.1-alpha-android-debug.apk` и `SHA256SUMS.txt`. Проверьте SHA256, затем установите APK вручную, разрешив установку из выбранного источника в Android. Не удаляйте прежнее приложение для обычного обновления.

```bash
sha256sum ShashBesh-v0.3.1-alpha-android-debug.apk
adb install -r ShashBesh-v0.3.1-alpha-android-debug.apk
```

Package ID: org.shashbesh.game; minSdk 23, target 35. Alpha подписана debug-ключом. Совпадение сертификата с предыдущими локальными APK проверяется при подготовке релиза; фактическая установка обновления на телефон ещё не принята. Сертификат будущей production версии должен быть согласован до смены подписи.

Игра с человеком или Tactical на устройстве не требует интернета. LAN/Wi-Fi — эксперимент: не считайте обнаружение и сетевую игру полностью работающими на вашем маршрутизаторе. [Протокол испытаний](ANDROID_DEVICE_TEST_PLAN.md).

## Web / Ubuntu

Node.js 20.19+ и npm. После публикации:

```bash
git clone https://github.com/mistermetes-cloud/ShashBesh.git
cd ShashBesh
git checkout v0.3.1-alpha
npm ci
npm run dev
```

Открыть http://127.0.0.1:5173. Production:

```bash
npm run build
npm run preview
```

Первоначальная установка зависимостей требует интернета. Игра не требует внешнего API после локального запуска. Node server для экспериментального LAN: `npm run lan:dev`; это не публичный интернет-хостинг.

## Сборка Android из исходников

Нужны JDK 21, SDK platform 35/build-tools 35.0.0; AGP 8.7.2 также использует default build-tools 34.0.0. Gradle 8.11.1 запускается wrapper проекта. Системную Java менять не обязательно: задайте JAVA_HOME/ANDROID_SDK_ROOT в текущем терминале или используйте локальный `.local-tools` по [руководству](ANDROID_BUILD_GUIDE.md).

```bash
npm ci
npm run android:alpha
```

APK: `android/app/build-alpha/outputs/apk/debug/app-debug.apk`. Старые `app/build` и `app/build-mobile` не перезаписываются. Первый запуск Gradle/Maven требует интернета; для заполненного кэша можно использовать `SHASHBESH_GRADLE_OFFLINE=1 npm run android:alpha`.

## Tests and optional AI tools

```bash
npm test
npm run build
npx playwright install firefox
SHASHBESH_TEST_BROWSER=firefox npm run test:browser
python3 -m venv .venv
.venv/bin/pip install -r packages/neural/python/requirements.txt
.venv/bin/python packages/neural/python/test_train.py
```

Python/NumPy нужны для обучения и его тестов; браузерная игра использует сохранённые веса без Python. Датасеты в Git не включены; подготовку teacher данных выполняет `npm run ai:prepare`. Не запускайте длительное обучение без оценки CPU/RAM и временного бюджета.

English: download the APK and checksum from Releases after publication, or clone the tag and run `npm ci` and `npm run dev`. JDK 21/SDK 35 are needed only for Android builds. Alpha APKs use a debug signature; real-device and Wi-Fi acceptance is pending. The license has not been selected.
