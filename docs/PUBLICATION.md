# Публикация v0.3.1-alpha

Цель: mistermetes-cloud/ShashBesh, public. Подготовленные main/develop/ai-lab и тег содержат публичный source tree. master/recovery хранят исходную локальную историю с личными путями и остаются локальными. Лицензия не выбрана.

## Авторизация

На текущей машине CLI находится в `.local-tools/gh/bin/gh`:

```bash
.local-tools/gh/bin/gh auth login --hostname github.com --git-protocol https --web
.local-tools/gh/bin/gh auth status
.local-tools/gh/bin/gh api user --jq .login
```

Для дальнейших команд используйте установленный `gh` либо локальный путь. Перед публикацией viewer должен совпадать с владельцем, а repo должен иметь ожидаемые имя, visibility и права. Если GitHub CLI не авторизован, push/upload не выполняются.

## Целевой репозиторий

```bash
gh repo view mistermetes-cloud/ShashBesh --json nameWithOwner,url,visibility,isEmpty,defaultBranchRef
```

Если repo действительно отсутствует и viewer/целевой аккаунт подтверждены:

```bash
gh repo create mistermetes-cloud/ShashBesh --public --description "Local strategic board game for web and Android — v0.3.1-alpha"
```

Существующий непустой или private repo требует проверки его истории и видимости до публикации. Здесь нет команды автоматической смены visibility, удаления remote истории или force push.

## Push выбранных refs

Origin уже указывает на https://github.com/mistermetes-cloud/ShashBesh.git. Для HTTPS можно использовать gh credential helper только в текущей команде без изменения глобальной Git-конфигурации:

```bash
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push --atomic origin main develop ai-lab refs/tags/v0.3.1-alpha
```

Публикуются только эти четыре refs. При non-fast-forward остановиться и исследовать remote, сохранив обе истории.

## Android prerelease

После успешного push проверить существующие release/tag перед созданием. Assets подготовлены локально:

```bash
gh release create v0.3.1-alpha   artifacts/release-v0.3.1-alpha/ShashBesh-v0.3.1-alpha-android-debug.apk   artifacts/release-v0.3.1-alpha/SHA256SUMS.txt   --repo mistermetes-cloud/ShashBesh --verify-tag --prerelease   --title "ShashBesh v0.3.1-alpha"   --notes-file docs/RELEASE_NOTES_v0.3.1-alpha.md
```

APK debug-подписан, raw datasets/ключи/SDK не прикладываются. Release notes явно обозначают LAN/Wi-Fi и Evolution Lab как разработку, физическую приёмку как невыполненную. Проверить опубликованные URL, размер и checksum assets после upload. Требование дополнительного разрешения останавливает публикацию до подтверждения.
