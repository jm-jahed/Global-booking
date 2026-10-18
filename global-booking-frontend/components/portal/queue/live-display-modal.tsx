"use client";

import { useEffect, useState } from "react";
import { X, Volume2, Monitor, Sparkles } from "lucide-react";
import { QueueItem, CounterStation } from "@/types/queue";

interface LiveDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: QueueItem[];
  counters: CounterStation[];
}

export function LiveDisplayModal({
  isOpen,
  onClose,
  queue,
  counters,
}: LiveDisplayModalProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const servingItems = queue.filter((item) => item.status === "Serving");
  const upcomingItems = queue.filter(
    (item) => item.status === "Next" || item.status === "Waiting"
  );

  return (
    <div className="tv-display-overlay">
      <div className="tv-display-container">
        {/* Top TV Bar */}
        <header className="tv-display-header">
          <div className="tv-brand-block">
            <div className="tv-brand-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e5b869"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <circle cx="8" cy="14" r="1" fill="#e5b869" />
                <circle cx="12" cy="14" r="1" fill="#e5b869" />
                <circle cx="16" cy="14" r="1" fill="#e5b869" />
              </svg>
            </div>
            <div>
              <div className="tv-brand-title">
                <span className="text-white font-extrabold tracking-wider">GLOBAL </span>
                <span className="text-gold font-extrabold tracking-wider">BOOKING</span>
              </div>
              <span className="tv-brand-sub">WAITING ROOM LIVE DISPLAY</span>
            </div>
          </div>

          <div className="tv-header-center">
            <span className="tv-live-pill">
              <span className="live-pulsing-dot" />
              LIVE QUEUE SYSTEM
            </span>
          </div>

          <div className="tv-header-right">
            <div className="tv-clock-box">
              <span className="tv-clock-time">{time}</span>
              <span className="tv-clock-date">Tuesday, Apr 15, 2025</span>
            </div>
            <button
              type="button"
              className="tv-close-btn"
              onClick={onClose}
              title="Exit TV Display"
              aria-label="Close TV Display"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* TV Main Grid */}
        <main className="tv-display-main-grid">
          {/* Left: NOW SERVING BIG BOARDS */}
          <section className="tv-serving-section">
            <div className="tv-section-heading-row">
              <h2 className="tv-section-heading">NOW SERVING</h2>
              <span className="tv-station-count">{counters.length} Active Stations</span>
            </div>

            <div className="tv-stations-grid">
              {counters.map((c) => {
                const assignedItem = queue.find(
                  (q) => q.status === "Serving" && q.counterName.includes(c.name)
                );
                const ticket = assignedItem?.ticketNumber || c.currentTicket || "—";

                return (
                  <div key={c.id} className="tv-station-card">
                    <div className="tv-station-header">
                      <span className="tv-station-name">{c.name}</span>
                      <span className="tv-station-room">{c.room}</span>
                    </div>

                    <div className="tv-station-ticket-display">
                      <span className="tv-ticket-number">{ticket}</span>
                      {assignedItem && (
                        <span className="tv-ticket-client">{assignedItem.clientName}</span>
                      )}
                    </div>

                    <div className="tv-station-footer">
                      <span className="tv-doctor-name">{c.specialist}</span>
                      <span className="tv-doctor-role">{c.specialistRole}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right: UPCOMING TICKETS QUEUE */}
          <section className="tv-upcoming-section">
            <div className="tv-section-heading-row">
              <h2 className="tv-section-heading">UPCOMING TICKETS</h2>
              <span className="tv-waiting-count">{upcomingItems.length} Waiting</span>
            </div>

            <div className="tv-upcoming-list">
              {upcomingItems.slice(0, 7).map((item, idx) => (
                <div
                  key={item.id}
                  className={`tv-upcoming-item ${idx === 0 ? "item-next-up" : ""}`}
                >
                  <div className="tv-upcoming-left">
                    <span className="tv-up-ticket">{item.ticketNumber}</span>
                    <span className="tv-up-client">{item.clientName}</span>
                  </div>
                  <div className="tv-upcoming-right">
                    <span className="tv-up-station">{item.counterName.split("(")[0]}</span>
                    <span className="tv-up-wait">~{item.estWaitMinutes} min</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Notification Banner at bottom of TV */}
            <div className="tv-chime-banner">
              <Volume2 size={18} className="text-gold" />
              <span>Chimes will chime automatically when your ticket number is called.</span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
