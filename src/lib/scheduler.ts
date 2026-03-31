import { addDays, setHours, setMinutes, setSeconds, startOfDay } from "date-fns";

const WINDOWS = [
  { startHour: 8, endHour: 10 },
  { startHour: 16, endHour: 18 },
];

export function buildSchedule(totalContacts: number, totalDays: number, anchorDate = new Date()) {
  const perDayTarget = Math.max(1, Math.ceil(totalContacts / Math.max(1, totalDays)));
  const cappedPerDay = Math.min(Math.max(perDayTarget, 1), 8);
  const slots: Date[] = [];

  for (let dayIndex = 0; slots.length < totalContacts; dayIndex += 1) {
    const dailyCount = Math.min(cappedPerDay, totalContacts - slots.length);
    const day = addDays(startOfDay(anchorDate), dayIndex);

    for (let i = 0; i < dailyCount; i += 1) {
      const window = WINDOWS[i % WINDOWS.length];
      const hourOffset = Math.floor(Math.random() * Math.max(1, window.endHour - window.startHour));
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const slot = setSeconds(
        setMinutes(setHours(day, window.startHour + hourOffset), minute),
        second,
      );
      slots.push(slot);
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}
