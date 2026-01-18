const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TIMEZONE_OFFSET_HOURS = 3; // мск типо

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const setTimeOnDate = (date, time) => {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw ?? 0);
  const minutes = Number(minutesRaw ?? 0);
  const result = new Date(date);
  result.setUTCHours(hours - TIMEZONE_OFFSET_HOURS, minutes, 0, 0);
  return result;
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const seedEvents = [
  { id: '1', title: 'Frontend Meetup', description: 'Обсуждаем UI-паттерны и составляем бэклог для зимнего хакатона.', location: 'Campus - Aud. 3', start: '10:00', end: '11:30', registerable: true, registerUrl: 'https://bilw.in', offset: 0 },
  { id: '2', title: 'Project Sync', description: 'Быстрый апдейт по задачам, статус интеграций и блокеры.', location: 'Telegram Voice Chat', start: '13:00', end: '14:00', offset: 0 },
  { id: '6', title: 'Product Demo', description: 'Показываем последнюю сборку календаря и собираем обратную связь.', location: 'Demo Room · 7 этаж', start: '15:30', end: '16:15', registerable: true, registerUrl: 'https://bilw.in', offset: 0 },
  { id: '7', title: 'Evening Networking', description: 'Неформальное общение, обмен контактами и идеи для новых спринтов.', location: 'Campus Cafe', start: '18:00', end: '23:50', registerable: true, registerUrl: 'https://bilw.in', offset: 0 },
  { id: '3', title: 'Design Review', description: 'Финальный проезд по макетам мобильной версии раскладки.', location: 'Campus - Aud. 12', start: '09:30', end: '10:15', offset: 1 },
  { id: '8', title: 'Mentor Office Hours', description: 'Менторы отвечают на вопросы по графику событий и API.', location: 'Coworking Stage', start: '11:00', end: '12:00', offset: 1 },
  { id: '9', title: 'Lunch & Learn', description: 'Ланч с докладом о лучших практиках Telegram Mini Apps.', location: 'Food Hall', start: '13:30', end: '14:30', offset: 1 },
  { id: '10', title: 'User Interviews', description: 'Созваниваемся с пилотными пользователями календаря.', location: 'Online · Zoom', start: '17:00', end: '18:00', registerable: true, registerUrl: 'https://example.com', offset: 1 },
  { id: '4', title: 'Hackathon Prep', description: 'Собираем команды и настраиваем окружение перед стартом.', location: 'Coworking Lab', start: '16:00', end: '18:00', registerable: true, registerUrl: 'https://example.com', offset: 2 },
  { id: '5', title: 'Team Stand-up', description: 'Короткий статус о релизных задачах и новых идеях календаря.', location: 'Telegram Video', start: '19:00', end: '19:15', offset: 2 },
  { id: '11', title: 'QA Sync', description: 'Синхронизация по тест-кейсам и критическим багам.', location: 'Lab · Aud. 5', start: '11:00', end: '11:30', offset: 2 },
  { id: '12', title: 'Tech Talk: Animations', description: 'Разбираем анимации Telegram UI и делимся примерами.', location: 'Lecture Hall · 2', start: '14:00', end: '15:00', registerable: true, registerUrl: 'https://bilw.in', offset: 2 },
  { id: '13', title: 'Strategy Standup', description: 'Обсуждаем приоритеты на неделю и риски по спринту.', location: 'Telegram Voice Chat', start: '09:00', end: '09:20', offset: 3 },
  { id: '14', title: 'Partner Briefing', description: 'Рассказываем партнёрам о запуске календаря и получаем вопросы.', location: 'Meeting Point · B1', start: '12:00', end: '13:00', registerable: true, registerUrl: 'https://example.com', offset: 3 },
  { id: '15', title: 'Design System Sprint', description: 'Команда шлифует компоненты для приложения расписания.', location: 'Design Hub', start: '15:00', end: '17:30', offset: 3 },
  { id: '16', title: 'Student Onboarding', description: 'Новые участники знакомятся с командой и процессами.', location: 'Main Campus · Hall 1', start: '10:00', end: '12:00', registerable: true, registerUrl: 'https://bilw.in', offset: 4 },
  { id: '17', title: 'Code Review Marathon', description: 'Ревьюим PRы, делимся лучшими практиками и идеями для оптимизации.', location: 'Coworking Lab', start: '13:00', end: '16:00', offset: 4 },
  { id: '18', title: 'Community AMA', description: 'Ответы на вопросы студентов по расписанию и будущим апдейтам.', location: 'Telegram Live Stream', start: '19:00', end: '20:00', offset: 4 },
];

async function main() {
  for (const seed of seedEvents) {
    const date = addDays(today, seed.offset);
    date.setHours(0, 0, 0, 0);
    const startTime = setTimeOnDate(date, seed.start);
    const endTime = seed.end ? setTimeOnDate(date, seed.end) : null;

    await prisma.event.upsert({
      where: { id: seed.id },
      update: {
        title: seed.title,
        description: seed.description,
        location: seed.location,
        date,
        startTime,
        endTime,
        registerable: Boolean(seed.registerable),
        registerUrl: seed.registerUrl ?? null,
      },
      create: {
        id: seed.id,
        title: seed.title,
        description: seed.description,
        location: seed.location,
        date,
        startTime,
        endTime,
        registerable: Boolean(seed.registerable),
        registerUrl: seed.registerUrl ?? null,
      },
    });
  }

  console.log('Seeded demo events');
}

main()
  .catch((error) => {
    console.error('Failed to seed database', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
