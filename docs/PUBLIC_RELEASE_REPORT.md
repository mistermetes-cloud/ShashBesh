# Подготовка первой публичной версии —v0.3.1-alpha

## Локальный результат

Целевой репозиторий: https://github.com/mistermetes-cloud/ShashBesh. Origin подготовлен. GitHub-коннектор авторизован, но целевой repo возвращает404; GitHub CLI2.102.0 установлен локально и сообщает отсутствие авторизации. Репозиторий, push и GitHub Release пока НЕ созданы/не подтверждены через CLI; этот адрес обозначает цель публикации.

Исходный root-коммит и мобильная разработка сохранены в master и recovery-ветках, tar snapshot и Git bundles в artifacts/release-v0.3.1-alpha/recovery. Старые коммиты содержат локальные пути, поэтому публичная main подготовлена отдельным root без их публикации. История не удаляется и не переписывается; force push не используется. Публикация должна включать только main/develop/ai-lab и тегv0.3.1-alpha, оставляя recovery/master локальными.

README RU/EN, CHANGELOG, INSTALLATION, ROADMAP, release notes и .gitignore подготовлены. Из документации убраны личные абсолютные пути. Исторические исходные отчёты доступны в recovery/mobile-before-public. Git audit проверил пароли/ключи/credential URLs/token patterns и исключённые каталоги; секретов в публичном составе не обнаружено. Скриншоты имеют нулевые текстовые/EXIF метаданные. Датасеты, SDK/JDK, кэши, credentials, APK и эксперименты исключены из Git, локальные данные сохранены. Лицензия не выбрана и LICENSE не добавлен.

Игровой движок, shared, RULES_V1, CSV и веса моделей побайтово совпадают с до-релизным состоянием:14 защищённых файлов. Версия npm/lock и Android metadata обновлена до0.3.1-alpha/code5; игровая механика не менялась.

## Проверки

58/58 TypeScript,3/3 Python. Firefox:7 уникальных сценариев подтверждены. Первый совместный прогон с Gradle завершился5/7: общий deadline game test и слишком раннее чтение DOM после touch undo. При доступной RAM~800MB отдельный повтор выполнен после Gradle:2/2 passed. В тесте ожидание DOM заменено на polling, timeout и игровая логика не менялись. Неразрешённых тестовых ошибок нет.

Production web/tsc успешны:63 модуля, JS403.75kB/gzip138.98kB, CSS19.10kB/gzip5.17kB. Android offline alpha build: BUILD SUCCESSFUL8m38s,85 задач (53 executed/32 up-to-date). Warnings flatDir/SDK XML сохранены; fatal ошибок нет. Физическая Android/Wi-Fi приёмка не выполнена.

## APK для отдельного GitHub Release

Файл: artifacts/release-v0.3.1-alpha/ShashBesh-v0.3.1-alpha-android-debug.apk.
Размер: 4262726 байт.
SHA256: `f24848f0c8572f3392f6be7be13228ae047a9810cb71a1b4f89ae6c45139b8a2`.
Контрольная сумма: artifacts/release-v0.3.1-alpha/SHA256SUMS.txt.

Package org.shashbesh.game, versionName0.3.1-alpha/versionCode5, minSdk23/target35. ZIP CRC/signature проверены, сертификат совпал с предыдущим debug APK; web assets совпали с dist. Предыдущие APK не перезаписаны. Сборка использует отдельный app/build-alpha. Ключ debug остаётся локальным и не входит в release assets или Git.

GitHub Release notes: RELEASE_NOTES_v0.3.1-alpha.md. Публикация APK ожидает CLI login и проверки доступа к указанному repo. LAN/Wi-Fi, AI Evolution Lab и турниры нейросетей находятся в разработке; AIv0.1 экспериментальна и не превзошла Tactical.

## Следующий шаг

Авторизовать GitHub CLI, проверить viewer и repo visibility/доступ, затем обычный push выбранных refs и prerelease asset upload. Команды и ограничения: [PUBLICATION.md](PUBLICATION.md). Коммит и refs фиксируются после всех локальных проверок; фактические хеши записаны в локальном release manifest и итоговом сообщении, чтобы избежать ссылки коммита на собственный хеш.
