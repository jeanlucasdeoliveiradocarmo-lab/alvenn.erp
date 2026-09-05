"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FIFTEEN_MINUTES_MS,
  MAX_TIMEOUT_MS,
  formatDateTime,
  getTimestampInMillis,
} from "@/lib/crm";

const STORAGE_KEY = "nx-crm:task-notifications:v1";

function readNotifiedTasks() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function useTaskNotifications(leads) {
  const [notifications, setNotifications] = useState([]);
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    notifiedRef.current = readNotifiedTasks();
  }, []);

  const notifyTask = useCallback((lead, task) => {
    const key = `${lead.id}:${task.id}:${getTimestampInMillis(task.agendadaPara)}`;
    if (notifiedRef.current.has(key) || task.concluida) return;

    notifiedRef.current.add(key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...notifiedRef.current]));
    setNotifications((current) => [
      {
        id: key,
        title: "Tarefa em 15 minutos",
        message: `${lead.nome}: ${task.descricao}`,
        scheduledLabel: formatDateTime(task.agendadaPara),
      },
      ...current,
    ]);
  }, []);

  useEffect(() => {
    const timers = [];
    const now = Date.now();

    for (const lead of leads) {
      for (const task of lead.tarefas || []) {
        if (task.concluida) continue;
        const scheduledAt = getTimestampInMillis(task.agendadaPara);
        const notificationAt = scheduledAt - FIFTEEN_MINUTES_MS;
        const delay = notificationAt - now;

        if (scheduledAt > now && delay <= 0) {
          notifyTask(lead, task);
        } else if (delay > 0 && delay <= MAX_TIMEOUT_MS) {
          timers.push(
            window.setTimeout(() => notifyTask(lead, task), delay),
          );
        }
      }
    }

    const fallbackInterval = window.setInterval(() => {
      const currentTime = Date.now();
      for (const lead of leads) {
        for (const task of lead.tarefas || []) {
          const scheduledAt = getTimestampInMillis(task.agendadaPara);
          const remaining = scheduledAt - currentTime;
          if (remaining > 0 && remaining <= FIFTEEN_MINUTES_MS) {
            notifyTask(lead, task);
          }
        }
      }
    }, 30_000);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(fallbackInterval);
    };
  }, [leads, notifyTask]);

  function dismissNotification(id) {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }

  function clearNotifications() {
    setNotifications([]);
  }

  return { notifications, dismissNotification, clearNotifications };
}
