# Сохранение сторонних copyright и license notices

Текущий статус: проект ещё не принят под GPLv3. Этот документ фиксирует частично подготовленный комплект уведомлений, который ещё нужно проверить на полноту, не меняя лицензии компонентов.

| Компонент | Исходные условия / источник уведомления | Необходимые действия |
|---|---|---|
| React / React DOM 19.3.0 | MIT; Meta Platforms, Inc. and affiliates; `node_modules/react{,-dom}/LICENSE` | Сохранить точный copyright и полный MIT permission/disclaimer в сопроводительном комплекте web/APK; comments в JS не считать автоматически достаточными |
| Capacitor core/android/cli 7.6.9 и подтверждённые template portions | MIT; Drifty Co.; соответствующие package LICENSE | Сохранить copyright и полный MIT текст для копируемого template и распространяемого runtime; template не объявлять собственным artwork |
| NanoHTTPD / WebSocket 2.3.1 | BSD-3-Clause; upstream LICENSE и source notices | Сохранить copyright, три условия, disclaimer, non-endorsement; имена/даты брать из точного upstream component |
| `@noble/hashes`, `ws`, `bonjour-service` и прочие MIT dependencies | Точные license/copyright соответствующих версий | Включить их собственные notices, а не заменять единым общим MIT или GPL текстом |
| ISC / BSD-3-Clause / 0BSD npm dependencies | Точные upstream license файлы | Сохранить требуемые copyright/permission/disclaimer по условиям конкретного файла; 0BSD не дописывать несуществующие обязательства |
| BlueOak-1.0.0 dependencies | Полный текст или ссылка, как разрешено BlueOak Notices | Передать лицензию/ссылку каждому получателю соответствующей части; не переименовывать лицензию и не объявлять компонент GPL-only |
| Unlicense component | Точный upstream waiver/disclaimer | Сохранить provenance и текст; не приписывать ему выдуманного copyright holder |
| AndroidX / Kotlin / Guava runtime | Apache-2.0; 54-coordinate inventory и upstream artifacts | Сохранить Apache LICENSE, copyright/NOTICE, если их даёт исходный компонент, и информацию об изменениях, где требуется |
| Gradle wrapper | Apache-2.0 headers и embedded `META-INF/LICENSE` | Существующие уведомления/JAR license не удалять и не заменять GPL header |
| NumPy и его bundled binary libraries, если будут распространяться | NumPy license содержит BSD/OpenBLAS/LAPACK/GCC runtime/LGPL notices | Комплектовать реальные bundled notices; не переносить их на вычисленные веса и не считать wheel одной только BSD библиотекой |
| JUnit/EPL, MPL/CDDL/classpath exception build/test инструменты при их отдельной поставке | Точные artifact licenses, альтернативы и исключения | Разрешить R-02 до такой поставки; не выбирать альтернативу без проверки текста |
| PNG/XLSX/CSV/spec исходники и скриншоты | Происхождение заявлено владельцем OWN-01…04; полные полномочия/scope не подтверждены | Записать реальные сведения, разрешения и требуемые credits; не придумывать имена автора/дату или GPL grant |
| Capacitor/Android artwork | Отдельная source/brand проверка R-01 | Уточнить условия изображения, включая официальную Android robot attribution при применимости; не считать trademark rights переданными через MIT/GPL |

Полный список пакетов и обнаруженных уведомлений: [NPM_DEPENDENCIES.json](licensing/NPM_DEPENDENCIES.json). Runtime список: [ANDROID_RUNTIME.json](licensing/ANDROID_RUNTIME.json). Original material registry: [MATERIALS.json](licensing/MATERIALS.json).

После разрешения прав рекомендуется составить точный `THIRD_PARTY_NOTICES` из оригинальных текстов, сопоставить его с фактическим source/web/APK комплектом и хранить provenance изменений. APK/бандлы сейчас не модифицируются; включение уведомлений в будущую упаковку — отдельная проверяемая работа.

[GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.html) и её правила сохранения legal notices не отменяют исходные условия MIT/BSD/Apache и не дают права изменять чужие лицензионные файлы. [Совместимость по FSF](https://www.gnu.org/licenses/gpl-faq.html#WhatDoesCompatMean) означает допустимость комбинации при соблюдении обеих систем условий, а не передачу copyright на сторонний компонент владельцу ShashBesh.

## Подготовленный комплект 2026-10-11

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) содержит ссылки на сохранённые точные upstream тексты; [NOTICE_INDEX.json](licensing/NOTICE_INDEX.json) — 137 записей, SHA-256, источники и gaps. 86 уникальных текстов хранятся в `docs/licensing/notices/`. Оригинальные тексты сохранены побайтово, README License section bplist-parser извлечён без переписывания. NanoHTTPD LICENSE.txt взят из обоих точных runtime JAR; его copyright отличается от отдельного upstream LICENSE.md, поэтому тексты не подменены друг другом.

B-04 остаётся открытым: четыре platform entries без собственного license file; adapted dd-plist scope bplist-parser; полнота upstream Android copyright/NOTICE вне embedded archive entries; интеграция и сопровождение фактических source/web/APK поставок. 75 отсутствующих optional payloads — R-03. Robot attribution/source — R-01. Ни общий Apache текст, ни этот index не являются доказательством полноты notices каждого Android компонента.

## Решение владельца — этап final preparation, 2026-10-11

Owner declaration OWN-06: display name **Mister Metes**, copyright year **2026**, выбран **GNU GPL version 3 only / GPL-3.0-only**. Уведомление для собственных материалов: **Copyright (C) 2026 Mister Metes**. Решение охватывает собственные исходники/движок, документацию, оригинальные рисунки/графику, таблицы/данные в пределах прав владельца. Веса включены условно: только после подтверждения их правового статуса и полномочий лицензирования. Сторонние части сохраняют исходные лицензии.

B-01/B-02 закрыты для заявленных собственных, контролируемых владельцем частей на основании owner declaration и OWN-01…04; это не независимое доказательство каждого файла и не разрешение на сторонние включения. Конкретные third-party проблемы учитываются отдельно в B-04/R-01. B-03 остаётся открытым для условия о весах; B-04 — для completeness/distribution notices. Текущий статус: **2 BLOCKER, 4 REVIEW, 6 INFO** (B-01/B-02 переведены в INFO с указанным scope). Ранее описанные статусы — исторические этапы; текущий вывод будет обновлён после технической проверки. LICENSE пока не добавлен.

## Final preparation: текущий комплект и границы

Комплект расширен с сохранением исходных 137/86 до **336 records / 151 texts**: Android versioned source copyright/permission headers и original archive legal texts, dd-plist historical MIT header, fsevents exact license. [FINAL_PREPARATION.json](licensing/FINAL_PREPARATION.json) хранит file mappings, integrity и distribution results. Подзадача dd-plist attribution разрешена консервативным notice; четыре installed platform gaps и 75 absent archive gaps теперь проверены по точным tarballs, но native bundled scope ещё остаётся R-03/B-04. Android source texts подготовлены; полнота и сопровождение текущего APK/web не установлены. [ARTWORK_NOTICES.md](licensing/ARTWORK_NOTICES.md) содержит conditional robot notice.

Copyright (C) 2026 Mister Metes относится к owner-controlled original portions по OWN-06; GPL-3.0-only — выбранная, но ещё не принятая проектом лицензия. Third-party portions не получают этот copyright/новую лицензию. Для weights grant остаётся условным. Старые запросы имени/года/выбора владельца и подготовки доступных source notices выполнены; текущие open items B-03/B-04 перечислены в action plan.
