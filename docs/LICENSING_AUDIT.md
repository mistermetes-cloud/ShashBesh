# ShashBesh — аудит перехода на GNU GPLv3

Дата исходного аудита: 2026-10-10. Продолжение: 2026-10-11. Ветка: `feature/gplv3-license`. Проверенная исходная база: `af46155eff2a49780925109895bfa9a4924d4073`; на момент исходного аудита `origin/main` совпадала с ней; remote main повторно не проверялась.

**Статус: переход пока не разрешён — 4 BLOCKER, 4 REVIEW, 4 INFO.** Это число групп вопросов, а не количество ошибочных файлов. `LICENSE` GPLv3 не добавлен, README не объявляет проект GPLv3. Лицензии сторонних компонентов не изменены.

## Объём и сохранение результатов

Использованы ранее собранные результаты `artifacts/license-audit/`; проверка зависимостей с нуля не запускалась. Подготовлены описания происхождения и прав для **191 отслеживаемого файла** исходной базы. Локальные материалы обучения рассмотрены отдельно и не смешаны с количеством публичных файлов.

- npm: 213 dependency entries в lock (8 собственных workspaces и 205 сторонних записей). 130 сторонних пакетов установлены и имеют лицензионные декларации; 75 платформенных optional пакетов отсутствуют на этой машине и рассмотрены только по lock metadata.
- Android: 54 Maven coordinates в разрешённом `debugRuntimeClasspath`; лицензии 3 дочерних POM разрешены через parent POM. 52 Apache-2.0, 2 BSD-3-Clause. Capacitor project modules учтены отдельно по MIT.
- В Gradle-кэше рассмотрены 276 POM; это также build/test инструменты, а не перечень компонентов APK.
- 34 Android-ресурса совпали побайтово с `@capacitor/cli@7.6.9/assets/android-template.tar.gz`.
- Проверены регистрация модели, training manifest, provenance категорий исходных журналов и доступные уведомления bundled JavaScript.

Сохранены исходные JSON inventory, Gradle report, официальные материалы GNU, NumPy license, protected hashes и архив `artifacts/license-audit/collected-evidence.zip`. Они остаются локально. Публичные, проверяемые копии реестров:

- [MATERIALS.json](licensing/MATERIALS.json) — **отдельная запись для каждого из 191 файла**: путь, хеш, предполагаемый источник, известный/неподтверждённый правообладатель, текущая лицензия, возможность использования с GPLv3 и требуемое подтверждение.
- [NPM_DEPENDENCIES.json](licensing/NPM_DEPENDENCIES.json) — 130 установленным сторонним пакетам сопоставлены версия, источник, SPDX declaration, файлы уведомлений, известные copyright notices и условия проверки.
- [ANDROID_RUNTIME.json](licensing/ANDROID_RUNTIME.json) — 54 runtime coordinates, лицензии с parent resolution, происхождение и оставшиеся проверки уведомлений.

Наличие файла в репозитории, Git author `ShashBesh Local`, package author или локальная генерация сами по себе не являются доказательством владения всеми правами. Отсутствие метаданных также не доказывает нарушение; оно означает, что разрешение не установлено этим аудитом. Для фактов/числовых данных отдельно следует определить наличие охраняемых элементов.

## Реестр основных материалов

