# Сборка

Проект выпускается в двух видах: **сайт** (rhodes.monster, Vercel) и
**Android-приложение** (Capacitor, APK в GitHub Releases). Десктопные сборки
отменены — решение от 2026-11-15, см. `docs/APP_MIGRATION.md`.

## Что нужно один раз

Для сайта достаточно Node 24.

```bash
npm ci
```

Для APK — JDK 21 и Android SDK:

```bash
sudo apt install -y openjdk-21-jdk

export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
mkdir -p "$ANDROID_HOME/cmdline-tools"
curl -LO https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
unzip -q commandlinetools-linux-13114758_latest.zip -d "$ANDROID_HOME/cmdline-tools"
mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --install \
  "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

`JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`
и `PATH` прописаны в `~/.bashrc`.

## Сайт

```bash
npm run dev            # Express + Vite на http://localhost:3001
npm run validate:data  # проверка JSON-данных
npm run lint           # tsc --noEmit
npm run build          # dist/ + dist-server/
```

Деплой на Vercel собирается из `main`. Веб-версия — полноценное приложение:
терминал, читалка, архивы, `/storage`, PWA-установка.

Прокси `/api/proxy` существует только на сайте: он нужен для хостов без CORS.
В приложении его нет — запросы идут напрямую.

## Android

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME="$HOME/Android/Sdk"

npm run android:sync   # build:native + cap sync
npm run android:apk    # debug APK
```

Артефакт: `android/app/build/outputs/apk/debug/app-debug.apk`.

`npm run build:native` (`NATIVE_BUILD=1`) отключает PWA и подменяет
`virtual:pwa-register` заглушкой: в приложении нечего регистрировать, а precache
на 20+ МБ только замедляет первый запуск.

Что настроено в оболочке:

- `server.androidScheme = https` — WebView не считает приложение небезопасным;
- `CapacitorHttp.enabled = true` — `window.fetch` уходит в Java, CORS не мешает;
- back-кнопка: история → выход (`@capacitor/app`);
- тёмный статус-бар `#0e0e0e`;
- роутинг — hash (`#/story`), потому что WebView не отдаёт `index.html` по
  глубоким путям.

Debug-подпись годится для беты: APK ставится вручную и обновляется поверх.
Release-keystore добавим вместе со стабильной веткой.

## Артефакты и релиз

```bash
npm run android:apk
npm run release:collect   # release/ + SHA256SUMS.txt
```

Тег запускает workflow сборки APK:

```bash
git tag v0.1.0
git push origin v0.1.0
```

`release-android.yml` прикладывает APK к **черновику** релиза с пометкой
prerelease. Подписи нет, поэтому в описании публикуем SHA-256 из
`release/SHA256SUMS.txt`.

## Кэш и контент

Приложение не хранит контент у себя: текст, арты, музыка и голос качаются с
`torappu.prts.wiki`, raw GitHub и jsDelivr. Записи идут через `assetStore`:
Cache Storage, при недоступности — IndexedDB, в крайнем случае память.
Экран `/storage` показывает языки офлайн-текста, прогресс и размер кэша.
