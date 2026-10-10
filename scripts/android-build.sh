#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/android-env.sh
if ! command -v java >/dev/null 2>&1; then
  echo 'Missing Java JDK 21. Install Android Studio 2024.2.1+ or a JDK 21, then set the Gradle JDK.' >&2
  exit 2
fi
if [[ -z "${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}" && ! -f android/local.properties ]]; then
  echo 'Missing Android SDK path. Install platform android-35 and build-tools 35.0.0; configure ANDROID_SDK_ROOT or android/local.properties.' >&2
  exit 2
fi
npm run build
npx cap sync android
cd android
./gradlew assembleDebug --no-daemon --max-workers=2
printf 'APK: %s/android/app/build/outputs/apk/debug/app-debug.apk\n' "$(cd .. && pwd)"
