# Локальная сборка Android

Совместимый набор проекта: JDK 21, Gradle wrapper 8.11.1, AGP 8.7.2, Capacitor 7.6.9, SDK platform 35, build-tools 35.0.0. Системная Java и Ubuntu/VPN настройки не меняются. Gradle запускается с максимум двумя workers.

В текущем рабочем каталоге инструменты установлены в `.local-tools/`, исключённом из Git. `scripts/android-env.sh` выбирает локальную JDK, SDK и локальные кэши. `android/local.properties` содержит абсолютный путь SDK и также исключён из Git.

```bash
npm run android:build
# APK: android/app/build/outputs/apk/debug/app-debug.apk
# Проверка Java-транспорта после загрузки Gradle зависимостей:
npm run test:android-transport
```

В новом checkout подготовить JDK21 и SDK35 через Android Studio либо отдельно. Источники загрузок: [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=21), [Android command-line tools](https://developer.android.com/studio#command-line-tools-only). Для проверенной установки использован архив `commandlinetools-linux-15859902_latest.zip`, SHA256 `4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583`.

Если используются отдельные tools, распаковать commandlinetools в `.local-tools/android-sdk/cmdline-tools/latest`, JDK в `.local-tools/jdk/jdk-*`; затем:

```bash
source scripts/android-env.sh
sdkmanager --sdk_root="$ANDROID_SDK_ROOT" --licenses
sdkmanager --sdk_root="$ANDROID_SDK_ROOT" 'platforms;android-35' 'build-tools;35.0.0' 'platform-tools'
npm ci
npm run android:build
```

Лицензии принимаются пользователем установки. Для первой сборки нужен интернет для Gradle/Maven/npm; последующие сборки используют кэш. Подпись debug служит для локальной установки, не для Google Play. Ключи не включаются в Git. Если используются системные инструменты, можно указать JAVA_HOME/ANDROID_SDK_ROOT; это настройки текущего процесса.

Android SDK 35 согласован с существующим проектом, см. [Capacitor 7 requirements](https://capacitorjs.com/docs/v7/updating/7-0). Native HTTP/WebSocket транспорт основан на [NanoHTTPD 2.3.1](https://github.com/NanoHttpd/nanohttpd/tree/nanohttpd-project-2.3.1); игровые правила в Java не дублируются.
