#!/usr/bin/env bash
# Source from the project root. All downloaded tools/caches stay in the workspace.
shashbesh_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "${JAVA_HOME:-}" && -d "$shashbesh_root/.local-tools/jdk" ]]; then
  for shashbesh_jdk in "$shashbesh_root"/.local-tools/jdk/jdk-*; do
    if [[ -x "$shashbesh_jdk/bin/java" ]]; then export JAVA_HOME="$shashbesh_jdk"; break; fi
  done
fi
if [[ -n "${JAVA_HOME:-}" ]]; then export PATH="$JAVA_HOME/bin:$PATH"; fi
if [[ -z "${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}" && -d "$shashbesh_root/.local-tools/android-sdk" ]]; then
  export ANDROID_SDK_ROOT="$shashbesh_root/.local-tools/android-sdk"
fi
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$shashbesh_root/.local-tools/gradle}"
export ANDROID_USER_HOME="${ANDROID_USER_HOME:-$shashbesh_root/.local-tools/android-user}"
if [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"; fi
