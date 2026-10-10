#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/android-env.sh
npm run build
npx cap sync android
shashbesh_gradle_args=()
if [[ "${SHASHBESH_GRADLE_OFFLINE:-0}" == 1 ]]; then shashbesh_gradle_args+=(--offline); fi
cd android
./gradlew assembleDebug -PshashbeshAlphaBuild --no-daemon --max-workers=2 "${shashbesh_gradle_args[@]}"
printf 'ALPHA APK: %s/android/app/build-alpha/outputs/apk/debug/app-debug.apk\n' "$(cd .. && pwd)"