| Пути | Предполагаемый источник | Известный правообладатель | Текущая лицензия | GPLv3 / что подтвердить |
|---|---|---|---|---|
| `packages/*/src`, `apps/web/src`, `tests`, `scripts`, проектные документы | Разработка в рабочей папке, проектная история; происхождение отдельных фрагментов подтверждается отдельно | Действительные авторы/правообладатели не установлены одним Git author | Общая лицензия проекта пока не объявлена | B-01: подтвердить состав собственных вкладов и полномочия дать GPLv3; сторонние части оставить под исходными лицензиями |
| `data/igra_64_koordinaty.csv` | Входной технический пакет проекта | Собственное основание по заявлению владельца; не независимо подтверждено | Разрешение/лицензия в файле отсутствует | B-02: источник заявлен владельцем; подтвердить правообладателя и разрешение распространять; отдельно определить правовой статус фактических координат |
| `reference/igra_64_pole_s_domami.png`, `reference/igra_64_pole_s_domami.xlsx` | Предоставленные исходные материалы поля | Владелец заявил собственное происхождение; независимой проверки прав нет | Не записана | B-02: авторство/собственное основание заявлены владельцем; подтвердить полномочия и допустимость распространять их; нахождение в папке не означает право GPL-релицензирования |
| `docs/RULES_V1.md`, `START_HERE_CODEX.md` | Входные правила и техническое задание | Механика заявлена владельцем; все формулировки отдельно не подтверждены | Не записана | B-02: подтвердить права на текст; идеи/правила и их текстовое выражение не считать одним объектом автоматически |
| `docs/images/*.png` | Скриншоты Playwright UI проекта | Права на исходный UI/поле зависят от подтверждения источников | Нет отдельной лицензии изображений | B-01/B-02: подтвердить права на кадры и изображённые материалы; частных EXIF/text metadata нет |
| `android/app/src/main/res/*` (34 совпавших файла) | Capacitor CLI template 7.6.9 | Drifty Co. для подтверждённых MIT частей; внешнее artwork проверяется отдельно | MIT template grant | B-04/R-01: сохранить MIT notice и установить scope для логотипов/robot artwork |
| `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml` | Совпавший template с Android robot-like vector | Возможный Google-derived artwork; точный источник этой реализации не подтверждён | MIT шаблона не принимается за доказательство лицензии всей картинки | R-01: проверить применимость Android robot attribution/CC BY 3.0 и отдельный scope; не перекрашивать лицензию в GPL |
| `android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/gradle-wrapper.jar` | Gradle wrapper | Original authors по сохранённым headers | Apache-2.0; JAR содержит `META-INF/LICENSE` | Совместимо с GPLv3, сохранить оригинальные notices/LICENSE; I-02 |
| `packages/agents/models/{shashbesh-v0.1,active-model,registry}.json` | Локальное Tactical-supervised обучение и версионирование | Отдельный model rights holder не записан | Нет model-specific license metadata | B-03/R-04: подтвердить права/условия данных и весов, scope лицензирования и предпочитаемую форму модификации |

### Android templates и изображения

34 точных совпадения с установленным CLI подтверждают источник этих ресурсов, но не дают права считать их собственными изображениями ShashBesh. Основной PNG launcher — логотип Capacitor. Сохранённый vector drawable изображает Android robot-like голову. Adaptive icon ссылается на `@mipmap/ic_launcher_foreground`, а не на этот drawable; неиспользуемость drawable не отменяет его присутствия в исходниках.

