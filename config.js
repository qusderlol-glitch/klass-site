// Настройки сайта. Меняются в одном месте.
window.CONFIG = {
  // Кому можно отправить анкету и результаты.
  // email — куда приходит письмо. Если email пустой, ученик получит готовый текст,
  // который нужно скопировать и отправить вручную (например, учительнице в Suhtlus).
  RECIPIENTS: [
    {
      id: 'author',
      label: 'Автору сайта',
      hint: 'Qusderlol — он делает этот сайт',
      email: 'qusderlol@gmail.com'
    },
    {
      id: 'teacher',
      label: 'Учительнице',
      hint: 'через Suhtlus',
      email: '',          // впиши почту учительницы, и письма будут уходить ей автоматически
      suhtlus: true
    }
  ],

  // Тема письма с анкетой
  SUBJECT: 'Анкета: сайт для компьютерного класса',

  // Firebase — общее хранилище работ в интернете. Пока null, работы видны только на том компьютере,
  // где их создали. Вставь сюда настройки из Firebase (Project settings → Your apps → Config), например:
  // FIREBASE: { apiKey: '...', authDomain: '...', projectId: '...', storageBucket: '...', messagingSenderId: '...', appId: '...' },
  FIREBASE: {
    apiKey: 'AIzaSyDBry8Yvo9GI3GxE67JK9NY7sBk69UB3wo',
    authDomain: 'arvutiklass.firebaseapp.com',
    projectId: 'arvutiklass',
    storageBucket: 'arvutiklass.firebasestorage.app',
    messagingSenderId: '549459866433',
    appId: '1:549459866433:web:df3545318c81e5002827c0'
  },

  // Код для раздела «Ответы к контрольным» в кабинете учителя.
  // Это не настоящая защита (код виден в этом файле), а просто чтобы ученики не открывали ответы случайно.
  TEACHER_PIN: '2580'
};
