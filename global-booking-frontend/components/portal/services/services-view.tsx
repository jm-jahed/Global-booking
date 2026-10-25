"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Shield,
  FileText,
  ArrowUpRight,
  Filter,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Star,
  MapPin,
  HeartPulse,
  Activity,
  Layers,
} from "lucide-react";
import { MOCK_SERVICES } from "@/lib/data/mock-services";
import { ClinicalService, ServiceCategory } from "@/types/service";
import { NewServiceModal } from "./new-service-modal";
import { ServiceDetailModal } from "./service-detail-modal";

type ViewMode = "cards" | "table";

const CATEGORIES: ServiceCategory[] = [
  "All Categories",
  "General Medicine",
  "Cardiology & Vascular",
  "Dental & Oral Surgery",
  "Dermatology & Aesthetics",
  "Orthopedics & Spine",
  "Diagnostics & Radiology",
  "Pediatrics",
  "Rehabilitation & Physio",
];

export function ServicesView() {
  const [services, setServices] = useState<ClinicalService[]>(MOCK_SERVICES);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory>("All Categories");
  const [insuranceFilter, setInsuranceFilter] = useState<"all" | "covered" | "private">("all");
  const [activeService, setActiveService] = useState<ClinicalService | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live UAE Clock
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.status === "Active" || s.status === "Popular").length;
    const totalMins = services.reduce((acc, s) => acc + s.durationMinutes, 0);
    const avgDuration = total > 0 ? Math.round(totalMins / total) : 0;
    const insuranceCount = services.filter((s) => s.insuranceCovered).length;
    return { total, active, avgDuration, insuranceCount };
  }, [services]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.primarySpecialist.toLowerCase().includes(q) ||
        s.room.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));

      const matchCategory =
        categoryFilter === "All Categories" || s.category === categoryFilter;

      const matchInsurance =
        insuranceFilter === "all" ||
        (insuranceFilter === "covered" && s.insuranceCovered) ||
        (insuranceFilter === "private" && !s.insuranceCovered);

      return matchQuery && matchCategory && matchInsurance;
    });
  }, [services, searchQuery, categoryFilter, insuranceFilter]);

  // Handle Add Service
  const handleAddService = (newS: ClinicalService) => {
    setServices([newS, ...services]);
    showToast(`Service "${newS.name}" registered successfully!`);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Categories");
    setInsuranceFilter("all");
  };

  const hasActiveFilters =
    searchQuery || categoryFilter !== "All Categories" || insuranceFilter !== "all";

  return (
    <div className="dashboard-page-container patients-portal-view">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="portal-toast">
          <CheckCircle2 size={16} className="text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER SECTION */}
      <section className="appointments-header-section" aria-label="Services Catalog Header">
        <div className="header-text-group">
          <div className="module-title-row">
            <div
              className="hero-icon-calendar"
              style={{
                background: "rgba(229,184,105,0.12)",
                borderColor: "rgba(229,184,105,0.3)",
              }}
            >
              <Stethoscope size={24} className="text-gold" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 className="hero-title-text">Clinical Services Catalog</h1>
                <span className="patient-total-chip">{services.length} Procedures</span>
              </div>
            </div>
          </div>
          <p className="hero-tagline">
            Manage hospital specialties, procedural tariffs, insurance coverage, and clinical specialist allocation.
          </p>
        </div>

        {/* Live Clock & Action Button */}
        <div className="header-action-buttons">
          {currentTime && (
            <div className="live-clock-pill" title="Current Local Hospital Time">
              <span className="clock-pulse-dot" />
              <Clock size={13} className="text-gold" />
              <span>{currentTime}</span>
            </div>
          )}

          <button
            type="button"
            className="primary-gold-button"
            onClick={() => setIsNewModalOpen(true)}
            title="Register a new clinical procedure"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>Add New Service</span>
          </button>
        </div>
      </section>

      {/* 2. 4 STAT METRIC CARDS */}
      <section className="dashboard-metrics-grid" aria-label="Services Statistics">
        {/* Metric 1: Total Services */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Layers size={20} className="text-gold" />
            </div>
            <span className="metric-label">Total Services</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <span className="metric-main-value">{kpis.total}</span>
              <span className="metric-growth-badge positive">
                <span>↑ 100% active roster</span>
              </span>
            </div>
            <div className="metric-sparkline-wrap">
              <svg viewBox="0 0 100 30" className="metric-sparkline-svg" aria-hidden="true">
                <path
                  d="M0 24 Q 25 18, 50 20 T 100 8"
                  fill="none"
                  stroke="#e5b869"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </article>

        {/* Metric 2: Active & Ready */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Activity size={20} className="text-emerald" />
            </div>
            <span className="metric-label">Active & Bookable</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <span className="metric-main-value">{kpis.active}</span>
              <span className="metric-growth-badge positive">
                <span>● Operational</span>
              </span>
            </div>
            <div className="metric-sparkline-wrap">
              <svg viewBox="0 0 100 30" className="metric-sparkline-svg" aria-hidden="true">
                <path
                  d="M0 26 Q 25 22, 50 14 T 100 6"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </article>

        {/* Metric 3: Avg Slot Duration */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Clock size={20} className="text-amber" />
            </div>
            <span className="metric-label">Avg Slot Duration</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <span className="metric-main-value">{kpis.avgDuration} <small style={{ fontSize: 14 }}>mins</small></span>
              <span className="metric-sub-label text-muted">optimized triage</span>
            </div>
            <div className="metric-sparkline-wrap">
              <svg viewBox="0 0 100 30" className="metric-sparkline-svg" aria-hidden="true">
                <path
                  d="M0 22 Q 25 25, 50 16 T 100 12"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </article>

        {/* Metric 4: Direct Insurance */}
        <article className="metric-card">
          <div className="metric-card-top">
            <div className="metric-icon-box">
              <Shield size={20} className="text-cyan" />
            </div>
            <span className="metric-label">Insurance Covered</span>
          </div>
          <div className="metric-card-body">
            <div className="metric-number-group">
              <span className="metric-main-value">{kpis.insuranceCount}</span>
              <span className="metric-sub-label text-emerald">Daman & Networks</span>
            </div>
            <div className="metric-sparkline-wrap">
              <svg viewBox="0 0 100 30" className="metric-sparkline-svg" aria-hidden="true">
                <path
                  d="M0 28 Q 25 20, 50 10 T 100 4"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </article>
      </section>

      {/* 3. TOOLBAR CONTROLS: SEARCH, FILTERS & VIEW MODE */}
      <section className="dashboard-panel patients-toolbar-panel" aria-label="Services Search & Controls">
        <div className="patients-toolbar-inner">
          {/* Left: Search Bar */}
          <div className="toolbar-search-field">
            <Search size={15} className="toolbar-search-icon" />
            <input
              type="text"
              placeholder="Search procedure, code (e.g. CARD), doctor, room, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="toolbar-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Center: Dropdown Filters */}
          <div className="toolbar-filters-group">
            {/* Category Filter */}
            <div className="filter-select-wrapper">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ServiceCategory)}
                className="luxury-select-input"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Insurance Coverage Filter */}
            <div className="filter-select-wrapper">
              <select
                value={insuranceFilter}
                onChange={(e) => setInsuranceFilter(e.target.value as any)}
                className="luxury-select-input"
              >
                <option value="all">All Insurance Types</option>
                <option value="covered">Covered by Insurance</option>
                <option value="private">Private / Self-Pay</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="filter-clear-link"
                onClick={handleClearFilters}
                title="Clear active filters"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Right: View Mode Toggle */}
          <div className="view-mode-toggle-group">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
              title="Cards Grid View"
            >
              <LayoutGrid size={15} />
              <span>Cards View</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <TableIcon size={15} />
              <span>Table View</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. MAIN SERVICES CONTENT: CARDS VIEW */}
      {viewMode === "cards" ? (
        <div className="patients-cards-grid">
          {filteredServices.length === 0 ? (
            <div className="empty-state-panel" style={{ gridColumn: "1 / -1" }}>
              <Stethoscope size={44} className="text-gold" />
              <h3 className="empty-title">No clinical services found</h3>
              <p className="empty-desc">No procedure matches your current search criteria or category filter.</p>
              <button type="button" className="secondary-action-button" onClick={handleClearFilters}>
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredServices.map((service) => (
              <article key={service.id} className="patient-luxury-card service-luxury-card">
                {/* Card Top: Category, Code & Status */}
                <div className="service-card-top-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span className="patient-mrn-badge">{service.code}</span>
                    <span className="service-category-pill">{service.category}</span>
                  </div>
                  <span className={`portal-badge badge-${service.status === "Popular" ? "in-treatment" : "active"}`}>
                    {service.status === "Popular" ? "★ Popular" : service.status}
                  </span>
                </div>

                {/* Procedure Title & Description */}
                <div className="service-card-title-group">
                  <h3 className="service-card-title">{service.name}</h3>
                  <p className="service-card-description">{service.description}</p>
                </div>

                {/* Micro Metric Badges Strip */}
                <div className="service-specs-strip">
                  <div className="service-spec-pill">
                    <Clock size={12} className="text-gold" />
                    <span>{service.durationMinutes} mins</span>
                  </div>

                  <div className="service-spec-pill">
                    <span className="text-gold font-bold">{service.priceAED}</span>
                  </div>

                  <div className={`service-spec-pill ${service.insuranceCovered ? "spec-covered" : "spec-private"}`}>
                    <Shield size={12} />
                    <span>{service.insuranceCovered ? "Insurance" : "Private"}</span>
                  </div>
                </div>

                {/* Specialist Row */}
                <div className="service-specialist-row">
                  <div className="service-specialist-avatar-wrap">
                    <Image
                      src={service.specialistAvatar}
                      alt={service.primarySpecialist}
                      width={32}
                      height={32}
                      className="service-specialist-img"
                    />
                  </div>
                  <div className="service-specialist-info">
                    <span className="service-specialist-name">{service.primarySpecialist}</span>
                    <span className="service-room-name">
                      <MapPin size={10} style={{ display: "inline", marginRight: 3 }} />
                      {service.room}
                    </span>
                  </div>
                  <div className="service-card-rating">
                    <Star size={11} fill="#e5b869" color="#e5b869" />
                    <span>{service.rating}</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="patient-card-footer" style={{ marginTop: 12 }}>
                  <span className="service-bookings-text">
                    {service.bookingsCount} bookings completed
                  </span>
                  <button
                    type="button"
                    className="card-view-chart-btn"
                    onClick={() => setActiveService(service)}
                  >
                    <span>View Details</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        /* 5. TABLE VIEW */
        <article className="dashboard-panel patients-table-panel">
          <div className="table-responsive-wrapper">
            <table className="patients-luxury-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Service Code</th>
                  <th>Procedure / Specialty</th>
                  <th style={{ width: 110 }}>Duration</th>
                  <th style={{ width: 130 }}>Tariff</th>
                  <th style={{ width: 150 }}>Insurance Coverage</th>
                  <th>Assigned Specialist</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 110, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px" }}>
                      No clinical services match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((service) => (
                    <tr key={service.id} className="patient-row-hover">
                      <td>
                        <span className="patient-mrn-badge">{service.code}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600, color: "#ffffff", fontSize: 13 }}>
                            {service.name}
                          </span>
                          <span style={{ fontSize: 11, color: "#8e9fb5" }}>
                            {service.category} • {service.room}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "#cbd5e1", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Clock size={12} className="text-gold" />
                          {service.durationMinutes} mins
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700, color: "var(--portal-gold)", fontSize: 13 }}>
                            {service.priceAED}
                          </span>
                        </div>
                      </td>
                      <td>
                        {service.insuranceCovered ? (
                          <span className="service-tag-covered">
                            Covered ({service.coPayPercentage ?? 10}% co-pay)
                          </span>
                        ) : (
                          <span className="service-tag-private">Self-Pay Only</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden" }}>
                            <Image
                              src={service.specialistAvatar}
                              alt=""
                              width={26}
                              height={26}
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                          <span style={{ fontSize: 12, color: "#ffffff" }}>{service.primarySpecialist}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`portal-badge badge-${service.status === "Popular" ? "in-treatment" : "active"}`}>
                          {service.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="table-action-icon-btn"
                          onClick={() => setActiveService(service)}
                          title="View Service Details"
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* New Service Registration Modal */}
      <NewServiceModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onAddService={handleAddService}
      />

      {/* Service Detail Modal */}
      <ServiceDetailModal
        service={activeService}
        onClose={() => setActiveService(null)}
        onBookService={(s) => {
          showToast(`Opening booking schedule for "${s.name}"...`);
        }}
      />
    </div>
  );
}
