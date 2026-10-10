#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/android-env.sh
npm run build
npx cap sync android
cd android
./gradlew assembleDebug -PshashbeshMobileBuild --offline --no-daemon --max-workers=2
printf 'MOBILE APK: %s/android/app/build-mobile/outputs/apk/debug/app-debug.apk\n' "$(cd .. && pwd)"
