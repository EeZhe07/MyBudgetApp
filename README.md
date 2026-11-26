# MyBudgetApp

## Latest APK

Install `dist/MyBudgetApp-Latest-Android-Phone.apk` on an Android phone. It contains ARM64 and ARMv7 code and installs as **MyBudgetApp Test**. The current file is about 38 MB.

The emulator build is `dist/emulator/MyBudgetApp-Latest-Emulator-x86_64.apk`. Build results under `android/app/build` are generated intermediate outputs. Use the named files in `dist` for installation.

An offline Expo budget tracker for expenses, income, account transfers, savings goals and spending reports. SQLite stores the budget on the device. Android includes home-screen widgets for the budget overview and quick entry.

On first launch, the app imports existing AsyncStorage data from the same installation. If there are no accounts, add an account with an optional opening balance or restore a backup. If you have records stored only in Supabase, download them with your old installation before switching. In **Settings → Backups and exports**, export a version 2 JSON backup or restore a version 1 or 2 backup. Check the backup date and record counts before replacing local data. CSV export is available in the same section.

Home shows the budget for the selected month. An older single budget carries over to the migration month. Archived accounts retain their balances and receipts and still count toward net worth.

## Run on Android

Install Node.js 20.19 or newer, Android Studio with SDK Platform 36 and Platform-Tools, and a compatible JDK (17 is recommended). Put `adb` on PATH. Open an emulator in Android Studio or connect an Android phone with USB debugging enabled. Use a data cable and accept the debugging prompt on the phone. [Expo Android setup](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=physical&mode=development-build&buildEnv=local)

Run from the project directory in PowerShell.

```powershell
npm.cmd ci
adb devices
$env:MYBUDGETAPP_TEST_BUILD = '1'
npx.cmd expo prebuild --platform android
npm.cmd run android -- --device
```

Select the emulator first. The environment variable generates **MyBudgetApp Test**, which installs under `com.shingyeeang.mybudgetapp.test` with its own data. Keep the original app installed if it has records you want to preserve. If switching between variants in an existing generated `android` directory, regenerate it with `npx.cmd expo prebuild --clean --platform android` after checking it contains no manual native edits. The app uses a native build and Metro serves JavaScript during debug runs.

If CMake reports paths longer than 260 characters on Windows, use shorter paths for the checkout and Gradle cache.

### Emulator checks

1. Restore `redesign-preview.json` on the test installation, or add one account named **Touch ’n Go**. Open **Settings → Touch ’n Go → Replay synthetic TNG samples**. The sample action produces three pending drafts, including two distinct RM8 Demo Cafe payments. Spending changes only after you record a draft.
2. Tap **Accept** on one RM8 sample. Tap **Decline** on the other. Open **Edit** on the Demo Bookshop sample and close it to check that the draft stays pending. Open it again, change the amount or category and confirm it. Compare Records, the TNG wallet and the **Budget Overview** widget.
3. Add a manual RM50 transfer from another account to TNG. Spending should still show RM8. Export a JSON backup via the Android share sheet and restore it on the test installation. Compare balances, transfers, categories, goals and the budget.

### Phone checks

Connect the phone over USB and run the same command with the side-by-side build selected. In Settings, enable Touch ’n Go capture and grant access under **Open notification access**. Return to the home screen before your next ordinary TNG payment.

Live capture recognizes the verified English **DuitNow Transfer is successful!** notification. It creates a pending transfer with the captured amount and recipient. Add the TNG wallet and receiving bank as accounts, then choose the destination before confirming. The transfer moves balances and preserves spending totals. Active notifications are checked when the listener reconnects, including after an app update.

Additional purchase and transfer wording needs a redacted notification sample. An unrecognized alert timestamp means the listener received an alert whose wording has no matching rule yet.

For previews with Metro and the laptop off, build and install a release APK for the test application ID. Synthetic replay is available in debug builds.

```powershell
npm.cmd run android -- --device --variant release
```

Run the SQLite migration, backup and draft checks from the terminal with Node.js 22.13 or newer.

```powershell
node --test test/budget-store.test.mjs test/budget-insights.test.mjs
node test/redesign-fixtures.mjs
```

After building the native module, run its parser checks in PowerShell.

```powershell
$classes = (Resolve-Path 'modules/tng-capture/android/build/tmp/kotlin-classes/release').Path
$stdlib = (Get-ChildItem '.expo/android-test/gradle-cache/caches/modules-2/files-2.1/org.jetbrains.kotlin/kotlin-stdlib/2.1.20' -Recurse -Filter 'kotlin-stdlib-2.1.20.jar' | Select-Object -First 1).FullName
java --class-path "$classes;$stdlib" test/TngParserCheck.java
```

The fixture script writes fictional JSON backups to `.expo/redesign-review/fixtures`. Restore them on **MyBudgetApp Test**. Use the synthetic replay for payment drafts, which are cleared when a backup replaces the ledger.
