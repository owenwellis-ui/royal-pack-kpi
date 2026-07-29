'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

function fmtNum(v, d = 0) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: d });
}

const emptyForm = { product: '', dateLabel: '', quantity: '', unit: 'lbs', editPassword: '' };

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
  const [activeProduct, setActiveProduct] = useState(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/inventory')
      .then((r) => r.json())
      .then((data) => {
        const snaps = data.snapshots || [];
        setSnapshots(snaps);
        setLoading(false);
        if (snaps.length > 0) {
          setActiveProduct((prev) => prev || snaps[snaps.length - 1].product);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const byProduct = {};
  snapshots.forEach((s) => {
    if (!byProduct[s.product]) byProduct[s.product] = [];
    byProduct[s.product].push(s);
  });
  const products = Object.keys(byProduct).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!loading && activeProduct && byProduct[activeProduct]) {
      buildChart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots, activeProduct, loading]);

  function buildChart() {
    const entries = byProduct[activeProduct] || [];
    const ctx = canvasRef.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();
    const gridColor = 'rgba(255,255,255,0.06)';
    const tickColor = '#98A0A5';
    const unit = entries.length ? entries[entries.length - 1].unit : '';

    chartRef.current = new Chart(ctx, {
      data: {
        labels: entries.map((e) => e.dateLabel),
        datasets: [
          {
            type: 'line',
            label: `${activeProduct} on hand (${unit})`,
            data: entries.map((e) => e.quantity),
            borderColor: '#D4AF37',
            backgroundColor: 'rgba(212,175,55,0.12)',
            pointBackgroundColor: '#D4AF37',
            fill: true,
            tension: 0.25,
            pointRadius: 3,
            borderWidth: 2.5,
          },
        ],
      },
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
            title: { display: true, text: unit, color: tickColor, font: { family: 'IBM Plex Mono', size: 10 } } },
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
    setForm({ ...emptyForm, dateLabel: todayLabel() });
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
      setActiveProduct(data.snapshot.product);
      setForm(emptyForm);
      setModalOpen(false);
    } catch (err) {
      setFormError('Something went wrong. Try again.');
    }
    setSaving(false);
  }

  const heroCards = products.map((p) => {
    const entries = byProduct[p];
    const latest = entries[entries.length - 1];
    const prevEntry = entries.length > 1 ? entries[entries.length - 2] : null;
    let delta = null;
    if (prevEntry && prevEntry.quantity !== 0) {
      const diff = latest.quantity - prevEntry.quantity;
      const pct = (diff / Math.abs(prevEntry.quantity)) * 100;
      delta = { diff, pct, arrow: diff >= 0 ? '▲' : '▼' };
    }
    return { product: p, latest, delta };
  });

  const historyRows = [...snapshots].reverse();

  return (
    <div className="wrap">
      <div className="masthead">
        <div className="masthead-left">
          <div className="eyebrow">Est. M6270 · Basin City, WA</div>
          <h1>Royal Pack — Inventory</h1>
          <div className="masthead-sub">
            {loading ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'} tracked · ${snapshots.length} readings logged`}
          </div>
        </div>
        <div className="header-actions">
          <Link href="/" className="logout-btn" style={{ textDecoration: 'none' }}>← Ledger</Link>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
          <button className="add-week-btn" onClick={openModal}>+ Log Reading</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading inventory…</div>
      ) : products.length === 0 ? (
        <div className="loading-state">No inventory logged yet. Click "+ Log Reading" to add the first one.</div>
      ) : (
        <>
          <div className="ledger-head">
            <h2>On Hand</h2>
            <span className="ledger-count">as of latest reading</span>
          </div>
          <div className="hero-grid" style={{ gridTemplateColumns: `repeat(${Math.min(products.length, 6)}, 1fr)`, marginBottom: '32px' }}>
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

          <div className="panel">
            <div className="tab-row">
              {products.map((p) => (
                <button key={p} className={`tab-btn ${activeProduct === p ? 'active' : ''}`} onClick={() => setActiveProduct(p)}>
                  {p}
                </button>
              ))}
            </div>
            <div className="chart-area">
              <canvas ref={canvasRef}></canvas>
            </div>
          </div>

          <div className="ledger-head">
            <h2>Reading History</h2>
            <span className="ledger-count">{snapshots.length} readings</span>
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

          <div className="footnote">Switch tabs above to see the trend for a specific product</div>
        </>
      )}

      {modalOpen && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h3>Log Reading</h3>
            <div className="modal-sub">Enter the current on-hand amount for a product. New product names create a new tracked item automatically.</div>
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
                    {products.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
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
