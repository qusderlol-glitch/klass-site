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

## 4. Вход учителя и результаты на сайте (обязательно)

Чтобы учитель видел результаты на сайте, а ученики **не** могли их читать и менять тесты:

1. Слева **Build → Authentication** (или «Security → Authentication») → **Get started**.
2. Вкладка **Sign-in method** → **Email/Password** → включи первый переключатель → **Save**.
3. Вкладка **Users** → **Add user** → e-mail учителя и пароль (придумай надёжный) → **Add user**.
   Этим e-mail и паролем учитель входит на сайте во вкладке «Tulemused».
4. **Firestore Database → Rules** → замени всё на это и нажми **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /works/{code}  { allow read: if true; allow write: if request.auth != null; }
    match /meta/{doc}    { allow read: if true; allow write: if request.auth != null; }
    match /pages/{doc}   { allow read: if true; allow write: if request.auth != null; }
    match /results/{id}  { allow create: if true; allow read, update, delete: if request.auth != null; }
  }
}
```

Что это значит:
- тесты и страницу класса **читают все**, а **создавать и менять** может только учитель, который вошёл;
- результат **сдать** может любой ученик, а **смотреть** результаты — только учитель.
