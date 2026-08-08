/* ── Floating bubble button ── */
.cw-root {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.cw-bubble-btn {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(255, 107, 53, 0.45);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.cw-bubble-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 28px rgba(255, 107, 53, 0.55);
}

.cw-bubble-btn--open {
  background: linear-gradient(135deg, #555, #333);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* ── Chat panel ── */
.cw-panel {
  width: 340px;
  height: 620px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cw-slide-up 0.22s ease;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s ease;
}

.cw-panel.cw-panel--expanded {
  width: 700px;
}

@keyframes cw-slide-up {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}

/* ── Header ── */
.cw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  flex-shrink: 0;
}

.cw-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cw-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.cw-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.cw-subtitle {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.cw-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cw-toggle-size {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cw-toggle-size:hover {
  background: rgba(255, 255, 255, 0.2);
}

.cw-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 50%;
  transition: background 0.15s;
}

.cw-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ── Messages ── */
.cw-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f7f8fc;
}

.cw-messages::-webkit-scrollbar { width: 4px; }
.cw-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

.cw-msg {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.cw-msg--user {
  align-self: flex-end;
  align-items: flex-end;
}

.cw-msg--bot {
  align-self: flex-start;
  align-items: flex-start;
}

.cw-bubble {
  padding: 9px 13px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.5;
  word-break: break-word;
}

.cw-msg--user .cw-bubble {
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.cw-msg--bot .cw-bubble {
  background: #fff;
  color: #222;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.cw-time {
  font-size: 10px;
  color: #aaa;
  margin-top: 3px;
  padding: 0 3px;
}

/* ── Real listing cards returned inline with a bot reply ── */
.cw-msg-listings {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  width: 100%;
}

.cw-msg-listing-card {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 8px;
  align-items: center;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  text-decoration: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.15s, transform 0.15s;
}

.cw-msg-listing-card:hover {
  border-color: #f7931e;
  transform: translateY(-1px);
}

.cw-msg-listing-card img {
  width: 52px;
  height: 52px;
  border-radius: 7px;
  object-fit: cover;
  display: block;
}

.cw-msg-listing-fallback {
  width: 52px;
  height: 52px;
  border-radius: 7px;
  background: #fff7ed;
  display: grid;
  place-items: center;
  font-size: 22px;
}

.cw-msg-listing-card h4 {
  margin: 0;
  color: #111827;
  font-size: 11.5px;
  font-weight: 800;
  line-height: 1.25;
}

.cw-msg-listing-location {
  margin: 2px 0 0;
  color: #6b7280;
  font-size: 10px;
}

.cw-msg-listing-price {
  margin: 2px 0 0;
  color: #f97316;
  font-size: 10.5px;
  font-weight: 800;
}

/* ── Comparison table for multiple listing matches ── */
.cw-compare-wrap {
  width: 100%;
  max-width: 100%;
  margin: 12px 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.cw-compare-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: clamp(10px, 2.7vw, 13px);
  color: #374151;
}

.cw-compare-table th,
.cw-compare-table td {
  min-width: 0;
  padding: 8px 5px;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  border-bottom: 1px solid #edf2f7;
}

.cw-compare-table tbody tr:last-child th,
.cw-compare-table tbody tr:last-child td {
  border-bottom: none;
}

.cw-compare-label-col {
  width: 16%;
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  border-right: 1px solid #e2e8f0;
  box-shadow: 2px 0 5px rgba(0,0,0,0.02);
}

.cw-compare-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  text-decoration: none;
  white-space: normal;
  transition: transform 0.2s ease;
}

.cw-compare-head:hover {
  transform: translateY(-2px);
}

.cw-compare-head img {
  width: min(100%, 72px);
  aspect-ratio: 1.4;
  height: auto;
  border-radius: 8px;
  object-fit: cover;
  display: block;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.cw-compare-fallback {
  width: min(100%, 72px);
  aspect-ratio: 1.4;
  height: auto;
  border-radius: 8px;
  background: #ffedd5;
  display: grid;
  place-items: center;
  font-size: 24px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.cw-compare-title {
  color: #1f2937;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  transition: color 0.15s ease;
}

.cw-compare-head:hover .cw-compare-title {
  color: #ff6b35;
}

.cw-compare-price {
  color: #f97316;
  font-weight: 800;
  font-size: 13.5px;
}

/* ── Typing indicator ── */
.cw-bubble--typing {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 12px 16px;
}

.cw-bubble--typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #bbb;
  animation: cw-bounce 1.2s infinite ease-in-out;
}

.cw-bubble--typing span:nth-child(1) { animation-delay: 0s; }
.cw-bubble--typing span:nth-child(2) { animation-delay: 0.18s; }
.cw-bubble--typing span:nth-child(3) { animation-delay: 0.36s; }

@keyframes cw-bounce {
  0%, 80%, 100% { transform: translateY(0);   background: #ccc; }
  40%           { transform: translateY(-6px); background: #f7931e; }
}

/* ── Input form ── */
.cw-form {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #eee;
  background: #fff;
  flex-shrink: 0;
}

.cw-input {
  flex: 1;
  border: 1.5px solid #e0e0e0;
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.2s;
  background: #fafafa;
}

.cw-input:focus {
  border-color: #f7931e;
  background: #fff;
}

.cw-input:disabled {
  opacity: 0.6;
}

.cw-send {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, transform 0.15s;
  flex-shrink: 0;
}

.cw-send:hover:not(:disabled) { transform: scale(1.1); }
.cw-send:disabled { opacity: 0.4; cursor: default; }

@media (max-width: 768px) {
  .cw-root {
    right: 14px;
    bottom: 14px;
  }

  .cw-panel {
    width: calc(100vw - 28px);
    height: min(620px, calc(100vh - 96px));
  }

  .cw-panel.cw-panel--expanded {
    width: calc(100vw - 28px);
  }
}
