'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

function fmtMoney(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const neg = v < 0;
  const s = Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return (neg ? '-$' : '$') + s;
}
function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return (v * 100).toFixed(1) + '%';
}
function fmtNum(v, d = 0) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: d });
}

function hotToBox(w) {
  if (w.liveToBoxYield == null || w.liveHotYield == null || w.liveHotYield === 0) return null;
  return w.liveToBoxYield / w.liveHotYield;
}

const emptyForm = {
  week: '', sales: '', cattlePurchase: '', laborCost: '', supplyCost: '',
  gradedCattle: '', hospitalCows: '', employees: '', boxWeight: '',
  regHours: '', otHours: '', liveHotYield: '', fabBoxYield: '', liveToBoxYield: '',
  editPassword: '',
};

export default function DashboardPage() {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('financials');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/weeks')
      .then((r) => r.json())
      .then((data) => {
        setWeeks(data.weeks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && weeks.length > 0) {
      buildChart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, activeTab, loading]);

  function buildChart() {
    const ctx = canvasRef.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();
    const labels = weeks.map((w) => w.week);
    const gridColor = 'rgba(255,255,255,0.06)';
    const tickColor = '#98A0A5';

    let datasets = [];
    let scales = {
      x: { ticks: { color: tickColor, font: { family: 'IBM Plex Mono', size: 10 }, maxRotation: 60, minRotation: 40 }, grid: { color: gridColor } },
    };

    if (activeTab === 'financials') {
      datasets = [
        { type: 'bar', label: 'Profit / Loss', data: weeks.map((w) => w.profit),
          backgroundColor: weeks.map((w) => (w.profit >= 0 ? 'rgba(138,171,126,0.55)' : 'rgba(192,106,74,0.55)')),
          yAxisID: 'y1', order: 2, borderRadius: 2 },
        { type: 'line', label: 'Total Sales', data: weeks.map((w) => w.sales), borderColor: '#D4AF37', backgroundColor: 'transparent',
          yAxisID: 'y0', tension: 0.25, pointRadius: 2, order: 1, borderWidth: 2 },
        { type: 'line', label: 'Cattle Purchase', data: weeks.map((w) => w.cattlePurchase), borderColor: '#B08D57', backgroundColor: 'transparent',
          yAxisID: 'y0', tension: 0.25, pointRadius: 2, order: 1, borderWidth: 2, borderDash: [4, 3] },
        { type: 'line', label: 'Break-even ($0)', data: weeks.map(() => 0), borderColor: '#F2EFE6', backgroundColor: 'transparent',
          yAxisID: 'y1', pointRadius: 0, order: 3, borderWidth: 2.5 },
      ];
      scales.y0 = { position: 'left', ticks: { color: tickColor, callback: (v) => '$' + Number((v / 1000).toFixed(1)) + 'k' }, grid: { color: gridColor },
        title: { display: true, text: 'Sales / Purchase ($)', color: tickColor, font: { family: 'IBM Plex Mono', size: 10 } } };
      scales.y1 = { position: 'right', ticks: { color: tickColor, callback: (v) => '$' + Number((v / 1000).toFixed(1)) + 'k' }, grid: { display: false },
        title: { display: true, text: 'Profit / Loss ($)', color: tickColor, font: { family: 'IBM Plex Mono', size: 10 } } };
    } else if (activeTab === 'yield') {
      datasets = [
        { type: 'line', label: 'Live→Hot Yield', data: weeks.map((w) => (w.liveHotYield != null ? w.liveHotYield * 100 : null)), borderColor: '#D4AF37', backgroundColor: 'transparent', tension: 0.25, pointRadius: 2, borderWidth: 2, yAxisID: 'y0' },
        { type: 'line', label: 'Fab→Box Yield', data: weeks.map((w) => (w.fabBoxYield != null ? w.fabBoxYield * 100 : null)), borderColor: '#7EB6D9', backgroundColor: 'transparent', tension: 0.25, pointRadius: 2, borderWidth: 2, yAxisID: 'y0' },
        { type: 'line', label: 'Live→Box Yield', data: weeks.map((w) => (w.liveToBoxYield != null ? w.liveToBoxYield * 100 : null)), borderColor: '#8AAB7E', backgroundColor: 'transparent', tension: 0.25, pointRadius: 2, borderWidth: 2, yAxisID: 'y0' },
      ];
      scales.y0 = { position: 'left', ticks: { color: tickColor, callback: (v) => Number(v.toFixed(2)) + '%' }, grid: { color: gridColor },
        title: { display: true, text: 'Yield %', color: tickColor, font: { family: 'IBM Plex Mono', size: 10 } } };
    } else if (activeTab === 'labor') {
      datasets = [
        { type: 'bar', label: 'Regular Hours', data: weeks.map((w) => w.regHours), backgroundColor: 'rgba(212,175,55,0.45)', stack: 'hrs', yAxisID: 'y0', borderRadius: 1 },
        { type: 'bar', label: 'Overtime Hours', data: weeks.map((w) => w.otHours), backgroundColor: 'rgba(110,104,96,0.55)', stack: 'hrs', yAxisID: 'y0', borderRadius: 1 },
        { type: 'line', label: 'Target (1500 hrs)', data: weeks.map(() => 1500), borderColor: '#C06A4A', borderDash: [5, 4], pointRadius: 0, yAxisID: 'y0', borderWidth: 1.5 },
        { type: 'line', label: 'Labor % of Box Weight', data: weeks.map((w) => (w.laborPctBoxWeight != null ? w.laborPctBoxWeight * 100 : null)), borderColor: '#3FA9F5', backgroundColor: 'transparent', pointBackgroundColor: '#3FA9F5', tension: 0.25, pointRadius: 2, borderWidth: 3, yAxisID: 'y1' },
        { type: 'line', label: 'Employees', data: weeks.map((w) => w.employees), borderColor: '#FFFFFF', backgroundColor: 'transparent', pointBackgroundColor: '#FFFFFF', tension: 0.25, pointRadius: 2, borderWidth: 3, yAxisID: 'y2' },
      ];
      scales.y0 = { position: 'left', stacked: true, ticks: { color: tickColor }, grid: { color: gridColor },
        title: { display: true, text: 'Hours', color: tickColor, font: { family: 'IBM Plex Mono', size: 10 } } };
      scales.y1 = { position: 'right', ticks: { color: tickColor, callback: (v) => Number(v.toFixed(2)) + '%' }, grid: { display: false },
        title: { display: true, text: 'Labor % of Box Wt', color: tickColor, font: { family: 'IBM Plex Mono', size: 10 } } };
      scales.y2 = { display: false };
    }

    chartRef.current = new Chart(ctx, {
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#F2EFE6', font: { family: 'Inter', size: 11 } } },
          tooltip: { titleFont: { family: 'IBM Plex Mono' }, bodyFont: { family: 'IBM Plex Mono' } },
        },
        scales,
      },
    });
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.week.trim()) {
      setFormError('Week label is required.');
      return;
    }
    setSaving(true);
    try {
      const isEdit = editingId !== null;
      const res = await fetch(isEdit ? `/api/weeks/${editingId}` : '/api/weeks', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Could not save this week.');
        setSaving(false);
        return;
      }
      if (isEdit) {
        setWeeks((prevWeeks) => prevWeeks.map((w) => (w.id === editingId ? data.week : w)));
      } else {
        setWeeks((prevWeeks) => [...prevWeeks, data.week]);
      }
      setForm(emptyForm);
      setEditingId(null);
      setModalOpen(false);
    } catch (err) {
      setFormError('Something went wrong. Try again.');
    }
    setSaving(false);
  }

  function openAddModal() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(w) {
    setForm({
      week: w.week || '',
      sales: w.sales ?? '',
      cattlePurchase: w.cattlePurchase ?? '',
      laborCost: w.laborCost ?? '',
      supplyCost: w.supplyCost ?? '',
      gradedCattle: w.gradedCattle ?? '',
      hospitalCows: w.hospitalCows ?? '',
      employees: w.employees ?? '',
      boxWeight: w.boxWeight ?? '',
      regHours: w.regHours ?? '',
      otHours: w.otHours ?? '',
      liveHotYield: w.liveHotYield != null ? +(w.liveHotYield * 100).toFixed(2) : '',
      fabBoxYield: w.fabBoxYield != null ? +(w.fabBoxYield * 100).toFixed(2) : '',
      liveToBoxYield: w.liveToBoxYield != null ? +(w.liveToBoxYield * 100).toFixed(2) : '',
      editPassword: '',
    });
    setEditingId(w.id);
    setFormError('');
    setModalOpen(true);
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const latest = weeks[weeks.length - 1];
  const prev = weeks.length > 1 ? weeks[weeks.length - 2] : null;

  function sumField(key) {
    return weeks.reduce((acc, w) => acc + (w[key] || 0), 0);
  }
  const ytd = {
    totalSales: sumField('sales'),
    totalCattlePurchase: sumField('cattlePurchase'),
    totalLaborSupply: sumField('laborCost') + sumField('supplyCost'),
    totalProfit: sumField('profit'),
    avgYield: (() => {
      const vals = weeks.map((w) => hotToBox(w)).filter((v) => v !== null && v !== undefined && !isNaN(v));
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    })(),
    totalHours: sumField('regHours') + sumField('otHours'),
  };

  function delta(raw, prevRaw, invert = false) {
    if (raw === null || raw === undefined || isNaN(raw) || prevRaw === null || prevRaw === undefined || isNaN(prevRaw) || prevRaw === 0) {
      return null;
    }
    const diff = raw - prevRaw;
    const pctDiff = (diff / Math.abs(prevRaw)) * 100;
    let good = diff >= 0;
    if (invert) good = !good;
    const arrow = diff >= 0 ? '▲' : '▼';
    return { good, text: `${arrow} ${Math.abs(pctDiff).toFixed(1)}% vs prior wk` };
  }

  return (
    <div className="wrap">
      <div className="masthead">
        <div className="masthead-left">
          <div className="eyebrow">Est. M6270 · Basin City, WA</div>
          <h1>Royal Pack — Weekly Ledger</h1>
          <div className="masthead-sub">
            {loading ? 'Loading weeks…' : `${weeks.length} weeks tracked${latest ? ` · latest: ${latest.week}` : ''}`}
          </div>
        </div>
        <div className="header-actions">
          <Link href="/inventory" className="logout-btn" style={{ textDecoration: 'none' }}>Inventory →</Link>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
          <button className="add-week-btn" onClick={openAddModal}>+ Add Week</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading the ledger…</div>
      ) : (
        <>
          <div className="hero-grid">
            {latest && (
              <>
                <HeroCard label="Profit / Loss" value={fmtMoney(latest.profit)}
                  cls={latest.profit >= 0 ? 'pos' : 'neg'}
                  d={delta(latest.profit, prev?.profit)} />
                <HeroCard label="Total Weekly Sales" value={fmtMoney(latest.sales)}
                  d={delta(latest.sales, prev?.sales)} />
                <HeroCard label="Cattle Purchase $" value={fmtMoney(latest.cattlePurchase)}
                  d={delta(latest.cattlePurchase, prev?.cattlePurchase, true)} />
                <HeroCard label="Hot→Box Yield" value={fmtPct(hotToBox(latest))}
                  d={delta(hotToBox(latest), prev ? hotToBox(prev) : null)} />
                <HeroCard label="Total Hours (Tgt 1500)"
                  value={fmtNum((latest.regHours || 0) + (latest.otHours || 0))}
                  cls={(latest.regHours || 0) + (latest.otHours || 0) > 1500 ? 'neg' : 'pos'}
                  d={delta((latest.regHours || 0) + (latest.otHours || 0), prev ? (prev.regHours || 0) + (prev.otHours || 0) : null, true)} />
                <HeroCard label="Employees" value={fmtNum(latest.employees)}
                  d={delta(latest.employees, prev?.employees)} />
              </>
            )}
          </div>

          <div className="ledger-head">
            <h2>Year to Date</h2>
            <span className="ledger-count">{weeks.length} weeks</span>
          </div>
          <div className="hero-grid" style={{ marginBottom: '32px' }}>
            <HeroCard label="Total Sales" value={fmtMoney(ytd.totalSales)} />
            <HeroCard label="Total Cattle Purchase" value={fmtMoney(ytd.totalCattlePurchase)} />
            <HeroCard label="Total Labor + Supply" value={fmtMoney(ytd.totalLaborSupply)} />
            <HeroCard label="Total Profit / Loss" value={fmtMoney(ytd.totalProfit)} cls={ytd.totalProfit >= 0 ? 'pos' : 'neg'} />
            <HeroCard label="Avg Hot→Box Yield" value={fmtPct(ytd.avgYield)} />
            <HeroCard label="Total Hours" value={fmtNum(ytd.totalHours)} />
          </div>

          <div className="panel">
            <div className="tab-row">
              {[
                ['financials', 'Financials'],
                ['yield', 'Yield & Production'],
                ['labor', 'Labor'],
              ].map(([key, label]) => (
                <button key={key} className={`tab-btn ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="chart-area">
              <canvas ref={canvasRef}></canvas>
            </div>
          </div>

          <div className="ledger-head">
            <h2>Weekly Ledger</h2>
            <span className="ledger-count">{weeks.length} weeks</span>
          </div>
          <div className="ledger-scroll">
            <div className="ledger-row header-row">
              <span></span><span>Week</span><span>Sales</span><span>Cattle $</span><span>Profit/Loss</span><span>Yield</span><span>Hours</span>
            </div>
            {[...weeks].reverse().map((w) => {
              const totalHrs = (w.regHours || 0) + (w.otHours || 0);
              const isOpen = expandedId === w.id;
              return (
                <div key={w.id}>
                  <div className="ledger-row" onClick={() => setExpandedId(isOpen ? null : w.id)}>
                    <span className="tag-hole"></span>
                    <span className="tag-week">{w.week}</span>
                    <span className="cell-value">{fmtMoney(w.sales)}</span>
                    <span className="cell-value">{fmtMoney(w.cattlePurchase)}</span>
                    <span className={`cell-value ${w.profit >= 0 ? 'pos' : 'neg'}`}>{fmtMoney(w.profit)}</span>
                    <span className="cell-value">{fmtPct(hotToBox(w))}</span>
                    <span className={`cell-value ${totalHrs > 1500 ? 'neg' : ''}`}>{fmtNum(totalHrs)}</span>
                  </div>
                  <div className={`detail-row ${isOpen ? 'open' : ''}`}>
                    <DetailItem k="Graded Cattle" v={fmtNum(w.gradedCattle)} />
                    <DetailItem k="Hospital Cows" v={fmtNum(w.hospitalCows)} />
                    <DetailItem k="Employees" v={fmtNum(w.employees)} />
                    <DetailItem k="Box Weight" v={`${fmtNum(w.boxWeight)} lb`} />
                    <DetailItem k="Labor Cost" v={fmtMoney(w.laborCost)} />
                    <DetailItem k="Supply Cost" v={fmtMoney(w.supplyCost)} />
                    <DetailItem k="Live→Hot Yield" v={fmtPct(w.liveHotYield)} />
                    <DetailItem k="Fab→Box Yield" v={fmtPct(w.fabBoxYield)} />
                    <DetailItem k="Regular Hours" v={fmtNum(w.regHours, 1)} />
                    <DetailItem k="Overtime Hours" v={fmtNum(w.otHours, 1)} />
                    <DetailItem k="Labor % of Box Wt" v={fmtPct(w.laborPctBoxWeight)} />
                    <DetailItem k="Source" v={w.source === 'added' ? 'Added by you' : '2026 ledger'} />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ gridColumn: '1 / -1', justifySelf: 'start' }}
                      onClick={(e) => { e.stopPropagation(); openEditModal(w); }}
                    >
                      Edit this week
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="footnote">Tap a row for the full weekly breakdown · Shared across everyone with the link</div>
        </>
      )}

      {modalOpen && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h3>{editingId !== null ? 'Edit Week' : 'Add Week'}</h3>
            <div className="modal-sub">
              {editingId !== null
                ? 'Update any figures below — profit, total hours, and labor-per-box recalculate automatically.'
                : 'Enter raw weekly figures — profit, total hours, and labor-per-box are calculated for you.'}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <Field span2 label="Week label" placeholder="e.g. 7/27-7/31" value={form.week} onChange={(v) => updateField('week', v)} required />
                <Field label="Total weekly sales ($)" type="number" value={form.sales} onChange={(v) => updateField('sales', v)} />
                <Field label="Cattle purchase ($)" type="number" value={form.cattlePurchase} onChange={(v) => updateField('cattlePurchase', v)} />
                <Field label="Labor cost ($)" type="number" value={form.laborCost} onChange={(v) => updateField('laborCost', v)} />
                <Field label="Supply cost ($)" type="number" value={form.supplyCost} onChange={(v) => updateField('supplyCost', v)} />
                <Field label="Graded cattle (head)" type="number" value={form.gradedCattle} onChange={(v) => updateField('gradedCattle', v)} />
                <Field label="Hospital cows (head)" type="number" value={form.hospitalCows} onChange={(v) => updateField('hospitalCows', v)} />
                <Field label="Employees" type="number" value={form.employees} onChange={(v) => updateField('employees', v)} />
                <Field label="Box weight produced (lbs)" type="number" value={form.boxWeight} onChange={(v) => updateField('boxWeight', v)} />
                <Field label="Regular hours" type="number" value={form.regHours} onChange={(v) => updateField('regHours', v)} />
                <Field label="Overtime hours" type="number" value={form.otHours} onChange={(v) => updateField('otHours', v)} />
                <Field label="Live→hot yield (%)" type="number" value={form.liveHotYield} onChange={(v) => updateField('liveHotYield', v)} />
                <Field label="Fab→box yield (%)" type="number" value={form.fabBoxYield} onChange={(v) => updateField('fabBoxYield', v)} />
                <Field label="Live→box yield (%)" type="number" value={form.liveToBoxYield} onChange={(v) => updateField('liveToBoxYield', v)} />
              </div>
              <div className="form-note">Profit/loss = sales − cattle purchase − labor − supply. Total hours = regular + overtime, checked against the 1,500 hr/week target.</div>
              <div className="field" style={{ marginTop: '16px' }}>
                <label htmlFor="editPassword">Edit password</label>
                <input
                  type="password"
                  id="editPassword"
                  value={form.editPassword}
                  onChange={(e) => updateField('editPassword', e.target.value)}
                  required
                />
              </div>
              {formError && <div className="form-error">{formError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editingId !== null ? 'Save changes' : 'Save week'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroCard({ label, value, cls = '', d }) {
  return (
    <div className="hero-card">
      <div className="hero-label">{label}</div>
      <div className={`hero-value ${cls}`}>{value}</div>
      {d && <div className={`hero-delta ${d.good ? 'pos' : 'neg'}`}>{d.text}</div>}
    </div>
  );
}

function DetailItem({ k, v }) {
  return (
    <div className="detail-item">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', span2 = false, placeholder, required }) {
  return (
    <div className={`field ${span2 ? 'span2' : ''}`}>
      <label>{label}</label>
      <input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
