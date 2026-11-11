# Как подключить Firebase (≈10 минут)

Пока Firebase не подключён, тесты и страница класса видны **только на том компьютере**, где их создали.
После подключения учитель создаёт тест на своём компьютере, а все ученики видят его во вкладке **Testid** и по коду (A1AAA, B3AAA…).

## 1. Создать проект
1. Открой https://console.firebase.google.com и войди своим аккаунтом Google.
2. **Add project / Создать проект** → название, например `arvutiklass` → Google Analytics можно выключить → **Create**.

## 2. Включить базу данных
1. Слева **Build → Firestore Database** → **Create database**.
2. Место хранения: `europe-west` (Европа) → **Next**.
3. Выбери **Start in production mode** → **Create**.
4. Вкладка **Rules** → замени всё на это и нажми **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /works/{code} { allow read, write: if true; }
    match /meta/{doc}   { allow read, write: if true; }
    match /pages/{doc}  { allow read, write: if true; }
  }
}
```

> Эти правила разрешают читать и менять тесты любому, кто открыл сайт. Для школьного сайта это нормально для начала,
> но ученик, который разберётся в коде, теоретически сможет изменить тест. Позже можно добавить вход для учителя.

## 3. Получить настройки
1. Шестерёнка слева сверху → **Project settings**.
2. Внизу **Your apps** → значок **</>** (Web) → название `arvutiklass` → **Register app**.
3. Появится блок `const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", ... }`.
4. **Пришли этот блок мне** — я вставлю его в `config.js` (поле `FIREBASE`) и проверю.
   Можно и самому: вставь значения в `config.js` вместо `FIREBASE: null`.

`apiKey` у Firebase не секретный — он и так виден всем на сайте, это нормально.
