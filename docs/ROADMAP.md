# Roadmap —ShashBesh

## Ближайшая приёмка alpha

- Установка и обновление APK на Huawei P Smart2021 и RealmeRMX3630; сохранения, offline Tactical, ориентации, реальные safe areas и сенсорное управление.
- Визуальное согласование мобильного поля и истории.
- Согласование лицензии отдельно от технического релиза; согласование production signing и хранения ключа.
- Подтверждение правил открытых трактовок с автором игры; согласованные правила не менять самостоятельно.

## LAN / Wi-Fi —в разработке

- Реальные Ubuntu↔Android испытания обеих схем authoritative host,2–4 устройства.
- NSD/mDNS на разных маршрутизаторах, ручной адрес, Wi-Fi loss и восстановление после уничтожения процесса.
- Проверка длительных партий, лимитов хранилища и ошибок записи; управление жизненным циклом Android-host.
- После приёмки документировать поддерживаемые конфигурации; до неё сетевой режим экспериментальный.

## AI Evolution Lab —в разработке

- Больше validation и независимых контрольных партий, строгий game-level split и проверки утечки.
- Расширяемые модели, версии/артефакты, метрики ресурсов и воспроизводимые seed.
- Ограниченный self-play после оценки CPU/RAM; candidate/champion сравнение и rollback при регрессии.
- Турниры между версиями нейросетей с одинаковыми seed и сбалансированными местами. Existing baseline CLI и контрольные турниры не равны готовому Evolution Lab.

Tactical остаётся обычным соперником, пока новая модель не подтвердит улучшение. AI v0.1 экспериментальна.

## Следующие публичные версии

- CI для unit/browser/build, контролируемое размещение APK и контрольных сумм.
- Улучшение accessibility, экспорта Android файлов и тестов WebView на реальных устройствах.
- Раздельные main (релиз), develop (игра), ai-lab (исследования). Датасеты/личные журналы публиковать только отдельным обоснованным набором.

Блокчейн, DiceChain, drand, токены и финансовые функции не входят в этот alpha release. Сроки и новые правила этим roadmap не утверждаются.

English: prioritize real-device acceptance and experimental LAN validation, then a resource-bounded AI Evolution Lab with independent tournaments. Keep gameplay rules fixed and require evidence before replacing Tactical. License and production signing are separate decisions.
