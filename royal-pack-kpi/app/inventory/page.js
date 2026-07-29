'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const LOCATIONS = ['Freezer 1', 'Freezer 2', 'Freezer 3', 'Frontier'];
const PRODUCT_COLORS = ['#D4AF37', '#3FA9F5', '#8AAB7E', '#F2EFE6', '#B08D57', '#C06A4A'];

function fmtNum(v, d = 0) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: d });
}

const emptyForm = { product: '', location: LOCATIONS[0], dateLabel: '', quantity: '', unit: 'lbs', editPassword: '' };

function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

export default function InventoryPage() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeLocation, setActiveLocation] = useState(LOCATIONS[0]);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/inventory')
      .then((r) => r.json())
      .then((data) => {
        setSnapshots(data.snapshots || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allProducts = [...new Set(snapshots.map((s) => s.product))].sort((a, b) => a.localeCompare(b));
  const locationEntries = snapshots.filter((s) => s.location === activeLocation);
  const productsInLocation = [...new Set(locationEntries.map((s) => s.product))].sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!loading) {
      buildChart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots, activeLocation, loading]);

  function buildChart() {
    const ctx = canvasRef.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();
    const gridColor = 'rgba(255,255,255,0.06)';
    const tickColor = '#98A0A5';

    const labels = [];
    locationEntries.forEach((s) => {
      if (!labels.includes(s.dateLabel)) labels.push(s.dateLabel);
    });

    const datasets = productsInLocation.map((product, idx) => {
      const entries = locationEntries.filter((s) => s.product === product);
      const valueByLabel = {};
      entries.forEach((s) => { valueByLabel[s.dateLabel] = s.quantity; });
      const color = PRODUCT_COLORS[idx % PRODUCT_COLORS.length];
      return {
        type: 'line',
        label: product,
        data: labels.map((l) => (valueByLabel[l] !== undefined ? valueByLabel[l] : null)),
        borderColor: color,
        backgroundColor: 'transparent',
        pointBackgroundColor: color,
        tension: 0.25,
        pointRadius: 3,
        borderWidth: 2.5,
        spanGaps: true,
      };
    });

    chartRef.current = new Chart(ctx, {
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#F2EFE6', font: { family: 'Inter', size: 11 } } },
          tooltip: { titleFont: { family: 'IBM Plex Mono' }, bodyFont: { family: 'IBM Plex Mono' } },
        },
        scales: {
          x: { ticks: { color: tickColor, font: { family: 'IBM Plex Mono', size: 10 }, maxRotation: 45, minRotation: 30 }, grid: { color: gridColor } },
          y: { ticks: { color: tickColor }, grid: { color: gridColor },
            title: { display: true, text: 'Quantity on hand', color: tickColor, font: { family: 'IBM Plex Mono', size: 10 } } },
        },
      },
    });
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function openModal() {
    setForm({ ...emptyForm, location: activeLocation, dateLabel: todayLabel() });
    setFormError('');
    setModalOpen(true);
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.product.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!form.dateLabel.trim()) {
      setFormError('Date is required.');
      return;
    }
    if (form.quantity === '' || isNaN(Number(form.quantity))) {
      setFormError('Quantity must be a number.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Could not save this reading.');
        setSaving(false);
        return;
      }
      setSnapshots((prev) => [...prev, data.snapshot]);
      setActiveLocation(data.snapshot.location);
      setForm(emptyForm);
      setModalOpen(false);
    } catch (err) {
      setFormError('Something went wrong. Try again.');
    }
    setSaving(false);
  }

  const heroCards = productsInLocation.map((product) => {
    const entries = locationEntries.filter((s) => s.product === product);
    const latest = entries[entries.length - 1];
    const prevEntry = entries.length > 1 ? entries[entries.length - 2] : null;
    let delta = null;
    if (prevEntry && prevEntry.quantity !== 0) {
      const diff = latest.quantity - prevEntry.quantity;
      const pct = (diff / Math.abs(prevEntry.quantity)) * 100;
      delta = { diff, pct, arrow: diff >= 0 ? '▲' : '▼' };
    }
    return { product, latest, delta };
  });

  const historyRows = [...locationEntries].reverse();

  return (
    <div className="wrap">
      <div className="masthead">
        <div className="masthead-left">
          <div className="eyebrow">Est. M6270 · Basin City, WA</div>
          <h1>Royal Pack — Inventory</h1>
          <div className="masthead-sub">
            {loading ? 'Loading…' : `${allProducts.length} product${allProducts.length === 1 ? '' : 's'} · ${snapshots.length} readings logged across all locations`}
          </div>
        </div>
        <div className="header-actions">
          <Link href="/" className="logout-btn" style={{ textDecoration: 'none' }}>← Ledger</Link>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
          <button className="add-week-btn" onClick={openModal}>+ Log Reading</button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '32px' }}>
        <div className="tab-row">
          {LOCATIONS.map((loc) => (
            <button key={loc} className={`tab-btn ${activeLocation === loc ? 'active' : ''}`} onClick={() => setActiveLocation(loc)}>
              {loc}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state">Loading inventory…</div>
        ) : productsInLocation.length === 0 ? (
          <div className="loading-state">No readings logged yet for {activeLocation}.</div>
        ) : (
          <>
            <div style={{ padding: '20px 20px 0' }}>
              <div className="hero-grid" style={{ gridTemplateColumns: `repeat(${Math.min(heroCards.length, 6)}, 1fr)` }}>
                {heroCards.map((c) => (
                  <div className="hero-card" key={c.product}>
                    <div className="hero-label">{c.product}</div>
                    <div className="hero-value">{fmtNum(c.latest.quantity, 1)} {c.latest.unit}</div>
                    <div className="hero-delta" style={{ color: 'var(--text-faint)' }}>{c.latest.dateLabel}</div>
                    {c.delta && (
                      <div className={`hero-delta ${c.delta.diff >= 0 ? 'pos' : 'neg'}`}>
                        {c.delta.arrow} {Math.abs(c.delta.pct).toFixed(1)}% vs last reading
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-area">
              <canvas ref={canvasRef}></canvas>
            </div>
          </>
        )}
      </div>

      {!loading && productsInLocation.length > 0 && (
        <>
          <div className="ledger-head">
            <h2>{activeLocation} — Reading History</h2>
            <span className="ledger-count">{historyRows.length} readings</span>
          </div>
          <div className="ledger-scroll">
            <div className="ledger-row header-row" style={{ gridTemplateColumns: '34px 1fr 1fr 1fr' }}>
              <span></span><span>Product</span><span>Date</span><span>On Hand</span>
            </div>
            {historyRows.map((s) => (
              <div className="ledger-row" key={s.id} style={{ gridTemplateColumns: '34px 1fr 1fr 1fr', cursor: 'default' }}>
                <span className="tag-hole"></span>
                <span className="cell-value">{s.product}</span>
                <span className="tag-week">{s.dateLabel}</span>
                <span className="cell-value">{fmtNum(s.quantity, 1)} {s.unit}</span>
              </div>
            ))}
          </div>
          <div className="footnote">Switch the tabs above to see a different freezer/location</div>
        </>
      )}

      {modalOpen && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h3>Log Reading</h3>
            <div className="modal-sub">Enter the current on-hand amount for a product at a location. New product names create a new tracked item automatically.</div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field span2">
                  <label htmlFor="product">Product</label>
                  <input
                    id="product"
                    list="product-list"
                    type="text"
                    placeholder="e.g. 50/50 Trim, Boxed Beef"
                    value={form.product}
                    onChange={(e) => updateField('product', e.target.value)}
                    required
                  />
                  <datalist id="product-list">
                    {allProducts.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="location">Location</label>
                  <select
                    id="location"
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', borderRadius: '2px' }}
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="dateLabel">Date</label>
                  <input
                    id="dateLabel"
                    type="text"
                    placeholder="e.g. 7/29/2026"
                    value={form.dateLabel}
                    onChange={(e) => updateField('dateLabel', e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="quantity">Quantity on hand</label>
                  <input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) => updateField('quantity', e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="unit">Unit</label>
                  <input
                    id="unit"
                    type="text"
                    placeholder="lbs"
                    value={form.unit}
                    onChange={(e) => updateField('unit', e.target.value)}
                  />
                </div>
              </div>
              <div className="field" style={{ marginTop: '16px' }}>
                <label htmlFor="invEditPassword">Edit password</label>
                <input
                  type="password"
                  id="invEditPassword"
                  value={form.editPassword}
                  onChange={(e) => updateField('editPassword', e.target.value)}
                  required
                />
              </div>
              {formError && <div className="form-error">{formError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save reading'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
