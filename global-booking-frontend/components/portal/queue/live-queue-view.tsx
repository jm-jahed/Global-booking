"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Users2,
  Clock,
  Tv,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Volume2,
  Monitor,
  ChevronDown,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock4,
  RefreshCw,
  BellRing,
  MoreVertical,
  Check,
  ShieldAlert,
} from "lucide-react";
import { MOCK_QUEUE_ITEMS, MOCK_COUNTERS } from "@/lib/data/mock-queue";
import { QueueItem, CounterStation, QueueStatus, PriorityLevel } from "@/types/queue";
import { NewTicketModal } from "./new-ticket-modal";
import { LiveDisplayModal } from "./live-display-modal";

export function LiveQueueView() {
  const [queue, setQueue] = useState<QueueItem[]>(MOCK_QUEUE_ITEMS);
  const [counters, setCounters] = useState<CounterStation[]>(MOCK_COUNTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [stationFilter, setStationFilter] = useState("All Stations");

  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isTvDisplayOpen, setIsTvDisplayOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Next ticket calculation
  const nextTicketNumber = useMemo(() => {
    const numbers = queue.map((q) => parseInt(q.ticketNumber.replace("#", ""), 10) || 0);
    const max = Math.max(20, ...numbers);
    const nextNum = max + 1;
    return `#0${nextNum}`;
  }, [queue]);

  // KPIs
  const kpis = useMemo(() => {
    const waiting = queue.filter((q) => q.status === "Waiting").length;
    const serving = queue.filter((q) => q.status === "Serving").length;
    const completed = queue.filter((q) => q.status === "Completed").length;
    return {
      waiting,
      serving,
      completed,
      estWait: "18 min",
      totalToday: 48,
    };
  }, [queue]);

  // Actions
  const handleCallNext = (counterId: string) => {
    const counter = counters.find((c) => c.id === counterId);
    if (!counter) return;

    // Find next waiting item
    const nextItem = queue.find((q) => q.status === "Next" || q.status === "Waiting");
    if (!nextItem) {
      showToast("No customers waiting in line!");
      return;
    }

    // Update queue items
    setQueue(
      queue.map((item) => {
        // Complete current serving for this counter
        if (item.status === "Serving" && item.counterName.includes(counter.name)) {
          return { ...item, status: "Completed" };
        }
        // Promote next item to serving
        if (item.id === nextItem.id) {
          return {
            ...item,
            status: "Serving",
            counterName: `${counter.name} (${counter.room})`,
            estWaitMinutes: 0,
          };
        }
        return item;
      })
    );

    // Update counter
    setCounters(
      counters.map((c) =>
        c.id === counterId
          ? {
              ...c,
              currentTicket: nextItem.ticketNumber,
              totalServedToday: c.totalServedToday + 1,
            }
          : c
      )
    );

    showToast(`Called ${nextItem.ticketNumber} (${nextItem.clientName}) to ${counter.name}!`);
  };

  const handleCompleteCurrent = (counterId: string) => {
    const counter = counters.find((c) => c.id === counterId);
    if (!counter) return;

    setQueue(
      queue.map((item) => {
        if (item.status === "Serving" && item.counterName.includes(counter.name)) {
          return { ...item, status: "Completed" };
        }
        return item;
      })
    );

    setCounters(
      counters.map((c) =>
        c.id === counterId ? { ...c, currentTicket: undefined } : c
      )
    );

    showToast(`Session at ${counter.name} marked Completed.`);
  };

  const handlePromoteTicket = (ticketId: string) => {
    const target = queue.find((q) => q.id === ticketId);
    if (!target) return;

    setQueue(
      queue.map((q) => (q.id === ticketId ? { ...q, status: "Serving" } : q))
    );
    showToast(`Ticket ${target.ticketNumber} promoted to Serving.`);
  };

  const handleStatusChange = (ticketId: string, status: QueueStatus) => {
    setQueue(queue.map((q) => (q.id === ticketId ? { ...q, status } : q)));
    showToast(`Ticket status updated to ${status}.`);
  };

  const handleAddTicket = (newItem: QueueItem) => {
    setQueue([...queue, newItem]);
    showToast(`Ticket ${newItem.ticketNumber} issued for ${newItem.clientName}!`);
  };

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchSearch =
        item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.specialist.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === "All Status" || item.status === statusFilter;
      const matchPriority =
        priorityFilter === "All Priority" || item.priority === priorityFilter;
      const matchStation =
        stationFilter === "All Stations" || item.counterName.includes(stationFilter);

      return matchSearch && matchStatus && matchPriority && matchStation;
    });
  }, [queue, searchQuery, statusFilter, priorityFilter, stationFilter]);

  return (
    <div className="dashboard-page-container live-queue-module">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="portal-toast">
          <CheckCircle2 size={16} className="text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <section className="appointments-header-section">
        <div className="header-text-group">
          <div className="module-title-row">
            <div className="hero-icon-calendar">
              <Users2 size={24} className="text-gold" />
            </div>
            <h1 className="hero-title-text">Live Queue Management</h1>
            <span className="live-status-pill">
              <span className="live-pulsing-dot" />
              Live
            </span>
          </div>
          <p className="hero-tagline">
            Real-time client check-in triage, station dispatching, and waiting room monitor.
          </p>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="secondary-action-button"
            onClick={() => setIsTvDisplayOpen(true)}
          >
            <Monitor size={15} />
            <span>Open TV Display Monitor ↗</span>
          </button>
          <button
            type="button"
            className="primary-gold-button"
            onClick={() => setIsNewTicketOpen(true)}
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>Issue Walk-In Ticket</span>
          </button>
        </div>
      </section>

      {/* 4 STAT CARDS (Matches exact dashboard metrics) */}
      <section className="dashboard-metrics-grid" aria-label="Queue Metrics">
        {/* Card 1: Currently Waiting */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Clock4 size={20} className="text-gold" />
            </div>
            <span className="metric-label">Currently Waiting</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.waiting.toString().padStart(2, "0")}</div>
              <div className="metric-trend trend-down">
                <span className="trend-arrow">↓ 33%</span>
                <span className="trend-context">vs. yesterday</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,10 Q16,8 28,16 T54,26 T82,32"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="32" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Card 2: Now Serving */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Tv size={20} className="text-gold" />
            </div>
            <span className="metric-label">Now Serving</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value text-gold">#012</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">3 Active Stations</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,32 Q20,30 30,22 T56,12 T82,4"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="4" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Card 3: Next Customer */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Users2 size={20} className="text-gold" />
            </div>
            <span className="metric-label">Next Customer</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value text-cyan">#013</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">Daniel Carter</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,34 Q22,30 36,20 T62,14 T82,6"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="6" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>

        {/* Card 4: Est. Wait Time */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Clock size={20} className="text-gold" />
            </div>
            <span className="metric-label">Est. Wait Time</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <div className="metric-value">{kpis.estWait}</div>
              <div className="metric-trend trend-up">
                <span className="trend-arrow">Under target</span>
              </div>
            </div>
            <div className="metric-sparkline-box">
              <svg width="84" height="38" viewBox="0 0 84 38" fill="none">
                <path
                  d="M2,30 Q24,26 38,18 T64,10 T82,5"
                  stroke="#e5b869"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="82" cy="5" r="2.5" fill="#e5b869" />
              </svg>
            </div>
          </div>
        </article>
      </section>

      {/* DISPATCH STATIONS SECTION */}
      <section className="queue-stations-section">
        <div className="section-title-line">
          <h2 className="panel-title">Active Service Stations & Counters</h2>
          <span className="section-title-sub">Dispatch and call customers directly to individual rooms</span>
        </div>

        <div className="stations-cards-grid">
          {counters.map((c) => {
            const currentItem = queue.find(
              (q) => q.status === "Serving" && q.counterName.includes(c.name)
            );

            return (
              <article key={c.id} className="station-dispatch-card">
                <div className="station-dispatch-top">
                  <div className="station-info-header">
                    <span className="station-name-title">{c.name}</span>
                    <span className="station-room-tag">{c.room}</span>
                  </div>
                  <span className={`station-status-indicator ${c.status.toLowerCase()}`}>
                    ● {c.status}
                  </span>
                </div>

                <div className="station-specialist-info">
                  <Image
                    src={c.specialistAvatar}
                    alt={c.specialist}
                    width={36}
                    height={36}
                    className="station-specialist-avatar"
                  />
                  <div>
                    <h3 className="station-specialist-name">{c.specialist}</h3>
                    <p className="station-specialist-role">{c.specialistRole}</p>
                  </div>
                </div>

                <div className="station-ticket-panel">
                  <span className="panel-ticket-label">Currently Serving</span>
                  {currentItem ? (
                    <div className="serving-ticket-box">
                      <div className="serving-ticket-num">{currentItem.ticketNumber}</div>
                      <div className="serving-ticket-client">{currentItem.clientName}</div>
                      <div className="serving-ticket-service">{currentItem.service}</div>
                    </div>
                  ) : (
                    <div className="idle-ticket-box">
                      <span className="idle-title">Ready for Next</span>
                      <span className="idle-sub">No client at counter</span>
                    </div>
                  )}
                </div>

                <div className="station-dispatch-actions">
                  {currentItem ? (
                    <>
                      <button
                        type="button"
                        className="station-btn-complete"
                        onClick={() => handleCompleteCurrent(c.id)}
                      >
                        <Check size={14} />
                        <span>Finish</span>
                      </button>
                      <button
                        type="button"
                        className="station-btn-call"
                        onClick={() => handleCallNext(c.id)}
                      >
                        <ArrowRight size={14} />
                        <span>Next</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="station-btn-call-full"
                      onClick={() => handleCallNext(c.id)}
                    >
                      <ArrowRight size={14} />
                      <span>Call Next Customer in Line</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* QUEUE PIPELINE TABLE */}
      <section className="dashboard-panel queue-pipeline-panel">
        <div className="table-header-controls">
          <div className="table-title-group">
            <h2 className="panel-title">Waiting Room Queue Pipeline</h2>
            <span className="queue-pipeline-count">
              {filteredQueue.length} customers tracked
            </span>
          </div>

          <div className="table-filter-actions">
            {/* Search */}
            <div className="table-search-box table-search-wide">
              <Search size={14} className="text-muted" />
              <input
                type="text"
                placeholder="Search ticket #, client, service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="table-search-input"
              />
            </div>

            {/* Status Filter */}
            <div className="filter-dropdown-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="table-filter-select"
              >
                <option value="All Status">All Status</option>
                <option value="Serving">Serving</option>
                <option value="Next">Next</option>
                <option value="Waiting">Waiting</option>
                <option value="Completed">Completed</option>
              </select>
              <ChevronDown size={13} className="dropdown-arrow-icon" />
            </div>

            {/* Priority Filter */}
            <div className="filter-dropdown-wrap">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="table-filter-select"
              >
                <option value="All Priority">All Priority</option>
                <option value="VIP">VIP</option>
                <option value="Urgent">Urgent</option>
                <option value="Standard">Standard</option>
              </select>
              <ChevronDown size={13} className="dropdown-arrow-icon" />
            </div>

            {/* Station Filter */}
            <div className="filter-dropdown-wrap">
              <select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="table-filter-select"
              >
                <option value="All Stations">All Stations</option>
                <option value="Station 1">Station 1</option>
                <option value="Station 2">Station 2</option>
                <option value="Station 3">Station 3</option>
                <option value="Station 4">Station 4</option>
              </select>
              <ChevronDown size={13} className="dropdown-arrow-icon" />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive-wrapper">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Client</th>
                <th>Service</th>
                <th>Assigned Specialist</th>
                <th>Counter Station</th>
                <th>Check-In Time</th>
                <th>Est. Wait</th>
                <th>Priority</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length > 0 ? (
                filteredQueue.map((item) => (
                  <tr key={item.id}>
                    {/* Ticket */}
                    <td className="queue-ticket-cell">
                      <span className="queue-ticket-bold">{item.ticketNumber}</span>
                    </td>

                    {/* Client */}
                    <td className="client-cell">
                      <div className="client-avatar-wrapper">
                        <Image
                          src={item.clientAvatar}
                          alt={item.clientName}
                          width={32}
                          height={32}
                          className="client-avatar-img"
                        />
                      </div>
                      <span className="client-name-text">{item.clientName}</span>
                    </td>

                    {/* Service */}
                    <td className="service-cell">{item.service}</td>

                    {/* Specialist */}
                    <td className="staff-cell">{item.specialist}</td>

                    {/* Counter */}
                    <td className="station-cell">
                      <span className="station-tag">{item.counterName.split("(")[0]}</span>
                    </td>

                    {/* Check In */}
                    <td className="time-cell">{item.checkInTime}</td>

                    {/* Est Wait */}
                    <td className="wait-cell">
                      {item.status === "Serving" ? (
                        <span className="text-green font-semibold">At Counter</span>
                      ) : (
                        <span>~{item.estWaitMinutes} min</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td>
                      <span
                        className={`priority-pill ${item.priority.toLowerCase()}`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    {/* Channel */}
                    <td>
                      <span className="channel-badge">{item.channel}</span>
                    </td>

                    {/* Status */}
                    <td className="status-cell">
                      <span
                        className={`status-pill ${
                          item.status === "Serving"
                            ? "status-serving"
                            : item.status === "Next"
                            ? "status-inprogress"
                            : item.status === "Waiting"
                            ? "status-pending"
                            : "status-completed"
                        }`}
                      >
                        {item.status === "Serving" && <span className="status-dot-green" />}
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="actions-cell">
                      <div className="action-button-group">
                        {item.status !== "Serving" && item.status !== "Completed" && (
                          <button
                            type="button"
                            className="action-icon-button"
                            title="Call to counter now"
                            onClick={() => handlePromoteTicket(item.id)}
                          >
                            <BellRing size={14} />
                          </button>
                        )}
                        {item.status === "Serving" && (
                          <button
                            type="button"
                            className="action-icon-button action-btn-confirm"
                            title="Complete session"
                            onClick={() => handleStatusChange(item.id, "Completed")}
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="empty-table-state">
                    No tickets matching &quot;{searchQuery}&quot; found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* New Walk-In Ticket Modal */}
      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onAddTicket={handleAddTicket}
        nextTicketNumber={nextTicketNumber}
      />

      {/* Full Screen Live Waiting Room Display */}
      <LiveDisplayModal
        isOpen={isTvDisplayOpen}
        onClose={() => setIsTvDisplayOpen(false)}
        queue={queue}
        counters={counters}
      />
    </div>
  );
}
