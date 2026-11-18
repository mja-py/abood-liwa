#!/bin/sh
# Builds a small test APK of Abood in Liwa without Gradle or Android Studio: only a JDK and the Android SDK's build tools.
#
#   sh android/build.sh            bundles the live build (the gh-pages branch, where the build id is already stamped)
#   sh android/build.sh worktree   bundles the files as they are in this folder, stamped "dev"
#
# The result is android/build/abood-liwa-debug.apk, signed with the Android debug key: it installs on any phone that
# allows apps from outside the store, but Google Play needs a release key of your own (see android/README.md).
set -eu
cd "$(dirname "$0")/.."
ROOT=$(pwd); A="$ROOT/android"; B="$A/build"; WWW="$B/assets/www"

SDK=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}}
[ -d "$SDK/build-tools" ] || { echo "No Android SDK at $SDK (set ANDROID_HOME)"; exit 1; }
BT="$SDK/build-tools/$(ls "$SDK/build-tools" | sort -V | tail -1)"
PLAT="$SDK/platforms/$(ls "$SDK/platforms" | sort -V | tail -1)"; API=${PLAT##*-}
if ! java -version >/dev/null 2>&1; then JAVA_HOME=${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}; export JAVA_HOME; PATH="$JAVA_HOME/bin:$PATH"; export PATH; fi
java -version >/dev/null 2>&1 || { echo "No Java found (set JAVA_HOME)"; exit 1; }

rm -rf "$B"; mkdir -p "$WWW" "$B/classes" "$B/dex"

# 1. the game's files
if [ "${1:-live}" = worktree ]; then
  cp -R index.html manifest.webmanifest css js assets "$WWW/"
  ID=dev; sed -i.bak "s/__BUILD__/$ID/g" "$WWW/index.html" "$WWW/js/game.js" && rm -f "$WWW"/*.bak "$WWW"/js/*.bak
else
  git fetch -q origin gh-pages 2>/dev/null || true
  git archive origin/gh-pages | tar -x -C "$WWW"
  ID=$(sed -n "s/.*game\.js?v=\([a-z0-9]*\).*/\1/p" "$WWW/index.html" | head -1)
fi
# left out: the offline cache script (the files are already in the APK), the link-preview picture, and the web install icons
rm -f "$WWW/sw.js" "$WWW/.nojekyll" "$WWW/assets/og.jpg" "$WWW/assets/icons/icon-192.png" "$WWW/assets/icons/icon-512.png" "$WWW/assets/icons/icon-maskable-512.png" "$WWW/assets/icons/apple-touch-icon.png"
if grep -rl __BUILD__ "$WWW" >/dev/null; then echo "Unstamped files in the bundle"; exit 1; fi
CODE=$(git rev-list --count origin/main 2>/dev/null || echo 1)

# 2. resources and manifest
"$BT/aapt2" compile --dir "$A/res" -o "$B/res.zip"
"$BT/aapt2" link -o "$B/unsigned.apk" -I "$PLAT/android.jar" --manifest "$A/AndroidManifest.xml" -A "$B/assets" \
  --min-sdk-version 24 --target-sdk-version "$API" --version-code "$CODE" --version-name "1.0-$ID" "$B/res.zip"

# 3. the one Java class, compiled and turned into Android bytecode
# (file names go through find and xargs, so a folder name with a space in it is safe)
(cd "$A/src" && find . -name '*.java' -print0 | xargs -0 javac -nowarn -source 11 -target 11 -Xlint:-options -classpath "$PLAT/android.jar" -d "$B/classes")
(cd "$B/classes" && find . -name '*.class' -print0 | xargs -0 "$BT/d8" --release --min-api 24 --lib "$PLAT/android.jar" --output "$B/dex")
(cd "$B/dex" && zip -q -9 ../unsigned.apk classes.dex)

# 4. align and sign
"$BT/zipalign" -f 4 "$B/unsigned.apk" "$B/aligned.apk"
KS=${KEYSTORE:-$HOME/.android/debug.keystore}
if [ ! -f "$KS" ]; then KS="$B/debug.keystore"; keytool -genkeypair -keystore "$KS" -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1; fi
OUT="$B/abood-liwa-debug.apk"
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey --out "$OUT" "$B/aligned.apk"
"$BT/apksigner" verify "$OUT"
rm -f "$B/unsigned.apk" "$B/aligned.apk" "$B/res.zip" "$OUT.idsig"
echo "Built $OUT: $(($(wc -c < "$OUT") / 1024)) KB, game build $ID, version code $CODE, Android $API tools"