[Capacitor 7.6.9 MIT](https://raw.githubusercontent.com/ionic-team/capacitor/7.6.9/LICENSE) требует сохранения copyright и permission notice. [Официальные Android brand guidelines](https://developer.android.com/distribute/marketing-tools/brand-guidelines#android-robot) указывают отдельную атрибуцию и CC BY 3.0 для Android robot. Применимость к конкретному vector/его происхождение — R-01; факта blanket GPL permission для него не установлено. Trademark права не выводятся из copyright-лицензии MIT или GPL.

### NanoHTTPD

`org.nanohttpd:nanohttpd:2.3.1` и `nanohttpd-websocket:2.3.1` не имеют прямой license записи в child POM. Parent `nanohttpd-project:2.3.1` содержит BSD-3-Clause; [официальный текст тега 2.3.1](https://raw.githubusercontent.com/NanoHttpd/nanohttpd/nanohttpd-project-2.3.1/LICENSE.md) подтверждает её. Указаны Paul S. Hawke, Jarno Elonen и Konstantinos Togias; отдельные source notices могут содержать других contributors/даты. Требуются исходный copyright, условия, disclaimer и non-endorsement clause, в том числе для бинарного распространения.

`LanHttpServer.java` использует API NanoHTTPD; это не основание менять лицензию самого NanoHTTPD. Отдельную чистоту авторства проектных изменений покрывает B-01.

### npm dependencies

| Лицензия | Установленные сторонние пакеты | Lock записи сторонних пакетов |
|---|---:|---:|
| MIT | 100 | 175 |
| ISC | 12 | 12 |
| Apache-2.0 | 5 | 5 |
| BlueOak-1.0.0 | 10 | 10 |
| Unlicense | 1 | 1 |
| BSD-3-Clause | 1 | 1 |
| 0BSD | 1 | 1 |
| **Итого** | **130** | **205** |

Прямые runtime npm packages `@capacitor/android/core`, `@noble/hashes`, `bonjour-service`, `react`, `react-dom`, `ws` объявляют MIT. Playwright/TypeScript — Apache-2.0, Vite/tsx/fast-check — MIT. 8 workspace entries без `license` — собственные packages, не 8 неопознанных внешних библиотек.

В просмотренных декларациях нет GPLv3-incompatible runtime family. [FSF license list](https://www.gnu.org/licenses/license-list.html) рассматривает MIT/Expat, ISC, modified BSD, Unlicense и Apache-2.0 как GPL-compatible; Apache-2.0 совместима именно с GPLv3. Для BlueOak permissive текст требует сохранения лицензии или ссылки; [FAQ правообладателя формы](https://blueoakcouncil.org/license-faq) не усматривает причины несовместимости с GPLv3. Это не заменяет сохранение конкретных upstream notices. R-03: 75 отсутствующих optional payload не прошли full-text/binary review, их MIT в lock — ограниченное доказательство.

### Gradle и инструменты

Для 54 разрешённых runtime Maven coordinates найдено 52 Apache-2.0 и 2 BSD-3-Clause, с parent resolution для NanoHTTPD и `com.google.guava:listenablefuture:1.0`. В runtime graph не найдены MPL/CDDL/EPL компоненты.

В кэше build/test tools есть `universalchardet:1.0.3` с MPL-1.1 declaration, JUnit BOM с EPL-2.0, JNA с LGPL/Apache альтернативами, javax.annotation/activation с CDDL/GPLv2+Classpath Exception. Их наличие в кэше не доказывает включение в APK и не является автоматически несовместимостью приложения. R-02 требует проверять конкретные варианты/исключения и комплектацию, если эти инструменты или test binaries будут распространяться.

NumPy 2.2.6 — BSD; wheel включает OpenBLAS/LAPACK, GCC runtime и LGPL libquadmath notices. Python/JDK/SDK/Gradle-кэш не входят в Git или APK как toolchain. Нельзя переносить лицензию инструмента на веса либо объявлять runtime конфликт по одному cache POM. Android dependency task выполнен только для отчёта; APK не собирался.

### Neural network weights и training manifests

Registry связывает модель v0.1 с checksum и dataset hash. Manifest фиксирует 67 source episodes: 64 `generated-tactical`, 1 `existing-exported-jsonl`, 1 `existing-journal:artifacts/acceptance-first.jsonl`, 1 `existing-journal:artifacts/smoke.jsonl`. Training reports подтверждают локальное supervised обучение; импорт сторонних pretrained weights в просмотренных результатах не обнаружен.

Заявление владельца OWN-05 подтверждает заявленное проектное происхождение данных, но не заменяет специальное разрешение владельца на любые способы использования/распространения. Файлы не содержат отдельного model license/rightsholder grant. B-03: подтвердить происхождение и разрешения старых journal/export, наличие собственных либо сторонних ограничений и полномочия на лицензирование весов. Не утверждается, что числовые веса обязательно охраняются copyright или что каждый dataset обязан публиковаться под GPL; scope и предпочитаемая форма модификации — R-04. Датасеты остаются локально, не удалены и не включены в PR.

### Bundled JavaScript notices

В APK `ShashBesh-v0.3.1-alpha-android-debug.apk` есть copyright comments Meta Platforms, Inc. and affiliates. В проверенном bundled JS не найден полный текст MIT permission. Отдельных архивных entries с `LICENSE`/`NOTICE`/`copyright` в имени APK нет. Это **потенциальный пробел комплектации уведомлений**, а не вывод суда о нарушении: нужно проверить весь комплект сопровождающих материалов, а не только имена файлов.

B-04: до заявления о compliant GPL distribution оформить пакет обязательных сторонних уведомлений для исходников/web/APK. Уведомления React не дают права убрать notices других компонентов. Изменение упаковки/новый APK в эту задачу не входят.

## Список необходимых уведомлений

[План сохранения copyright](COPYRIGHT_NOTICES.md) содержит перечень React/Capacitor/NanoHTTPD/noble/ws/bonjour, остальных npm dependencies, AndroidX/Kotlin, Gradle, инструментов и изображений. Требования оригинальных MIT/ISC/BSD/Apache/BlueOak лицензий сохраняются. Root GPL LICENSE для собственных работ не заменяет их.

## Решение и подтверждения

**Переход всего включённого проекта на GPLv3 пока нельзя завершать.** Явной несовместимости в проверенном runtime graph не установлено; препятствия — подтверждение исходных прав/модельных источников и уведомлений, а также отдельные REVIEW scope.

Владельцу необходимо подтвердить действительных правообладателей собственных вкладов, происхождение/разрешение исходных материалов и training sources, разрешённый model scope. Затем подготовить и проверить полный notice комплект. План и критерии закрытия: [LICENSING_ACTION_PLAN.md](LICENSING_ACTION_PLAN.md).

`LICENSE`, package license fields, README GPL declaration, код, правила, модели и APK не меняются этим отчётом. Нового Release нет. Аудит основан на inventory/первичных условиях и сохраняет явно неразрешённые вопросы вместо blanket rights statement.

## Продолжение после прерывания — 2026-10-11

Аудит продолжен с `1442cfb`, ветка `feature/gplv3-license`; до продолжения рабочая папка была чистой. Существующие четыре документа и dependency inventories сохранены, новый полный аудит не запускался. PR #2 проверен через GitHub: draft, та же ветка. Сетевая ошибка sandbox при первом запросе устранена разрешённым доступом; исходные локальные evidence сохранены.

### Заявления владельца

В сообщении этой сессии владелец сообщил: поле самостоятельно разработано и нарисовано им; правила и механика разработаны им; исходные рисунки подготовлены им; XLSX/CSV основаны на его собственных материалах; обучающие данные создавались в проекте на основе его данных. Реестр записывает это как OWN-01…OWN-05 с датой и источником сообщения. Это заявления владельца, а не независимое доказательство прав на все файлы и не blanket GPL grant. Имя правообладателя, сторонние вклады в код/текст и разрешение GPLv3 для конкретного scope пока не установлены.

### Проверка трёх старых источников и весов

[TRAINING_PROVENANCE.json](licensing/TRAINING_PROVENANCE.json) содержит хеши и результаты проверки без публикации локальных журналов:

| Источник | Партия / seed | Проверенных decisions | Tactical в корпусе |
|---|---|---:|---:|
| `artifacts/training/self-play.jsonl` + исходный `artifacts/training-self-play.jsonl` | `sim-training-example-0` / `training-example-0` | 201 | 0 |
| `artifacts/acceptance-first.jsonl` + `acceptance-100.json` | `sim-acceptance-v1-0` / `acceptance-v1-0` | 290 | 99 |
| `artifacts/smoke.jsonl` + `smoke.json` | `sim-smoke-0` / `smoke-0` | 231 | 84 |

Проверены hash chains через `importLog`, engine validation каждой записи, gameId/logHead/count против manifest и controller mapping отчётов. Экспорт совпал с восстановленными 201 records; все 201 сохранённые числовые features совпали. Greedy-only source имеет ноль Tactical строк и не влияет на fit. Это техническое соответствие сохранённых материалов; отчёты/seed не доказывают независимо исторический запуск или авторские права.

В `train.py:91–92` исходные веса генерируются через NumPy random normal, biases — нулевые; просмотренный путь не загружает pretrained checkpoint. Модель имеет seed 20261009; checksum канонического JSON совпал с registry (`35606b…1387e`), файловый SHA-256 отличается от него по определению (`0cdca2…5cfc`). Active и version files побайтово совпадают. SHA-256 compact corpus совпадает с manifest, model и registry (`186b00…152f6`). Повторное обучение не проводилось. B-03 сужен до полномочий/ограничений и принятого model licensing scope; происхождение технически согласовано и поддержано OWN-05.

### Подготовленные notices и пересмотр препятствий

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) и [NOTICE_INDEX.json](licensing/NOTICE_INDEX.json) фиксируют 137 записей, 86 уникальных точных текстов: 130 ранее найденных npm license files, MIT section README bplist-parser, сохранённые embedded Android notices и Gradle wrapper LICENSE. Тексты дедуплицированы по SHA-256, каждая запись сохраняет компонент/версию и источник. Это сопровождающий source package; существующие APK/web assets не изменены.

Для 54 runtime coordinates просмотрены cached JAR/AAR и вложенные classes.jar на LICENSE/NOTICE/copyright entries. Отсутствие embedded notice не доказывает отсутствие обязанностей: upstream source/header review остаётся B-04. У четырёх platform records (включая повторную installed запись esbuild) нет собственного license файла; 75 отсутствующих optional payload остаются R-03. У bplist-parser MIT найден в README, но source ссылается на адаптацию `3breadt/dd-plist`; точный объём заимствования/условия и атрибуция требуют проверки B-04. Не предполагается blanket clearance из package SPDX.

| Категория / ID | Пересмотренный результат |
|---|---|
| BLOCKER B-01 | Открыт: действительные правообладатели source/docs/test и полномочия дать GPLv3; новые заявления не покрывают весь код |
| BLOCKER B-02 | Частично разрешён: собственное происхождение поля/рисунков/основания XLSX/CSV и механики заявлено; остаются GPL полномочия/scope, все текстовые и сторонние вклады |
| BLOCKER B-03 | Частично разрешён: три источника и модель технически согласованы, проектное происхождение данных заявлено; остаются права/ограничения и GPL scope весов |
| BLOCKER B-04 | Частично разрешён: пакет точных notices подготовлен; остаются upstream полнота, platform/adapted-code gaps и сопровождение поставок |
| REVIEW R-01…R-04 | Открыты с прежним scope: artwork, распространяемые build tools, optional payloads, model/source scope |
| INFO I-01…I-04 | Сохранены; новых runtime license incompatibilities этим продолжением не установлено |

Проверка официальных [Android brand guidelines](https://developer.android.com/distribute/marketing-tools/brand-guidelines#android-robot) 2026-10-11 подтверждает отдельные robot attribution/CC BY 3.0 условия; происхождение конкретного vector остаётся R-01. Повторный запрос GNU FAQ завершился timeout; прежнее сохранённое evidence не заменено сетевой ошибкой.

Готовность GPLv3: **нет**. Ни один B-01…B-04 не объявлен полностью закрытым. Закрыты технические подзадачи проверки трёх старых источников, связи корпуса/модели/registry и сбора доступных upstream notices. Владелец должен назвать copyright holder(s), подтвердить полномочия и разрешение GPL-3.0-only для определённого scope собственных вкладов, текстов, исходных материалов и весов, указать остальных авторов/внешние ограничения либо подтвердить их отсутствие в этих пределах. Оставшиеся notice/artwork проверки выполняются по источникам, а не заменяются заявлением владельца.

Проверка сохранения: все 191 baseline SHA-256, 122 protected SHA-256 и 137 notice hashes совпали. Whitespace check применяется к написанным документам; оригинальные upstream тексты сохраняют исходные пробелы побайтово.
