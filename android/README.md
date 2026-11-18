# Abood in Liwa for Android

A very small Android app (about 280 KB) that shows the web game in one full-screen WebView. The game's files travel
inside the APK, so it plays with no internet, and the app asks for no internet permission: the only permission is
vibration. There are no libraries and no Gradle project: one Java class, a manifest, an icon and a build script.

## Build

Needs a JDK (17 is fine) and the Android SDK command-line tools with one `build-tools` and one `platforms` package.
On this Mac both come from Homebrew (`openjdk@17` and `android-commandlinetools`), and the script finds them itself.

```bash
sh android/build.sh
```

That bundles the live build of the game (the `gh-pages` branch) into `android/build/abood-liwa-debug.apk`.
`sh android/build.sh worktree` bundles the files as they are in this folder instead, to try changes before they are pushed.

## Install

Copy the APK to an Android phone and open it (the phone asks once to allow installing from that app), or with a cable
or a running emulator:

```bash
adb install -r android/build/abood-liwa-debug.apk
```

Android 7 or later. Progress is saved inside the app and is separate from progress in the browser.

## How it works

`MainActivity` answers every request for `https://appassets.androidplatform.net/...` from the APK's `assets/www`
folder. The page therefore has a secure origin (ES modules and saved progress need one) without touching the network.
The Back button steps out one layer at a time: close a sheet, pause, end the run, back to the menu, then leave.

## Before Google Play

This APK is signed with the Android debug key, which Play does not accept. For the store it still needs:

- a release key of your own, kept safe (losing it means losing the ability to update the app);
- the package name decided for good (`io.github.mja_py.aboodliwa` here; it can never change after the first upload);
- an App Bundle (`.aab`) rather than an APK, which is easiest from a Gradle project;
- a privacy policy page, a store listing, and the Families policy answers for a children's game.
