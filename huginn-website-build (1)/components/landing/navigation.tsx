"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { name: "Home",     href: "/" },
  { name: "Features", href: "/features" },
  { name: "Commands", href: "/commands" },
  { name: "Demo",     href: "/demo" },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* Pill Nav container */}
      <nav className="pill-nav-container" aria-label="Main navigation">
        <div className="pill-nav">

          {/* ── Logo pill ─────────────────────────────────────── */}
          <Link href="/" className="pill-logo" aria-label="Huginn home">
            <img
              src="/logo.jpeg"
              alt="Huginn logo"
              className="w-7 h-7 rounded-full object-cover border border-white/10"
            />
            <span className="pill-logo-text" style={{ color: "#f0f0f8" }}>Huginn</span>
          </Link>

          {/* ── Desktop pill items ─────────────────────────────── */}
          <div className="pill-nav-items desktop-only">
            <ul className="pill-list" role="list">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className={`pill${active ? " is-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      style={{
                        "--pill-bg": "rgba(255,255,255,0.06)",
                        "--pill-text": "#f0f0f8",
                      } as React.CSSProperties}
                    >
                      <span className="pill-label">{link.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── Mobile hamburger ───────────────────────────────── */}
          <button
            className="mobile-menu-button mobile-only"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <span className="hamburger-line" style={{ transform: mobileOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
            <span className="hamburger-line" style={{ opacity: mobileOpen ? 0 : 1 }} />
            <span className="hamburger-line" style={{ transform: mobileOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
          </button>

        </div>

        {/* ── Mobile popover ─────────────────────────────────────── */}
        <div
          className="mobile-menu-popover mobile-only"
          style={{
            opacity: mobileOpen ? 1 : 0,
            visibility: mobileOpen ? "visible" : "hidden",
            transform: mobileOpen ? "scale(1)" : "scale(0.95)",
            transition: "opacity 0.2s, transform 0.2s, visibility 0.2s",
          }}
        >
          <ul className="mobile-menu-list" role="list">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`mobile-menu-link${active ? " is-active" : ""}`}
                  >
                    {link.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Inject pill-nav CSS tokens that match our original design */}
      <style>{`
        .pill-nav-container {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .pill-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pill-logo {
          height: 46px;
          border-radius: 9999px;
          background: #0d0d1a;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .pill-logo-text {
          font-family: var(--font-geist-pixel-line), monospace;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }
        .pill-nav-items {
          height: 46px;
          background: #0d0d1a;
          border-radius: 9999px;
          overflow: hidden;
        }
        .pill-list {
          list-style: none;
          display: flex;
          align-items: stretch;
          gap: 3px;
          margin: 0;
          padding: 3px;
          height: 100%;
        }
        .pill-list > li { display: flex; height: 100%; }
         .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 20px;
          background: rgba(255,255,255,0.06);
          color: #f0f0f8;
          text-decoration: none;
          border-radius: 9999px;
          font-family: var(--font-sans), sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          white-space: nowrap;
          transition: background 0.2s, color 0.2s;
        }
        .pill:hover { background: rgba(255,255,255,0.12); }
        .pill.is-active {
          background: #00e676 !important;
          color: #000 !important;
        }
        .desktop-only { display: flex; }
        .mobile-only  { display: none; }
        .mobile-menu-button {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: #0d0d1a;
          border: none;
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          cursor: pointer;
          padding: 0;
        }
        .hamburger-line {
          width: 16px;
          height: 2px;
          background: #f0f0f8;
          border-radius: 1px;
          transform-origin: center;
          transition: transform 0.25s, opacity 0.25s;
          display: block;
        }
        .mobile-menu-popover {
          position: absolute;
          top: 58px;
          right: 0;
          width: 200px;
          background: #0d0d1a;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 12px 40px rgba(0,0,0,0.6);
          z-index: 998;
          padding: 8px;
        }
        .mobile-menu-list {
          list-style: none;
          margin: 0; padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mobile-menu-link {
          display: block;
          padding: 10px 16px;
          color: #7070a0;
          text-decoration: none;
          font-family: var(--font-sans), sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .mobile-menu-link:hover { background: rgba(255,255,255,0.04); color: #f0f0f8; }
        .mobile-menu-link.is-active { background: rgba(0,230,118,0.08); color: #00e676; font-weight: 600; }
        @media (max-width: 768px) {
          .pill-nav-container { top: 10px; left: 10px; right: 10px; transform: none; width: calc(100% - 20px); align-items: flex-end; }
          .pill-nav { width: 100%; justify-content: space-between; }
          .desktop-only { display: none; }
          .mobile-only  { display: flex; }
          .mobile-menu-button { display: flex; }
        }
      `}</style>
    </>
  );
}
