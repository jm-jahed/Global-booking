import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Mobile Responsiveness Audit & Contracts", () => {
  const frontendDir = path.resolve(__dirname, "..");

  it("Root Layout exports Viewport with device-width and initialScale 1", () => {
    const layoutPath = path.join(frontendDir, "app", "layout.tsx");
    assert.ok(fs.existsSync(layoutPath), "layout.tsx must exist");
    const content = fs.readFileSync(layoutPath, "utf-8");

    assert.ok(content.includes("export const viewport: Viewport"), "Must export viewport metadata");
    assert.ok(content.includes('width: "device-width"'), "Must specify device-width");
    assert.ok(content.includes("initialScale: 1"), "Must specify initialScale: 1");
  });

  it("Portal Layout has off-canvas drawer state, backdrop and handles Escape and resize", () => {
    const clientPath = path.join(frontendDir, "components", "portal", "portal-layout-client.tsx");
    assert.ok(fs.existsSync(clientPath), "portal-layout-client.tsx must exist");
    const content = fs.readFileSync(clientPath, "utf-8");

    assert.ok(content.includes("isMobileSidebarOpen"), "Must have isMobileSidebarOpen state");
    assert.ok(content.includes("portal-mobile-backdrop"), "Must render portal-mobile-backdrop element");
    assert.ok(content.includes('"Escape"'), "Must close drawer on Escape key");
    assert.ok(content.includes("window.innerWidth > 1024"), "Must auto-close on desktop resize");
  });

  it("Portal Topbar renders mobile drawer hamburger toggle button with aria accessibility", () => {
    const topbarPath = path.join(frontendDir, "components", "portal", "portal-topbar.tsx");
    assert.ok(fs.existsSync(topbarPath), "portal-topbar.tsx must exist");
    const content = fs.readFileSync(topbarPath, "utf-8");

    assert.ok(content.includes("portal-mobile-toggle-btn"), "Must render portal-mobile-toggle-btn");
    assert.ok(content.includes("onToggleMobileSidebar"), "Must wire onToggleMobileSidebar");
    assert.ok(content.includes('aria-label='), "Must provide accessible aria-label");
  });

  it("Portal Sidebar supports mobile drawer isOpen, onClose, and mobile close button", () => {
    const sidebarPath = path.join(frontendDir, "components", "portal", "portal-sidebar.tsx");
    assert.ok(fs.existsSync(sidebarPath), "portal-sidebar.tsx must exist");
    const content = fs.readFileSync(sidebarPath, "utf-8");

    assert.ok(content.includes("isOpen"), "Must support isOpen prop");
    assert.ok(content.includes("onClose"), "Must support onClose prop");
    assert.ok(content.includes("portal-sidebar-close-btn"), "Must render mobile close button");
    assert.ok(content.includes("sidebar-open"), "Must apply sidebar-open CSS class");
  });

  it("portal.css implements mobile off-canvas drawer, does not hide sidebar on 768px, and includes touch momentum scrolling", () => {
    const cssPath = path.join(frontendDir, "app", "portal.css");
    assert.ok(fs.existsSync(cssPath), "portal.css must exist");
    const content = fs.readFileSync(cssPath, "utf-8");

    assert.ok(content.includes(".portal-sidebar.sidebar-open"), "Must have .portal-sidebar.sidebar-open rule");
    assert.ok(content.includes("transform: translateX(-100%)"), "Sidebar must be off-canvas by default on <=1024px");
    assert.ok(content.includes("transform: translateX(0)"), "Sidebar must translate to 0 when open");
    assert.ok(!content.includes(".portal-sidebar {\n    display: none;\n  }"), "Must not blindly hide sidebar on 768px");
    assert.ok(content.includes("-webkit-overflow-scrolling: touch"), "Must support momentum touch scrolling");
    assert.ok(content.includes("@media (max-width: 360px)"), "Must support ultra-small phone breakpoint 320px-360px");
  });

  it("doctor-public-portfolio.tsx uses fluid dimensions without causing 320px viewport overflow", () => {
    const portfolioPath = path.join(frontendDir, "components", "public", "doctor-public-portfolio.tsx");
    assert.ok(fs.existsSync(portfolioPath), "doctor-public-portfolio.tsx must exist");
    const content = fs.readFileSync(portfolioPath, "utf-8");

    assert.ok(!content.includes('width: "clamp(320px'), "Must not use clamp(320px) which overflows 320px phones with padding");
    assert.ok(content.includes('width: "clamp(240px'), "Must use fluid clamp starting at <=240px");
  });

  it("home.css includes media queries for small phones down to 320px", () => {
    const homeCssPath = path.join(frontendDir, "app", "home.css");
    assert.ok(fs.existsSync(homeCssPath), "home.css must exist");
    const content = fs.readFileSync(homeCssPath, "utf-8");

    assert.ok(content.includes("@media (max-width: 480px)"), "Must have 480px media query");
    assert.ok(content.includes("@media (max-width: 360px)"), "Must have 360px media query");
  });
});
