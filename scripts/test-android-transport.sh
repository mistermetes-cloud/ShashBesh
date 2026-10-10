#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/android-env.sh
shashbesh_http_jar="$(find "$GRADLE_USER_HOME/caches/modules-2/files-2.1/org.nanohttpd/nanohttpd/2.3.1" -name '*.jar' -print -quit)"
shashbesh_ws_jar="$(find "$GRADLE_USER_HOME/caches/modules-2/files-2.1/org.nanohttpd/nanohttpd-websocket/2.3.1" -name '*.jar' -print -quit)"
mkdir -p artifacts/android-transport/classes
export SHASHBESH_TRANSPORT_CP="artifacts/android-transport/classes:$shashbesh_http_jar:$shashbesh_ws_jar"
javac -cp "$SHASHBESH_TRANSPORT_CP" -d artifacts/android-transport/classes android/app/src/main/java/org/shashbesh/game/LanHttpServer.java tests/android/LanTransportHarness.java
node --import tsx --test tests/android/transport.test.ts
