# План перехода ShashBesh на GPLv3

Текущий результат final preparation, 2026-10-11: **2 BLOCKER / 4 REVIEW / 6 INFO**. GPLv3 не принята. OWNER-решение сохранено как OWN-06: **Copyright (C) 2026 Mister Metes**, **GPL-3.0-only**, собственные контролируемые владельцем материалы; сторонние части сохраняют исходные условия. Веса включены условно, а не автоматически. История прежних этапов находится в LICENSING_AUDIT.md и Git.

| Категория / ID | Статус и критерий |
|---|---|
| BLOCKER B-03 | Условие разрешения на веса не закрыто: подтвердить применимые права/полномочия и model scope. Согласовать предпочитаемую форму модификации: веса, training code/config, feature/geometry/policy definitions и роль необходимых данных. Техническая provenance-проверка завершена; её повторять не требуется |
| BLOCKER B-04 | В web/APK/release не установлен полный сопровождающий notice комплект. Source notices расширены, но остаются artwork scope и конкретные notices вложенного Emoji2 FlatBuffers JAR. Native build tools не найдены в этих web/APK payloads. Нужна проверяемая комплектация реальной поставки; документы в PR не доказывают сопровождение старого Release |
| REVIEW R-01 | 34 Capacitor template resources имеют проверенный источник/MIT notice; точная genealogy robot drawable и artwork/trademark scope остаются. Условная robot attribution подготовлена в ARTWORK_NOTICES.md, не встроена в APK |
| REVIEW R-02 | Проверять MPL/EPL/CDDL/LGPL build/test инструменты только при их поставке. Runtime inventory не превращать в полный cache inventory |
| REVIEW R-03 | 79 optional/platform lock entries (75 прежних отсутствующих + 4 установленных без license file) получены, integrity совпала у всех. 78 архивов без embedded legal text; parent MIT/rollup notices сохранены, но вложенные native зависимости требуют отдельного scope review при поставке |
| REVIEW R-04 | GPL-3.0-only выбрана явно. Предпочитаемая форма изменения модели и conditional grant — B-03; не предполагать, что частные datasets обязаны быть публичными без проверки scope |
| INFO B-01 | Закрыто для собственных source/engine/docs/test contributions по owner declaration. Это не независимое доказательство прав на любые сторонние фрагменты |
| INFO B-02 | Закрыто для собственных рисунков/поля/таблиц/данных по OWN-01…04/06. Идеи механики и текстовое выражение различаются; third-party материалы исключены из owner grant |
| INFO I-01 | Просмотренные license families не выявили явной GPLv3 несовместимости; completeness notices ещё не закрыта |
| INFO I-02 | MIT/ISC/BSD/Apache/BlueOak/Unlicense сохраняются; root GPL не заменяет upstream notices |
| INFO I-03 | Инструменты и локальные training artifacts не становятся частью поставки автоматически |
| INFO I-04 | Этапы сохранены отдельными коммитами; история/Release/APK/правила/движок/алгоритмы/веса не изменены |

## Завершённые технические подзадачи

Использованы исходные 137 notice records / 86 texts. Комплект расширен до **336 records / 151 unique texts**. Получены 52 Android source JAR, собраны 2 414 copyright headers / 63 unique headers, сохранены component/file mappings. Два остальных coordinates — POM-only BOM, 404 sources.jar не считается неопознанной бинарной лицензией. Найден исторический dd-plist MIT header (Daniel Dreibrodt, 2011); его notice консервативно сохранён для acknowledged bplist-parser adaptation. Точная перенесённая ревизия не установлена, но upstream permission/credit источник разрешён.

## Оставшиеся действия

1. Подтвердить условие OWN-06 для весов и согласовать модельный source scope; имя/год/выбранную лицензию владельца повторно не запрашивать.
2. Разрешить R-01/R-03 для включаемых artwork/native частей; сопоставить notice комплект с реальной поставкой.
3. Обеспечить сопровождающие notices для web/APK. Для старого Release, изменение которого запрещено этой задачей, подготовленный PR не считается remediation; решение о будущей поставке/сопровождении принимается отдельно.
4. Только после закрытия существенных blockers добавить неизменённый полный официальный GNU GPLv3 в LICENSE, объявить GPL-3.0-only scope и исключения. Не merge PR без отдельного подтверждения.

Подробное evidence: [FINAL_PREPARATION.json](licensing/FINAL_PREPARATION.json), [NOTICE_INDEX.json](licensing/NOTICE_INDEX.json), [MATERIALS.json](licensing/MATERIALS.json), [ARTWORK_NOTICES.md](licensing/ARTWORK_NOTICES.md).

## Focused B-03/B-04 resolution at baseline af59666

Current evidence and exact remediation: [LICENSING_BLOCKER_RESOLUTION.md](LICENSING_BLOCKER_RESOLUTION.md), [BLOCKER_EVIDENCE.json](licensing/BLOCKER_EVIDENCE.json). Both blockers remain open. B-03 is now tied to two identical JSON weight files and the identical embedded 6,505-parameter arrays; no invented grant. B-04 is narrowed to actual companion notices, shipped robot/template scope and a concrete missing nested FlatBuffers component inside Emoji2 (`libs/repackaged.jar`, 49 shipped classes). All 192 raster assets map to known resource containers; no packaged fonts/native SO/WASM were found. Optional native build-tool notices are not an APK shipment blocker here. No general inventory expansion: only [SHIPPED_COMPONENT_GAPS.json](licensing/SHIPPED_COMPONENT_GAPS.json) adds the proven nested component; the 54 Maven coordinates and 336 notices remain unchanged.
