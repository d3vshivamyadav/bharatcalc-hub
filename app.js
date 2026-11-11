/**
 * BharatCalc Hub v3.0 — UI Controller, Real-Time Validator & A4 Report Engine
 * ---------------------------------------------------------------------------
 * Financial calculations are decoupled into `calc-engine.js` (`window.BharatCalcEngine`).
 * Modules:
 *  1. Shared Formatting, Validation & UI Utilities
 *  2. Tab Navigation & Hash Router (All 6 Financial Calculators)
 *  3. Tool 1: Income Tax (Old vs New Regime, Tax Year 2026–27 / FY 2025–26 / FY 2024–25)
 *  4. Tool 2: GST & Invoice Calculator (GST 2.0 + Legacy Slabs, HSN/SAC Guidance)
 *  5. Tool 3: SIP & Mutual Fund Planner (Compounding, Step-Up, SVG Growth Chart, Donut)
 *  6. Tool 4: HRA & Rent Exemption (Rule 2A / Old Regime)
 *  7. Tool 5: FD & RD Maturity Calculator (Compounding & Sec 194A TDS Assumptions)
 *  8. Tool 6: NPS Tax Savings & Retirement Corpus (Sec 80CCD(1), (1B), (2))
 *  9. A4 Statement Engine (ISO A4 PDF via jsPDF + Zero-Dependency OOXML DOCX)
 */

(function () {
  'use strict';

  function getEngine() {
    if (!window.BharatCalcEngine) {
      throw new Error('BharatCalcEngine failed to load.');
    }
    return window.BharatCalcEngine;
  }

  /* ========================================================================
   * 1. SHARED FORMATTING, VALIDATION & UI UTILITIES
   * ====================================================================== */

  function formatINR(value) {
    const safe = Number.isFinite(value) ? Math.round(value) : 0;
    return '₹' + safe.toLocaleString('en-IN');
  }

  function formatINRDecimal(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return (
      '₹' +
      safe.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function syncSliderVisual(rangeEl) {
    if (!rangeEl) return;
    const min = parseFloat(rangeEl.min) || 0;
    const max = parseFloat(rangeEl.max) || 100;
    const val = Math.min(Math.max(parseFloat(rangeEl.value) || min, min), max);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    rangeEl.style.setProperty('--slider-pct', pct.toFixed(2) + '%');
  }

  function pulseHighlight(el) {
    if (!el) return;
    el.classList.remove('calc-flash');
    void el.offsetWidth;
    el.classList.add('calc-flash');
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('bharat-toast');
    const msgEl = document.getElementById('bharat-toast-msg');
    if (!toast || !msgEl) return;
    msgEl.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('flex');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('flex');
    }, 3000);
  }

  function wireAccordion(btnId, containerId, arrowId) {
    const btn = document.getElementById(btnId);
    const container = document.getElementById(containerId);
    const arrow = document.getElementById(arrowId);
    if (!btn || !container) return;

    btn.addEventListener('click', () => {
      const isHidden = container.classList.contains('hidden');
      container.classList.toggle('hidden', !isHidden);
      btn.setAttribute('aria-expanded', String(isHidden));
      if (arrow) {
        arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    });
  }

  function copyText(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(successMsg),
        () => fallbackCopy(text, successMsg)
      );
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMsg);
    } catch (_) {
      showToast('Unable to copy automatically — please copy manually.');
    }
    document.body.removeChild(ta);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Read and validate a DOM numeric input cleanly using `BharatCalcEngine.validateNumericInput`,
   * also catching native `badInput` when invalid characters are typed into `<input type="number">`.
   */
  function validateFieldEl(el, opts, showRequiredError = false) {
    const engine = getEngine();
    if (!el) return { valid: false, empty: true, value: 0, error: `${opts.fieldName} field missing.` };
    if (el.validity && el.validity.badInput) {
      return { valid: false, empty: false, value: 0, error: `${opts.fieldName} must be a valid number.` };
    }
    const raw = el.value;
    const res = engine.validateNumericInput(raw, {
      ...opts,
      required: showRequiredError ? Boolean(opts.required) : false,
    });
    return {
      ...res,
      missingRequired: Boolean(opts.required) && res.empty && !el.validity?.badInput,
    };
  }

  function renderAlertBox(boxId, msgId, messages) {
    const box = document.getElementById(boxId);
    const msgEl = document.getElementById(msgId);
    if (!box || !msgEl) return;
    if (!messages || messages.length === 0) {
      box.classList.add('hidden');
      msgEl.innerHTML = '';
      return;
    }
    box.classList.remove('hidden');
    msgEl.innerHTML = messages.map((m) => `<p>${escapeHtml(m)}</p>`).join('');
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function updateSegmentedActive(selector, activeEl, activeCls, inactiveCls) {
    document.querySelectorAll(selector).forEach((btn) => {
      const match = btn === activeEl;
      btn.classList.remove(...(match ? inactiveCls : activeCls), 'active');
      btn.classList.add(...(match ? activeCls : inactiveCls));
      if (match) btn.classList.add('active');
    });
  }

  const BTN_PRIMARY_ACTIVE = ['bg-primary', 'text-on-primary', 'font-semibold', 'shadow-sm'];
  const BTN_NEUTRAL_INACTIVE = ['bg-surface-container', 'hover:bg-surface-container-high', 'text-on-surface'];

  /* ========================================================================
   * 2. TAB NAVIGATION & GLOBAL HASH ROUTER (ALL 6 TOOLS)
   * ====================================================================== */

  const VALID_TABS = new Set([
    'income-tax',
    'gst-calculator',
    'sip-mutual-fund',
    'hra-rent-exemption',
    'fd-rd-returns',
    'nps-tax-savings',
  ]);

  function switchTab(tabPath) {
    const resolved = VALID_TABS.has(tabPath) ? tabPath : 'income-tax';
    const navLinks = document.querySelectorAll('#main-tool-nav .tool-nav-link');
    const panels = document.querySelectorAll('[data-tab-panel]');
    const activeClasses = ['bg-primary', 'text-on-primary', 'font-semibold', 'shadow-sm'];
    const inactiveClasses = ['text-on-surface-variant', 'hover:bg-surface-container', 'hover:text-on-surface'];

    navLinks.forEach((link) => {
      const isMatch = link.dataset.path === resolved;
      if (isMatch) {
        link.classList.remove(...inactiveClasses);
        link.classList.add(...activeClasses);
        link.setAttribute('aria-current', 'page');
        link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        link.classList.remove(...activeClasses);
        link.classList.add(...inactiveClasses);
        link.removeAttribute('aria-current');
      }
    });

    panels.forEach((panel) => {
      const shouldShow = panel.dataset.tabPanel === resolved;
      panel.classList.toggle('hidden', !shouldShow);
      panel.classList.toggle('flex', shouldShow);
    });
  }

  function initNavigation() {
    document.querySelectorAll('#main-tool-nav .tool-nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = link.dataset.path;
        if (history.replaceState) {
          history.replaceState(null, '', '#' + path);
        } else {
          window.location.hash = path;
        }
        switchTab(path);
      });
    });

    const footerLinks = [
      { id: 'footer-link-slabs', tab: 'income-tax', expandSlabs: true },
      { id: 'footer-link-gst', tab: 'gst-calculator', expandSlabs: false },
      { id: 'footer-link-sip', tab: 'sip-mutual-fund', expandSlabs: false },
      { id: 'footer-link-hra', tab: 'hra-rent-exemption', expandSlabs: false },
      { id: 'footer-link-fdrd', tab: 'fd-rd-returns', expandSlabs: false },
      { id: 'footer-link-nps', tab: 'nps-tax-savings', expandSlabs: false },
    ];
    footerLinks.forEach(({ id, tab, expandSlabs }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        if (history.replaceState) history.replaceState(null, '', '#' + tab);
        switchTab(tab);
        if (expandSlabs) {
          const tableBox = document.getElementById('slabs-table-container');
          const arrow = document.getElementById('accordion-arrow');
          if (tableBox && tableBox.classList.contains('hidden')) {
            tableBox.classList.remove('hidden');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && VALID_TABS.has(initialHash)) {
      switchTab(initialHash);
    }

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (h && VALID_TABS.has(h)) {
        switchTab(h);
      }
    });
  }

  /* ========================================================================
   * 3. TOOL 1: INCOME TAX (OLD VS NEW REGIME)
   * ====================================================================== */

  const taxState = {
    taxYear: '2026-27',
    ageGroup: 'below60', // 'below60' | 'senior' | 'super-senior'
    incomeSource: 'salaried', // 'salaried' | 'self-employed'
    residency: 'resident', // 'resident' | 'nri'
    sector: 'private', // 'private' | 'government'
    lastReportData: null,
  };

  function getActiveTaxConfig() {
    const engine = getEngine();
    return engine.TAX_YEAR_CONFIG[taxState.taxYear] || engine.TAX_YEAR_CONFIG['2026-27'];
  }

  function applyGlobalPeriodCopy() {
    const cfg = getActiveTaxConfig();
    setText('header-version-badge', cfg.versionBadge);
    const compBadgeText = document.querySelector('#header-compliance-badge span:last-child');
    if (compBadgeText) compBadgeText.textContent = `${cfg.shortLabel} Rates`;

    setText('tax-hero-badge', cfg.heroBadge);
    setText('tax-hero-title', cfg.heroTitle);
    setText('tax-hero-subtitle', cfg.heroSubtitle);
    setText('tax-ay-badge', `${cfg.label} (${cfg.subPeriodLabel})`);
    setText('slab-accordion-title', `Marginal Tax Slab Schedules & Deductions (${cfg.shortLabel})`);
    setText('footer-sync-label', cfg.footerSync);

    const stdInput = document.getElementById('ded-standard');
    const isSalaried = taxState.incomeSource !== 'self-employed';
    if (stdInput) {
      stdInput.placeholder = isSalaried
        ? `Auto (${formatINR(cfg.newStdDed)} / ${formatINR(cfg.oldStdDed)})`
        : 'Not Eligible (Non-Salaried)';
    }
    setText(
      'std-ded-note',
      isSalaried
        ? `${formatINR(cfg.newStdDed)} New Regime / ${formatINR(cfg.oldStdDed)} Old Regime (Salaried)`
        : '₹0 (Standard deduction applies only to salaried / pension income)'
    );

    const grossLabel = document.getElementById('income-gross-label');
    if (grossLabel) {
      grossLabel.textContent = isSalaried
        ? taxState.ageGroup === 'below60'
          ? 'Gross Annual Salary'
          : 'Gross Annual Pension / Income'
        : 'Gross Annual Business / Prof. Income';
    }
  }

  function update80DCapHint() {
    const isSelfSenior = taxState.ageGroup !== 'below60';
    const seniorParents = Boolean(document.getElementById('ded-80d-senior-parents')?.checked);
    const maxCap = (isSelfSenior ? 50000 : 25000) + (seniorParents ? 50000 : 25000);
    setText('ded-80d-cap-pill', `Max ${formatINR(maxCap)} (Old)`);
    setText(
      'ded-80d-note',
      `Self ${isSelfSenior ? '₹50k (60+)' : '₹25k (<60)'} + Parents ${seniorParents ? '₹50k (60+)' : '₹25k (<60)'}`
    );
  }

  function renderTaxEmptyState(bannerMsg) {
    taxState.lastReportData = null;
    setText('hero-max-advantage', '—');
    setText(
      'banner-recommendation-title',
      bannerMsg || 'Enter your annual income and click Calculate Tax to compare regimes.'
    );
    setText(
      'banner-recommendation-subtitle',
      'No default tax figures are pre-filled; select a preset salary or enter your own values above.'
    );
    setText('banner-benefit-spread', '—');

    ['new', 'old'].forEach((prefix) => {
      setText(`${prefix}-total-tax`, '—');
      setText(`${prefix}-taxable-income`, '—');
      setText(`${prefix}-prerebate-tax`, '—');
      setText(`${prefix}-rebate-amount`, '—');
      setText(`${prefix}-cess-amount`, '—');
      setText(`${prefix}-monthly-tax`, '—');
      setText(`${prefix}-effective-rate`, '—');
      setText(`${prefix}-monthly-inhand`, '—');
      setText(`${prefix}-efficiency-pct`, '—');
      const bar = document.getElementById(`${prefix}-efficiency-bar`);
      if (bar) bar.style.width = '0%';
      const surRow = document.getElementById(`${prefix}-surcharge-row`);
      const cgRow = document.getElementById(`${prefix}-cg-row`);
      if (surRow) {
        surRow.classList.add('hidden');
        surRow.classList.remove('flex');
      }
      if (cgRow) {
        cgRow.classList.add('hidden');
        cgRow.classList.remove('flex');
      }
    });
    setText('new-std-ded', '—');
    setText('old-deductions-claimed', '—');

    const newCard = document.getElementById('card-new-regime');
    const oldCard = document.getElementById('card-old-regime');
    if (newCard && oldCard) {
      newCard.classList.remove('shadow-lg', 'shadow-surface-variant/30');
      oldCard.classList.remove('shadow-lg', 'shadow-surface-variant/30');
      document.getElementById('new-card-topbar')?.classList.replace('bg-primary', 'bg-outline-variant');
      document.getElementById('old-card-topbar')?.classList.replace('bg-primary', 'bg-outline-variant');
      document.getElementById('new-card-glow')?.classList.add('hidden');
      document.getElementById('old-card-glow')?.classList.add('hidden');
      document.getElementById('new-recommended-badge')?.classList.add('hidden');
      document.getElementById('new-recommended-badge')?.classList.remove('flex');
      document.getElementById('old-recommended-badge')?.classList.add('hidden');
      document.getElementById('old-recommended-badge')?.classList.remove('flex');
      document.getElementById('new-alt-badge')?.classList.remove('hidden');
      document.getElementById('old-alt-badge')?.classList.remove('hidden');
    }

    const tbody = document.getElementById('new-slab-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-4 px-4 text-center text-on-surface-variant">Enter income details above and click Calculate Tax to view progressive slabs.</td></tr>`;
    }
    const oldList = document.getElementById('old-slab-breakdown-list');
    if (oldList) oldList.innerHTML = `<p class="text-on-surface-variant">Awaiting tax calculation.</p>`;
    const dedList = document.getElementById('deduction-impact-list');
    if (dedList) dedList.innerHTML = `<p class="text-on-surface-variant">Awaiting tax calculation.</p>`;
  }

  function renderSlabBreakdowns(result) {
    const tbody = document.getElementById('new-slab-tbody');
    if (tbody) {
      const nr = result.newRegime;
      let html = nr.rows
        .map((r) => {
          const active = r.taxableInSlab > 0;
          return `
            <tr class="${active ? 'bg-primary-fixed/10 font-medium text-on-surface' : 'text-on-surface-variant'}">
              <td class="py-2.5 px-4">${escapeHtml(r.label)}</td>
              <td class="py-2.5 px-4 font-semibold ${active ? 'text-primary' : ''}">${Math.round(r.rate * 100)}%</td>
              <td class="py-2.5 px-4 text-right">${formatINR(r.taxableInSlab)}</td>
              <td class="py-2.5 px-4 text-right font-semibold">${formatINR(r.taxInSlab)}</td>
            </tr>`;
        })
        .join('');

      if (nr.capitalGains.totalSpecialTax > 0) {
        html += `
          <tr class="bg-surface-container-low/60">
            <td class="py-2.5 px-4">Special-Rate Capital Gains (111A 20% / 112A 12.5% &gt; ₹1.25L)</td>
            <td class="py-2.5 px-4 font-semibold">Special</td>
            <td class="py-2.5 px-4 text-right">${formatINR(nr.capitalGains.taxableStcg + nr.capitalGains.taxableLtcg)}</td>
            <td class="py-2.5 px-4 text-right font-semibold">${formatINR(nr.capitalGains.totalSpecialTax)}</td>
          </tr>`;
      }
      if (nr.rebate87A > 0 || nr.marginalRelief > 0) {
        html += `
          <tr class="text-primary font-semibold">
            <td class="py-2 px-4" colspan="3">Less: Sec 87A / 156 Rebate (${formatINR(nr.rebate87A)}) &amp; Marginal Relief (${formatINR(nr.marginalRelief)})</td>
            <td class="py-2 px-4 text-right">- ${formatINR(nr.rebate87A + nr.marginalRelief)}</td>
          </tr>`;
      }
      if (nr.surcharge > 0) {
        html += `
          <tr>
            <td class="py-2 px-4" colspan="3">Add: Surcharge (after threshold marginal relief)</td>
            <td class="py-2 px-4 text-right font-semibold">${formatINR(nr.surcharge)}</td>
          </tr>`;
      }
      html += `
        <tr class="bg-surface-container-low font-bold text-on-surface">
          <td class="py-3 px-4 rounded-l-xl" colspan="3">Final New Regime Liability (Incl. 4% Cess ${formatINR(nr.cess)}, Sec 288B rounded)</td>
          <td class="py-3 px-4 text-right text-primary rounded-r-xl">${formatINR(nr.totalTax)}</td>
        </tr>`;
      tbody.innerHTML = html;
    }

    const oldList = document.getElementById('old-slab-breakdown-list');
    if (oldList) {
      const or = result.oldRegime;
      let html = or.rows
        .map((r) => {
          const active = r.taxableInSlab > 0;
          return `
            <div class="flex justify-between items-center py-1 border-b border-outline-variant/20 ${active ? 'text-on-surface font-medium' : 'text-on-surface-variant'}">
              <span>${escapeHtml(r.label)} (${Math.round(r.rate * 100)}%)</span>
              <span>${formatINR(r.taxInSlab)}</span>
            </div>`;
        })
        .join('');
      if (or.capitalGains.totalSpecialTax > 0) {
        html += `
          <div class="flex justify-between items-center py-1 border-b border-outline-variant/20 text-on-surface">
            <span>Capital Gains Tax (111A + 112A)</span>
            <span>${formatINR(or.capitalGains.totalSpecialTax)}</span>
          </div>`;
      }
      if (or.rebate87A > 0) {
        html += `
          <div class="flex justify-between items-center py-1 border-b border-outline-variant/20 text-primary font-medium">
            <span>Less: Sec 87A Rebate (&le; ₹5L Resident)</span>
            <span>- ${formatINR(or.rebate87A)}</span>
          </div>`;
      }
      if (or.surcharge > 0) {
        html += `
          <div class="flex justify-between items-center py-1 border-b border-outline-variant/20 text-tertiary">
            <span>Add: Surcharge (Net of Relief)</span>
            <span>${formatINR(or.surcharge)}</span>
          </div>`;
      }
      html += `
        <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
          <span>Add: 4% Health &amp; Education Cess</span>
          <span>${formatINR(or.cess)}</span>
        </div>
        <div class="flex justify-between items-center pt-1 font-bold text-on-surface">
          <span>Final Old Regime Payable (Sec 288B)</span>
          <span>${formatINR(or.totalTax)}</span>
        </div>`;
      oldList.innerHTML = html;
    }

    const dedList = document.getElementById('deduction-impact-list');
    if (dedList) {
      const d = result.oldRegime.deductions;
      dedList.innerHTML = `
        <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
          <span class="text-on-surface-variant">Standard Deduction (New / Old)</span>
          <span class="font-semibold">${formatINR(d.newStdDed)} / ${formatINR(d.oldStdDed)}</span>
        </div>
        <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
          <span class="text-on-surface-variant">Employer NPS 80CCD(2) (New / Old)</span>
          <span class="font-semibold">${formatINR(d.newEmployerNps)} / ${formatINR(d.oldEmployerNps)}</span>
        </div>
        <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
          <span class="text-on-surface-variant">Eligible Sec 80C (Old Cap ₹1.5L)</span>
          <span class="font-semibold">${formatINR(d.sec80C)}</span>
        </div>
        <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
          <span class="text-on-surface-variant">Eligible Sec 80D (Old Cap ${formatINR(d.sec80DMax)})</span>
          <span class="font-semibold">${formatINR(d.sec80D)}</span>
        </div>
        <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
          <span class="text-on-surface-variant">Sec 24(b) Home Loan Int. + 80CCD(1B) NPS</span>
          <span class="font-semibold">${formatINR(d.sec24b + d.nps80CCD1B)}</span>
        </div>
        <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
          <span class="text-on-surface-variant">HRA / LTA Exemptions (Old Regime)</span>
          <span class="font-semibold">${formatINR(d.hraExempt + d.ltaAndOther)}</span>
        </div>
        <div class="flex justify-between items-center pt-1 font-bold text-primary">
          <span>Tax Saved by Old Regime Deductions</span>
          <span>${formatINR(result.taxSavedByOldDeductions)}</span>
        </div>`;
    }
  }

  function recomputeTax({ showRequired = false, withPulse = false } = {}) {
    const engine = getEngine();
    applyGlobalPeriodCopy();
    update80DCapHint();

    const grossRes = validateFieldEl(document.getElementById('income-gross'), { fieldName: 'Gross Annual Income', required: true, min: 0 }, showRequired);
    const ded80cRes = validateFieldEl(document.getElementById('ded-80c'), { fieldName: 'Section 80C', min: 0 });
    const ded80dRes = validateFieldEl(document.getElementById('ded-80d'), { fieldName: 'Section 80D', min: 0 });
    const ded24bRes = validateFieldEl(document.getElementById('ded-24b'), { fieldName: 'Section 24(b) Interest', min: 0 });
    const dedOtherRes = validateFieldEl(document.getElementById('ded-other'), { fieldName: 'HRA / LTA Exemptions', min: 0 });
    const dedNps1bRes = validateFieldEl(document.getElementById('ded-nps-1b'), { fieldName: 'NPS 80CCD(1B)', min: 0 });
    const basicDaRes = validateFieldEl(document.getElementById('ded-basic-da'), { fieldName: 'Annual Basic + DA', min: 0 });
    const npsEmpRes = validateFieldEl(document.getElementById('ded-nps-emp'), { fieldName: 'Employer NPS 80CCD(2)', min: 0 });
    const stcgRes = validateFieldEl(document.getElementById('income-stcg'), { fieldName: 'STCG u/s 111A', min: 0 });
    const ltcgRes = validateFieldEl(document.getElementById('income-ltcg'), { fieldName: 'LTCG u/s 112A', min: 0 });

    const errors = [
      grossRes,
      ded80cRes,
      ded80dRes,
      ded24bRes,
      dedOtherRes,
      dedNps1bRes,
      basicDaRes,
      npsEmpRes,
      stcgRes,
      ltcgRes,
    ]
      .filter((r) => !r.valid)
      .map((r) => r.error);

    if (errors.length > 0) {
      renderAlertBox('tax-error-box', 'tax-error-msg', errors);
      renderAlertBox('tax-warning-box', 'tax-warning-msg', []);
      renderTaxEmptyState('Fix the validation error(s) highlighted above to calculate tax.');
      return null;
    }

    renderAlertBox('tax-error-box', 'tax-error-msg', []);

    if (grossRes.missingRequired) {
      renderAlertBox('tax-warning-box', 'tax-warning-msg', []);
      renderTaxEmptyState();
      return null;
    }

    const dedStandardEl = document.getElementById('ded-standard');
    const seniorParents = Boolean(document.getElementById('ded-80d-senior-parents')?.checked);

    const res = engine.compareTaxRegimes({
      taxYear: taxState.taxYear,
      incomeSource: taxState.incomeSource,
      ageGroup: taxState.ageGroup,
      residency: taxState.residency,
      sector: taxState.sector,
      seniorParents,
      grossNormalIncome: grossRes.value,
      basicPlusDa: basicDaRes.value,
      sec80C: ded80cRes.value,
      sec80D: ded80dRes.value,
      sec24b: ded24bRes.value,
      nps80CCD1B: dedNps1bRes.value,
      employerNps80CCD2: npsEmpRes.value,
      otherExemptions: dedOtherRes.value,
      stcg111A: stcgRes.value,
      ltcg112A: ltcgRes.value,
    });

    if (dedStandardEl) {
      dedStandardEl.value = String(res.newRegime.stdDed);
    }

    const used80CPct = Math.min(100, Math.round((res.oldRegime.deductions.sec80C / 150000) * 100));
    setText('ded-80c-note', `${used80CPct}% of ₹1,50,000 Old Regime cap utilized`);

    renderAlertBox('tax-warning-box', 'tax-warning-msg', res.warnings);

    const nr = res.newRegime;
    const or = res.oldRegime;

    // Recommendation Banner
    setText('hero-max-advantage', res.savings > 0 ? formatINR(res.savings) : '₹0');
    if (res.savings === 0) {
      setText('banner-recommendation-title', `Both New and Old Regimes result in identical tax (${formatINR(nr.totalTax)}).`);
      setText('banner-recommendation-subtitle', 'The New Tax Regime requires minimal paperwork with no investment lock-in.');
      setText('banner-benefit-spread', 'Neutral Parity');
    } else if (res.recommended === 'new') {
      setText('banner-recommendation-title', `You save ${formatINR(res.savings)} under the New Tax Regime!`);
      setText('banner-recommendation-subtitle', `Recommended (${nr.cfg.shortLabel}): Lower tax outflow without deduction lock-ins.`);
      const spreadPct = or.totalTax > 0 ? ((res.savings / or.totalTax) * 100).toFixed(2) : '100.00';
      setText('banner-benefit-spread', `${spreadPct}% Lower Burden`);
    } else {
      setText('banner-recommendation-title', `You save ${formatINR(res.savings)} under the Old Tax Regime!`);
      setText('banner-recommendation-subtitle', `Your eligible deductions (${formatINR(or.totalDeductions)}) outperform the New Regime slabs.`);
      const spreadPct = nr.totalTax > 0 ? ((res.savings / nr.totalTax) * 100).toFixed(2) : '100.00';
      setText('banner-benefit-spread', `${spreadPct}% Lower Burden`);
    }

    // Card Updates
    function populateRegimeCard(prefix, r) {
      setText(`${prefix}-total-tax`, formatINR(r.totalTax));
      setText(`${prefix}-taxable-income`, formatINR(r.totalTaxableIncome));
      setText(`${prefix}-prerebate-tax`, formatINR(r.normalRawTax));
      const totalRelief = r.rebate87A + r.marginalRelief;
      setText(
        `${prefix}-rebate-amount`,
        totalRelief > 0
          ? `${formatINR(totalRelief)}${r.marginalRelief > 0 ? ` (Incl. Relief ${formatINR(r.marginalRelief)})` : ''}`
          : '₹0'
      );
      setText(`${prefix}-cess-amount`, formatINR(r.cess));
      setText(`${prefix}-monthly-tax`, formatINR(r.monthlyTax));
      setText(`${prefix}-effective-rate`, `${r.effectiveRatePct.toFixed(2)}%`);
      setText(`${prefix}-monthly-inhand`, formatINR(r.monthlyTakeHome));
      setText(`${prefix}-efficiency-pct`, `${r.takeHomePct.toFixed(2)}%`);
      const bar = document.getElementById(`${prefix}-efficiency-bar`);
      if (bar) bar.style.width = `${r.takeHomePct.toFixed(2)}%`;

      const cgRow = document.getElementById(`${prefix}-cg-row`);
      if (cgRow) {
        if (r.capitalGains.totalSpecialTax > 0) {
          cgRow.classList.remove('hidden');
          cgRow.classList.add('flex');
          setText(`${prefix}-cg-tax`, formatINR(r.capitalGains.totalSpecialTax));
        } else {
          cgRow.classList.add('hidden');
          cgRow.classList.remove('flex');
        }
      }

      const surRow = document.getElementById(`${prefix}-surcharge-row`);
      if (surRow) {
        if (r.surcharge > 0) {
          surRow.classList.remove('hidden');
          surRow.classList.add('flex');
          setText(`${prefix}-surcharge-amount`, formatINR(r.surcharge));
        } else {
          surRow.classList.add('hidden');
          surRow.classList.remove('flex');
        }
      }
    }

    populateRegimeCard('new', nr);
    populateRegimeCard('old', or);

    setText('new-std-ded', formatINR(nr.totalDeductions));
    setText('old-deductions-claimed', formatINR(or.totalDeductions));

    // Visual winner highlight
    const newWins = res.recommended === 'new';
    const newCard = document.getElementById('card-new-regime');
    const oldCard = document.getElementById('card-old-regime');
    if (newCard && oldCard) {
      newCard.classList.toggle('shadow-lg', newWins);
      newCard.classList.toggle('shadow-surface-variant/30', newWins);
      newCard.classList.toggle('shadow-sm', !newWins);
      oldCard.classList.toggle('shadow-lg', !newWins);
      oldCard.classList.toggle('shadow-surface-variant/30', !newWins);
      oldCard.classList.toggle('shadow-sm', newWins);

      document.getElementById('new-card-topbar')?.classList.toggle('bg-primary', newWins);
      document.getElementById('new-card-topbar')?.classList.toggle('bg-outline-variant', !newWins);
      document.getElementById('old-card-topbar')?.classList.toggle('bg-primary', !newWins);
      document.getElementById('old-card-topbar')?.classList.toggle('bg-outline-variant', newWins);

      document.getElementById('new-card-glow')?.classList.toggle('hidden', !newWins);
      document.getElementById('old-card-glow')?.classList.toggle('hidden', newWins);

      document.getElementById('new-recommended-badge')?.classList.toggle('hidden', !newWins);
      document.getElementById('new-recommended-badge')?.classList.toggle('flex', newWins);
      document.getElementById('new-alt-badge')?.classList.toggle('hidden', newWins);

      document.getElementById('old-recommended-badge')?.classList.toggle('hidden', newWins);
      document.getElementById('old-recommended-badge')?.classList.toggle('flex', !newWins);
      document.getElementById('old-alt-badge')?.classList.toggle('hidden', !newWins);
    }

    renderSlabBreakdowns(res);

    // Build A4 PDF / DOCX Statement Data
    const d = or.deductions;
    taxState.lastReportData = {
      filenameBase: `BharatCalc-IncomeTax-${taxState.taxYear}`,
      title: `Income Tax Computation Report (${nr.cfg.label})`,
      subtitle: `${taxState.residency.toUpperCase()} | ${taxState.incomeSource === 'salaried' ? 'Salaried / Pensioner' : 'Self-Employed / Business'
        } | ${taxState.ageGroup === 'below60' ? 'Below 60 Yrs' : taxState.ageGroup === 'senior' ? 'Senior (60–79 Yrs)' : 'Super Senior (80+ Yrs)'} | Recommended: ${res.recommended === 'new' ? 'New Tax Regime' : 'Old Tax Regime'
        }`,
      periodLabel: `${nr.cfg.label} (${nr.cfg.subPeriodLabel})`,
      kpis: [
        { label: 'Gross Total Income', value: formatINR(res.grossTotalIncome), sub: `Normal: ${formatINR(d.grossNormalIncome)}` },
        { label: 'New Regime Tax', value: formatINR(nr.totalTax), sub: `${nr.effectiveRatePct.toFixed(2)}% Eff.`, highlight: res.recommended === 'new' },
        { label: 'Old Regime Tax', value: formatINR(or.totalTax), sub: `${or.effectiveRatePct.toFixed(2)}% Eff.`, highlight: res.recommended === 'old' },
        { label: 'Regime Savings', value: formatINR(res.savings), sub: res.recommended === 'new' ? 'Favoring New Regime' : 'Favoring Old Regime', highlight: true },
      ],
      sections: [
        {
          heading: '1. User Inputs & Taxpayer Profile',
          head: ['Parameter / Income / Deduction Input', 'Entered / Selected Value', 'Notes / Statutory Basis'],
          colAlign: ['left', 'right', 'left'],
          rows: [
            ['Tax Year & Residency', `${nr.cfg.shortLabel} — ${taxState.residency === 'resident' ? 'Resident (India)' : 'Non-Resident (NRI)'}`, nr.cfg.subPeriodLabel],
            ['Gross Normal Income (Salary / Business)', formatINR(grossRes.value), taxState.incomeSource === 'salaried' ? 'Eligible for Std. Deduction' : 'No Std. Deduction'],
            ['Capital Gains (Sec 111A STCG / Sec 112A LTCG)', `${formatINR(stcgRes.value)} / ${formatINR(ltcgRes.value)}`, 'Excluded from Sec 87A rebate'],
            ['Section 80C Claimed (Eligible Old)', `${formatINR(ded80cRes.value)} (${formatINR(d.sec80C)})`, 'Old Regime cap ₹1,50,000'],
            ['Section 80D Health Cover (Eligible Old)', `${formatINR(ded80dRes.value)} (${formatINR(d.sec80D)})`, `Cap ${formatINR(d.sec80DMax)}`],
            ['Sec 24(b) Home Loan Interest / HRA & LTA', `${formatINR(d.sec24b)} / ${formatINR(d.ltaAndOther)}`, 'Old Regime Only'],
            ['Employee NPS 80CCD(1B) / Employer 80CCD(2)', `${formatINR(d.nps80CCD1B)} / ${formatINR(nr.employerNps)}`, '80CCD(2) in BOTH regimes'],
          ],
        },
        {
          heading: '2. Old vs New Tax Regime Liability Comparison',
          head: ['Computation Component', 'New Regime (Sec 202 / 115BAC)', 'Old Regime (Optional)'],
          colAlign: ['left', 'right', 'right'],
          boldLastRow: true,
          rows: [
            ['Gross Total Income', formatINR(res.grossTotalIncome), formatINR(res.grossTotalIncome)],
            ['Standard & Employer NPS 80CCD(2) Deductions', formatINR(nr.totalDeductions), formatINR(or.stdDed + or.employerNps)],
            ['Chapter VI-A & Exempt Allowances (80C, 80D, 24b, HRA)', '₹0 (N/A)', formatINR(or.totalDeductions - (or.stdDed + or.employerNps))],
            ['Net Total Taxable Income (Sec 288A Rounded)', formatINR(nr.totalTaxableIncome), formatINR(or.totalTaxableIncome)],
            ['Normal Slab Tax (Before Rebate)', formatINR(nr.normalRawTax), formatINR(or.normalRawTax)],
            ['Less: Sec 87A / 156 Rebate & Marginal Relief', `- ${formatINR(nr.rebate87A + nr.marginalRelief)}`, `- ${formatINR(or.rebate87A)}`],
            ['Add: Special-Rate Capital Gains Tax (111A / 112A)', formatINR(nr.capitalGains.totalSpecialTax), formatINR(or.capitalGains.totalSpecialTax)],
            ['Add: Surcharge (Net of Threshold Relief)', formatINR(nr.surcharge), formatINR(or.surcharge)],
            ['Add: 4% Health & Education Cess', formatINR(nr.cess), formatINR(or.cess)],
            ['Final Tax Liability (Sec 288B Rounded)', formatINR(nr.totalTax), formatINR(or.totalTax)],
            ['Estimated Monthly Tax / Take-Home', `${formatINR(nr.monthlyTax)} / ${formatINR(nr.monthlyTakeHome)}`, `${formatINR(or.monthlyTax)} / ${formatINR(or.monthlyTakeHome)}`],
          ],
        },
        {
          heading: `3. New Tax Regime Slab Breakdown (${nr.cfg.shortLabel})`,
          head: ['Income Slab', 'Rate', 'Taxable Income in Slab', 'Slab Tax'],
          colAlign: ['left', 'left', 'right', 'right'],
          rows: nr.rows.map((r) => [r.label, `${Math.round(r.rate * 100)}%`, formatINR(r.taxableInSlab), formatINR(r.taxInSlab)]),
        },
      ],
      disclaimer:
        'Statutory References: Income-tax Act, 2025 & Finance Act, 2026 (Sections 19, 156, 202, 288A, 288B equivalents) and CBDT notifications (incometax.gov.in / cbdt.gov.in). Disclaimer: Figures are informational planning estimates only and do not constitute formal Chartered Accountant or legal tax advice.',
    };

    if (withPulse) {
      pulseHighlight(document.getElementById('tax-outcome-banner'));
      pulseHighlight(document.getElementById('card-new-regime'));
      pulseHighlight(document.getElementById('card-old-regime'));
    }

    return res;
  }

  function initTaxCalculator() {
    applyGlobalPeriodCopy();
    renderTaxEmptyState();
    wireAccordion('toggle-slabs', 'slabs-table-container', 'accordion-arrow');

    const fySelect = document.getElementById('fy-period-select');
    if (fySelect) {
      fySelect.addEventListener('change', (e) => {
        taxState.taxYear = e.target.value;
        recomputeTax();
        showToast(`Switched Tax Schedule to ${getActiveTaxConfig().shortLabel}`);
      });
    }

    const catButtons = document.querySelectorAll('#taxpayer-category-selector .category-btn');
    catButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        updateSegmentedActive('#taxpayer-category-selector .category-btn', btn, BTN_PRIMARY_ACTIVE, BTN_NEUTRAL_INACTIVE);
        const cat = btn.dataset.category;
        const srcSelect = document.getElementById('tax-income-source');
        if (cat === 'salaried') {
          taxState.ageGroup = 'below60';
          taxState.incomeSource = 'salaried';
        } else if (cat === 'self-employed') {
          taxState.ageGroup = 'below60';
          taxState.incomeSource = 'self-employed';
        } else if (cat === 'senior') {
          taxState.ageGroup = 'senior';
        } else if (cat === 'super-senior') {
          taxState.ageGroup = 'super-senior';
        }
        if (srcSelect) srcSelect.value = taxState.incomeSource;
        recomputeTax();
      });
    });

    document.getElementById('tax-income-source')?.addEventListener('change', (e) => {
      taxState.incomeSource = e.target.value;
      recomputeTax();
    });
    document.getElementById('tax-residency')?.addEventListener('change', (e) => {
      taxState.residency = e.target.value;
      recomputeTax();
    });
    document.getElementById('tax-employer-sector')?.addEventListener('change', (e) => {
      taxState.sector = e.target.value;
      recomputeTax();
    });
    document.getElementById('ded-80d-senior-parents')?.addEventListener('change', () => recomputeTax());

    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const grossInput = document.getElementById('income-gross');
        if (grossInput) grossInput.value = btn.dataset.val;
        recomputeTax({ withPulse: true });
      });
    });

    // Itemized 80C drawer
    const toggleSplitBtn = document.getElementById('toggle-80c-split');
    const drawerSplit = document.getElementById('drawer-80c-split');
    if (toggleSplitBtn && drawerSplit) {
      toggleSplitBtn.addEventListener('click', () => {
        drawerSplit.classList.toggle('hidden');
      });
    }

    const splitInputs = document.querySelectorAll('.split-80c-input');
    splitInputs.forEach((inp) => {
      inp.addEventListener('input', () => {
        let sum = 0;
        splitInputs.forEach((s) => {
          const val = parseFloat(s.value);
          if (Number.isFinite(val) && val > 0) sum += val;
        });
        const eligible = Math.min(sum, 150000);
        setText('split-80c-total-pill', `Total: ${formatINR(sum)} (Eligible: ${formatINR(eligible)})`);
        const ded80c = document.getElementById('ded-80c');
        if (ded80c) ded80c.value = String(sum);
        recomputeTax();
      });
    });

    // Advanced NPS & CG drawer toggle
    document.getElementById('toggle-advanced-tax')?.addEventListener('click', () => {
      document.getElementById('drawer-advanced-tax')?.classList.toggle('hidden');
    });

    [
      'income-gross',
      'ded-80c',
      'ded-80d',
      'ded-24b',
      'ded-other',
      'ded-nps-1b',
      'ded-basic-da',
      'ded-nps-emp',
      'income-stcg',
      'income-ltcg',
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => recomputeTax());
    });

    document.getElementById('btn-calculate')?.addEventListener('click', () => {
      const res = recomputeTax({ showRequired: true, withPulse: true });
      if (res) {
        document.getElementById('tax-outcome-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      [
        'income-gross',
        'ded-standard',
        'ded-80c',
        'ded-80d',
        'ded-24b',
        'ded-other',
        'ded-nps-1b',
        'ded-basic-da',
        'ded-nps-emp',
        'income-stcg',
        'income-ltcg',
        'split-80c-epf',
        'split-80c-ppf',
        'split-80c-elss',
        'split-80c-lic',
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const spCheckbox = document.getElementById('ded-80d-senior-parents');
      if (spCheckbox) spCheckbox.checked = false;
      setText('split-80c-total-pill', 'Total: ₹0 (Eligible: ₹0)');
      setText('ded-80c-note', '0% of ₹1,50,000 Old Regime cap utilized');
      renderAlertBox('tax-error-box', 'tax-error-msg', []);
      renderAlertBox('tax-warning-box', 'tax-warning-msg', []);
      applyGlobalPeriodCopy();
      renderTaxEmptyState();
      showToast('Income Tax inputs cleared');
    });

    document.getElementById('btn-tax-pdf')?.addEventListener('click', () => exportReport('income-tax', 'pdf'));
    document.getElementById('btn-tax-docx')?.addEventListener('click', () => exportReport('income-tax', 'docx'));

    function buildSummaryCopy() {
      const res = recomputeTax({ showRequired: true });
      if (!res) return null;
      return `BharatCalc Hub Tax Estimate (${res.newRegime.cfg.shortLabel})
Gross Income: ${formatINR(res.grossTotalIncome)}
New Regime Tax: ${formatINR(res.newRegime.totalTax)} (Take-Home ${formatINR(res.newRegime.monthlyTakeHome)}/mo)
Old Regime Tax: ${formatINR(res.oldRegime.totalTax)} (Take-Home ${formatINR(res.oldRegime.monthlyTakeHome)}/mo)
Recommended: ${res.recommended === 'new' ? 'New Tax Regime' : 'Old Tax Regime'} (Saves ${formatINR(res.savings)})`;
    }

    document.getElementById('btn-tax-email')?.addEventListener('click', () => {
      const txt = buildSummaryCopy();
      if (!txt) {
        showToast('Enter gross income first to copy computation');
        return;
      }
      copyText(txt, 'Tax comparison copied to clipboard');
    });

    const caModal = document.getElementById('ca-modal');
    document.getElementById('btn-talk-ca')?.addEventListener('click', () => {
      const res = recomputeTax({ showRequired: true });
      if (!res) {
        showToast('Enter gross income first to open filing summary');
        return;
      }
      const sumBox = document.getElementById('ca-modal-summary');
      if (sumBox) {
        sumBox.innerHTML = `
          <div><strong>Tax Year:</strong> ${escapeHtml(res.newRegime.cfg.label)}</div>
          <div><strong>Gross Income:</strong> ${formatINR(res.grossTotalIncome)}</div>
          <div><strong>New Regime Tax:</strong> ${formatINR(res.newRegime.totalTax)} | <strong>Old Regime Tax:</strong> ${formatINR(res.oldRegime.totalTax)}</div>
          <div><strong>Optimal Regime:</strong> <span class="text-primary font-semibold">${res.recommended === 'new' ? 'New Regime' : 'Old Regime'} (Saves ${formatINR(res.savings)})</span></div>`;
      }
      caModal?.classList.remove('hidden');
      caModal?.classList.add('flex');
    });
    document.getElementById('close-ca-modal')?.addEventListener('click', () => {
      caModal?.classList.add('hidden');
      caModal?.classList.remove('flex');
    });
    caModal?.addEventListener('click', (e) => {
      if (e.target === caModal) {
        caModal.classList.add('hidden');
        caModal.classList.remove('flex');
      }
    });
    document.getElementById('modal-copy-btn')?.addEventListener('click', () => {
      const txt = buildSummaryCopy();
      if (txt) copyText(txt, 'Filing summary copied');
    });
    document.getElementById('modal-docx-btn')?.addEventListener('click', () => {
      caModal?.classList.add('hidden');
      caModal?.classList.remove('flex');
      exportReport('income-tax', 'docx');
    });
    document.getElementById('modal-print-btn')?.addEventListener('click', () => {
      caModal?.classList.add('hidden');
      caModal?.classList.remove('flex');
      exportReport('income-tax', 'pdf');
    });
  }

  /* ========================================================================
   * 4. TOOL 2: GST & INVOICE CALCULATOR (GST 2.0 + HISTORICAL + HSN/SAC)
   * ====================================================================== */

  const gstState = {
    mode: 'exclusive',
    rate: 18,
    supply: 'intra',
    hsnId: 'services-it',
    lastReportData: null,
  };

  function getSelectedGstCategory() {
    const engine = getEngine();
    return engine.GST_CATALOG.find((c) => c.id === gstState.hsnId) || engine.GST_CATALOG[0];
  }

  function updateGstHsnGuidance() {
    const cat = getSelectedGstCategory();
    setText('gst-hsn-code-badge', `${cat.hsnSac} • ${cat.categoryType}`);
    const noteEl = document.getElementById('gst-hsn-note');
    if (noteEl) {
      if (cat.rate !== gstState.rate) {
        noteEl.textContent = `Note: Selected slab (${gstState.rate}%) differs from ${cat.hsnSac} reference rate (${cat.rate}%). Verify applicability on cbic-gst.gov.in.`;
      } else {
        noteEl.textContent = cat.note;
      }
    }
  }

  function renderGstEmptyState(bannerMsg) {
    gstState.lastReportData = null;
    setText('gst-hero-tax', '—');
    setText('gst-banner-title', bannerMsg || 'Enter taxable value and click Calculate GST.');
    setText('gst-banner-subtitle', 'Select HSN/SAC category, supply type, and GST rate above.');
    setText('gst-banner-share', '—');
    setText('gst-gross-total', '—');
    setText('gst-units-suffix', '');
    setText('gst-net-base', '—');
    setText('gst-total-tax', '—');
    setText('gst-per-unit', '—');
    setText('gst-effective-share', '—');
    setText('gst-base-pct-label', '—');
    setText('gst-split-total', '—');
    setText('gst-cgst-val', '—');
    setText('gst-sgst-val', '—');
    setText('gst-igst-val', '—');
    setText('gst-split-pct-label', '—');

    const baseBar = document.getElementById('gst-base-bar');
    const taxBar = document.getElementById('gst-tax-bar');
    const cgstBar = document.getElementById('gst-cgst-bar');
    const sgstBar = document.getElementById('gst-sgst-bar');
    if (baseBar) baseBar.style.width = '0%';
    if (taxBar) taxBar.style.width = '0%';
    if (cgstBar) cgstBar.style.width = '0%';
    if (sgstBar) sgstBar.style.width = '0%';

    const tbody = document.getElementById('gst-matrix-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-4 px-4 text-center text-on-surface-variant">Enter invoice amount above to populate the GST multi-slab matrix.</td></tr>`;
    }
  }

  function recomputeGST({ showRequired = false, withPulse = false } = {}) {
    const engine = getEngine();
    updateGstHsnGuidance();

    const amtRes = validateFieldEl(document.getElementById('gst-amount'), { fieldName: 'Invoice Amount', required: true, min: 0 }, showRequired);
    const qtyRes = validateFieldEl(document.getElementById('gst-quantity'), { fieldName: 'Quantity', min: 1, max: 1000000, integer: true });

    const errors = [];
    if (!amtRes.valid) errors.push(amtRes.error);
    if (!qtyRes.valid) errors.push(qtyRes.error);

    if (errors.length > 0) {
      renderAlertBox('gst-error-box', 'gst-error-msg', errors);
      renderGstEmptyState('Fix the validation error(s) above to calculate GST.');
      return null;
    }

    renderAlertBox('gst-error-box', 'gst-error-msg', []);

    if (amtRes.missingRequired) {
      renderGstEmptyState();
      return null;
    }

    const quantity = qtyRes.empty ? 1 : qtyRes.value;
    const res = engine.calculateGST({
      unitAmount: amtRes.value,
      quantity,
      mode: gstState.mode,
      rate: gstState.rate,
      supply: gstState.supply,
    });

    setText('gst-hero-tax', formatINRDecimal(res.totalGst));
    setText('gst-mode-pill', res.mode === 'inclusive' ? 'Inclusive (Reverse)' : 'Exclusive');
    setText('gst-gross-total', formatINRDecimal(res.grossTotal));
    setText('gst-units-suffix', `(${res.quantity} ${res.quantity === 1 ? 'unit' : 'units'})`);
    setText('gst-net-base', formatINRDecimal(res.netBase));
    setText('gst-slab-label', `Total GST (@ ${res.rate}%)`);
    setText('gst-total-tax', formatINRDecimal(res.totalGst));
    setText('gst-per-unit', formatINRDecimal(res.perUnitGross));
    setText('gst-effective-share', `${res.taxSharePct.toFixed(2)}%`);
    setText('gst-base-pct-label', `${res.baseSharePct.toFixed(2)}% Base / ${res.taxSharePct.toFixed(2)}% GST`);

    const baseBar = document.getElementById('gst-base-bar');
    const taxBar = document.getElementById('gst-tax-bar');
    if (baseBar) baseBar.style.width = `${res.baseSharePct.toFixed(2)}%`;
    if (taxBar) taxBar.style.width = `${res.taxSharePct.toFixed(2)}%`;

    setText('gst-split-total', formatINRDecimal(res.totalGst));
    setText('gst-split-rate-tag', `@ ${res.rate}% Slab`);
    const halfRate = res.rate / 2;

    if (res.supply === 'intra') {
      setText('gst-split-badge', 'CGST + SGST');
      setText('gst-cgst-label', `Central GST (CGST @ ${halfRate}%)`);
      setText('gst-sgst-label', `State GST (SGST @ ${halfRate}%)`);
      setText('gst-igst-label', 'Integrated GST (IGST @ 0%)');
      setText('gst-cgst-val', formatINRDecimal(res.cgst));
      setText('gst-sgst-val', formatINRDecimal(res.sgst));
      setText('gst-igst-val', '₹0.00');
      setText('gst-supply-display', 'Intra-State Supply');
      setText('gst-split-pct-label', '50% CGST / 50% SGST');
      document.getElementById('gst-cgst-bar').style.width = '50%';
      document.getElementById('gst-sgst-bar').style.width = '50%';
      setText('gst-banner-subtitle', `Includes ${formatINRDecimal(res.totalGst)} GST (${formatINRDecimal(res.cgst)} CGST + ${formatINRDecimal(res.sgst)} SGST @ ${res.rate}%)`);
    } else {
      setText('gst-split-badge', 'IGST (Central)');
      setText('gst-cgst-label', 'Central GST (CGST @ 0%)');
      setText('gst-sgst-label', 'State GST (SGST @ 0%)');
      setText('gst-igst-label', `Integrated GST (IGST @ ${res.rate}%)`);
      setText('gst-cgst-val', '₹0.00');
      setText('gst-sgst-val', '₹0.00');
      setText('gst-igst-val', formatINRDecimal(res.igst));
      setText('gst-supply-display', 'Inter-State Supply');
      setText('gst-split-pct-label', '100% IGST');
      document.getElementById('gst-cgst-bar').style.width = '100%';
      document.getElementById('gst-sgst-bar').style.width = '0%';
      setText('gst-banner-subtitle', `Includes ${formatINRDecimal(res.totalGst)} IGST (@ ${res.rate}% on Inter-State Supply)`);
    }

    setText('gst-banner-title', `Gross Invoice Total: ${formatINRDecimal(res.grossTotal)}`);
    setText('gst-banner-share', `${res.taxSharePct.toFixed(2)}% of Invoice`);

    const cat = getSelectedGstCategory();
    const matrixRows = engine.GST_SLABS_ALL.map((r) => {
      const m = engine.calculateGST({
        unitAmount: amtRes.value,
        quantity,
        mode: res.mode,
        rate: r,
        supply: res.supply,
      });
      const isSelected = r === res.rate;
      const isLegacy = r === 12 || r === 28;
      return { r, m, isSelected, isLegacy };
    });

    const tbody = document.getElementById('gst-matrix-tbody');
    if (tbody) {
      tbody.innerHTML = matrixRows
        .map(
          ({ r, m, isSelected, isLegacy }) => `
        <tr class="${isSelected ? 'bg-primary-fixed/15 font-semibold text-on-surface' : 'text-on-surface-variant'}">
          <td class="py-2.5 px-4">${r}% ${isLegacy ? '(Legacy Ref)' : isSelected ? '(Selected)' : 'GST 2.0'}</td>
          <td class="py-2.5 px-4 text-right">${formatINRDecimal(m.netBase)}</td>
          <td class="py-2.5 px-4 text-right">${res.supply === 'intra' ? formatINRDecimal(m.cgst) : '₹0.00'}</td>
          <td class="py-2.5 px-4 text-right">${res.supply === 'intra' ? formatINRDecimal(m.sgst) : '₹0.00'}</td>
          <td class="py-2.5 px-4 text-right">${res.supply === 'inter' ? formatINRDecimal(m.igst) : '₹0.00'}</td>
          <td class="py-2.5 px-4 text-right text-primary">${formatINRDecimal(m.totalGst)}</td>
          <td class="py-2.5 px-4 text-right font-semibold">${formatINRDecimal(m.grossTotal)}</td>
        </tr>`
        )
        .join('');
    }

    gstState.lastReportData = {
      filenameBase: `BharatCalc-GST-Invoice-${res.rate}pct`,
      title: `GST & Tax Invoice Computation (${res.rate}% Slab)`,
      subtitle: `${res.mode === 'inclusive' ? 'Reverse GST Extraction (Inclusive)' : 'Forward GST Addition (Exclusive)'} | ${res.supply === 'intra' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'} | ${cat.hsnSac}`,
      periodLabel: `GST 2.0 Tariff Reference (${cat.categoryType})`,
      kpis: [
        { label: 'Net Base Value', value: formatINRDecimal(res.netBase), sub: `${res.quantity} unit(s)` },
        { label: `Total GST (${res.rate}%)`, value: formatINRDecimal(res.totalGst), sub: `${res.taxSharePct.toFixed(2)}% share`, highlight: true },
        { label: res.supply === 'intra' ? 'CGST + SGST Split' : 'IGST Component', value: res.supply === 'intra' ? `${formatINRDecimal(res.cgst)}` : formatINRDecimal(res.igst), sub: res.supply === 'intra' ? `50/50 each @ ${halfRate}%` : `100% Central IGST` },
        { label: 'Gross Invoice Total', value: formatINRDecimal(res.grossTotal), sub: `${formatINRDecimal(res.perUnitGross)} / unit`, highlight: true },
      ],
      sections: [
        {
          heading: '1. User Inputs & HSN / SAC Classification',
          head: ['Parameter', 'Value', 'Remarks'],
          colAlign: ['left', 'right', 'left'],
          rows: [
            ['Entered Amount', formatINRDecimal(amtRes.value), res.mode === 'inclusive' ? 'Tax-Inclusive Amount' : 'Taxable Base Value'],
            ['Quantity / Units', `${res.quantity}`, 'Line-item multiplier'],
            ['Selected Classification', cat.hsnSac, cat.label],
            ['Selected GST Slab', `${res.rate}%`, res.supply === 'intra' ? `CGST ${halfRate}% + SGST ${halfRate}%` : `IGST ${res.rate}%`],
          ],
        },
        {
          heading: '2. Multi-Slab Comparison Matrix (GST 2.0 & Legacy Reference)',
          head: ['GST Slab', 'Base Value', 'CGST', 'SGST', 'IGST', 'Total GST', 'Invoice Total'],
          colAlign: ['left', 'right', 'right', 'right', 'right', 'right', 'right'],
          rows: matrixRows.map(({ r, m, isSelected, isLegacy }) => [
            `${r}% ${isLegacy ? '(Legacy)' : isSelected ? '(Selected)' : ''}`,
            formatINRDecimal(m.netBase),
            res.supply === 'intra' ? formatINRDecimal(m.cgst) : '₹0.00',
            res.supply === 'intra' ? formatINRDecimal(m.sgst) : '₹0.00',
            res.supply === 'inter' ? formatINRDecimal(m.igst) : '₹0.00',
            formatINRDecimal(m.totalGst),
            formatINRDecimal(m.grossTotal),
          ]),
        },
      ],
      disclaimer:
        'Statutory Reference: 56th GST Council GST 2.0 core rate structure (0%, 3%, 5%, 18%, 40%) effective Sept 22, 2025, plus historical 12%/28% brackets for pre-reform verification (gst.gov.in / cbic-gst.gov.in). Always verify applicable HSN/SAC classification & cess notifications before filing GST returns.',
    };

    if (withPulse) {
      pulseHighlight(document.getElementById('gst-outcome-banner'));
    }

    return res;
  }

  function initGSTCalculator() {
    renderGstEmptyState();
    wireAccordion('toggle-gst-matrix', 'gst-matrix-container', 'gst-accordion-arrow');
    updateGstHsnGuidance();

    document.querySelectorAll('#gst-mode-selector .gst-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        updateSegmentedActive('#gst-mode-selector .gst-mode-btn', btn, BTN_PRIMARY_ACTIVE, BTN_NEUTRAL_INACTIVE);
        gstState.mode = btn.dataset.mode;
        setText(
          'gst-amount-label',
          gstState.mode === 'inclusive' ? 'Gross Inclusive Amount (With GST)' : 'Net Base Amount (Excl. GST)'
        );
        recomputeGST({ withPulse: true });
      });
    });

    document.querySelectorAll('#gst-supply-selector .gst-supply-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#gst-supply-selector .gst-supply-btn').forEach((b) => {
          const match = b === btn;
          b.classList.toggle('bg-surface-container-lowest', match);
          b.classList.toggle('text-primary', match);
          b.classList.toggle('font-semibold', match);
          b.classList.toggle('shadow-sm', match);
          b.classList.toggle('text-on-surface-variant', !match);
        });
        gstState.supply = btn.dataset.supply;
        setText(
          'gst-supply-hint',
          gstState.supply === 'intra'
            ? 'Intra-State splits GST 50/50 into CGST & SGST'
            : 'Inter-State bills full tax as Integrated GST (IGST)'
        );
        recomputeGST({ withPulse: true });
      });
    });

    function selectSlabButtonByRate(rate) {
      document.querySelectorAll('#gst-slab-selector .gst-slab-btn').forEach((b) => {
        const match = Number(b.dataset.rate) === rate;
        b.classList.toggle('active', match);
        b.classList.toggle('bg-primary', match);
        b.classList.toggle('text-on-primary', match);
        b.classList.toggle('shadow-md', match);
        b.classList.toggle('border-primary', match);
        b.classList.toggle('bg-surface-container-low', !match);
        b.classList.toggle('border-transparent', !match);
        const spans = b.querySelectorAll('span');
        if (spans[0]) {
          spans[0].classList.toggle('text-on-surface', !match);
        }
        if (spans[1]) {
          spans[1].classList.toggle('text-on-primary/85', match);
          spans[1].classList.toggle('text-on-surface-variant', !match);
        }
        if (match) {
          setText('gst-selected-slab-badge', b.dataset.desc || `${rate}% Slab`);
        }
      });
    }

    document.getElementById('gst-hsn-select')?.addEventListener('change', (e) => {
      gstState.hsnId = e.target.value;
      const cat = getSelectedGstCategory();
      gstState.rate = cat.rate;
      selectSlabButtonByRate(cat.rate);
      recomputeGST({ withPulse: true });
    });

    document.querySelectorAll('#gst-slab-selector .gst-slab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rate = Number(btn.dataset.rate);
        gstState.rate = rate;
        selectSlabButtonByRate(rate);
        recomputeGST({ withPulse: true });
      });
    });

    document.querySelectorAll('.gst-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const amtEl = document.getElementById('gst-amount');
        if (amtEl) amtEl.value = btn.dataset.val;
        recomputeGST({ withPulse: true });
      });
    });

    document.getElementById('gst-amount')?.addEventListener('input', () => recomputeGST());
    document.getElementById('gst-quantity')?.addEventListener('input', () => recomputeGST());

    document.getElementById('btn-gst-calculate')?.addEventListener('click', () => {
      recomputeGST({ showRequired: true, withPulse: true });
    });

    document.getElementById('btn-gst-reset')?.addEventListener('click', () => {
      const amtEl = document.getElementById('gst-amount');
      const qtyEl = document.getElementById('gst-quantity');
      if (amtEl) amtEl.value = '';
      if (qtyEl) qtyEl.value = '';
      renderAlertBox('gst-error-box', 'gst-error-msg', []);
      renderGstEmptyState();
      showToast('GST Calculator reset');
    });

    document.getElementById('btn-gst-copy')?.addEventListener('click', () => {
      const res = recomputeGST({ showRequired: true });
      if (!res) {
        showToast('Enter invoice amount first to copy breakdown');
        return;
      }
      const txt = `BharatCalc GST Summary (${res.rate}% ${res.mode})
Base Value: ${formatINRDecimal(res.netBase)}
${res.supply === 'intra' ? `CGST: ${formatINRDecimal(res.cgst)} | SGST: ${formatINRDecimal(res.sgst)}` : `IGST: ${formatINRDecimal(res.igst)}`}
Total GST: ${formatINRDecimal(res.totalGst)} | Invoice Total: ${formatINRDecimal(res.grossTotal)}`;
      copyText(txt, 'GST breakdown copied to clipboard');
    });

    document.getElementById('btn-gst-pdf')?.addEventListener('click', () => exportReport('gst-calculator', 'pdf'));
    document.getElementById('btn-gst-docx')?.addEventListener('click', () => exportReport('gst-calculator', 'docx'));
  }

  /* ========================================================================
   * 5. TOOL 3: SIP & MUTUAL FUND PLANNER (WITH YEAR-WISE GROWTH SVG CHART)
   * ====================================================================== */

  const sipState = {
    mode: 'sip',
    lastReportData: null,
  };

  function renderSipGrowthChart(schedule) {
    const svg = document.getElementById('sip-growth-chart-svg');
    if (!svg) return;

    if (!schedule || schedule.length === 0) {
      svg.innerHTML = `<text x="340" y="115" text-anchor="middle" fill="#6f7974" font-size="13" font-family="Inter, sans-serif">Calculate SIP / Lumpsum returns to render year-wise growth chart</text>`;
      return;
    }

    const W = 680;
    const H = 220;
    const padL = 62;
    const padR = 16;
    const padT = 18;
    const padB = 34;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxVal = Math.max(...schedule.map((s) => s.yearEndValue), 1);
    const barSlotW = chartW / schedule.length;
    const barW = Math.max(4, Math.min(26, barSlotW * 0.64));

    const gridSteps = 4;
    let svgContent = '';

    for (let i = 0; i <= gridSteps; i++) {
      const ratio = i / gridSteps;
      const y = padT + chartH - ratio * chartH;
      const val = maxVal * ratio;
      const label = val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${Math.round(val / 1000)}K`;
      svgContent += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-dasharray="3,3" stroke-width="1" />`;
      svgContent += `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#64748b" font-size="10" font-family="Inter, sans-serif">${label}</text>`;
    }

    const labelStep = schedule.length <= 12 ? 1 : schedule.length <= 24 ? 2 : 5;
    schedule.forEach((row, idx) => {
      const xCenter = padL + idx * barSlotW + barSlotW / 2;
      const x = xCenter - barW / 2;
      const totalH = (row.yearEndValue / maxVal) * chartH;
      const invH = (row.cumulativeInvested / maxVal) * chartH;
      const yTotal = padT + chartH - totalH;
      const yInv = padT + chartH - invH;

      svgContent += `<rect x="${x.toFixed(1)}" y="${yTotal.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, totalH).toFixed(1)}" rx="3" fill="#005d42" opacity="0.88"><title>Yr ${row.year}: Value ${formatINR(row.yearEndValue)} | Invested ${formatINR(row.cumulativeInvested)}</title></rect>`;
      svgContent += `<rect x="${x.toFixed(1)}" y="${yInv.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, invH).toFixed(1)}" rx="2" fill="#006398" />`;

      if (row.year === 1 || row.year === schedule.length || row.year % labelStep === 0) {
        svgContent += `<text x="${xCenter.toFixed(1)}" y="${H - 12}" text-anchor="middle" fill="#475569" font-size="10" font-family="Inter, sans-serif">Y${row.year}</text>`;
      }
    });

    svg.innerHTML = svgContent;
  }

  function renderSipEmptyState(bannerMsg) {
    sipState.lastReportData = null;
    setText('sip-hero-maturity', '—');
    setText('sip-banner-title', bannerMsg || 'Enter investment parameters and click Calculate Returns.');
    setText('sip-banner-subtitle', 'Choose Monthly SIP or Lumpsum mode above to begin.');
    setText('sip-banner-multiplier', '—');
    setText('sip-maturity-val', '—');
    setText('sip-years-suffix', '');
    setText('sip-invested-val', '—');
    setText('sip-returns-val', '—');
    setText('sip-return-pct', '—');
    setText('sip-tenure-display', '—');
    setText('sip-split-bar-label', '—');
    setText('sip-donut-pct', '—');
    setText('sip-legend-invested', '—');
    setText('sip-legend-returns', '—');
    setText('sip-real-value', '—');
    setText('sip-swp-monthly', '—');
    setText('sip-ltcg-est', '—');
    document.getElementById('sip-invested-bar').style.width = '0%';
    document.getElementById('sip-returns-bar').style.width = '0%';
    document.getElementById('sip-donut-invested')?.setAttribute('stroke-dasharray', '0 238.76');
    document.getElementById('sip-donut-returns')?.setAttribute('stroke-dasharray', '0 238.76');
    renderSipGrowthChart([]);

    const tbody = document.getElementById('sip-schedule-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-4 px-4 text-center text-on-surface-variant">Calculate SIP / Lumpsum returns to view yearly schedule.</td></tr>`;
    }
  }

  function recomputeSIP({ showRequired = false, withPulse = false } = {}) {
    const engine = getEngine();
    const amtEl = document.getElementById('sip-amount');
    const rateEl = document.getElementById('sip-rate');
    const yearsEl = document.getElementById('sip-years');
    const stepEl = document.getElementById('sip-stepup');

    const amtRes = validateFieldEl(amtEl, { fieldName: sipState.mode === 'sip' ? 'Monthly SIP Amount' : 'Lumpsum Investment', required: true, min: 100 }, showRequired);
    const rateRes = validateFieldEl(rateEl, { fieldName: 'Expected Annual Return', required: true, min: 0.5, max: 35 }, showRequired);
    const yearsRes = validateFieldEl(yearsEl, { fieldName: 'Investment Tenure (Years)', required: true, min: 1, max: 40, integer: true }, showRequired);
    const stepRes = validateFieldEl(stepEl, { fieldName: 'Annual Step-Up %', min: 0, max: 50 });

    const errors = [amtRes, rateRes, yearsRes, stepRes].filter((r) => !r.valid).map((r) => r.error);
    if (errors.length > 0) {
      renderAlertBox('sip-error-box', 'sip-error-msg', errors);
      renderSipEmptyState('Fix the validation error(s) above to calculate returns.');
      return null;
    }

    renderAlertBox('sip-error-box', 'sip-error-msg', []);

    if (amtRes.missingRequired || rateRes.missingRequired || yearsRes.missingRequired) {
      renderSipEmptyState();
      return null;
    }

    const res = engine.calculateSIP({
      mode: sipState.mode,
      amount: amtRes.value,
      ratePct: rateRes.value,
      years: yearsRes.value,
      stepUpPct: stepRes.value,
    });

    setText('sip-hero-maturity', formatINR(res.maturity));
    setText('sip-banner-title', `Estimated Wealth Gain: ${formatINR(res.returns)}`);
    setText('sip-banner-subtitle', `Your ${formatINR(res.invested)} total investment grows ${res.multiplier.toFixed(2)}x over ${res.years} years @ ${res.ratePct}% p.a.`);
    setText('sip-banner-multiplier', `${res.multiplier.toFixed(2)}x Corpus`);

    setText('sip-type-pill', res.mode === 'sip' ? (res.stepUpPct > 0 ? `Step-Up ${res.stepUpPct}%` : 'SIP Plan') : 'Lumpsum');
    setText('sip-maturity-val', formatINR(res.maturity));
    setText('sip-years-suffix', `in ${res.years} ${res.years === 1 ? 'yr' : 'yrs'}`);
    setText('sip-invested-val', formatINR(res.invested));
    setText('sip-returns-val', formatINR(res.returns));
    setText('sip-return-pct', `+${res.gainPct.toFixed(2)}%`);
    setText('sip-tenure-display', `${res.years * 12} Months (${res.years} Yrs)`);

    setText('sip-split-bar-label', `${res.investedSharePct.toFixed(1)}% Invested / ${res.returnsSharePct.toFixed(1)}% Gains`);
    document.getElementById('sip-invested-bar').style.width = `${res.investedSharePct.toFixed(2)}%`;
    document.getElementById('sip-returns-bar').style.width = `${res.returnsSharePct.toFixed(2)}%`;

    const circ = 238.76;
    const invArc = (res.investedSharePct / 100) * circ;
    const retArc = circ - invArc;
    document.getElementById('sip-donut-invested')?.setAttribute('stroke-dasharray', `${invArc.toFixed(2)} ${circ}`);
    document.getElementById('sip-donut-returns')?.setAttribute('stroke-dasharray', `${retArc.toFixed(2)} ${circ}`);
    document.getElementById('sip-donut-returns')?.setAttribute('stroke-dashoffset', `${(-invArc).toFixed(2)}`);

    setText('sip-donut-pct', `${res.returnsSharePct.toFixed(1)}%`);
    setText('sip-legend-invested', `${res.investedSharePct.toFixed(2)}%`);
    setText('sip-legend-returns', `${res.returnsSharePct.toFixed(2)}%`);
    setText('sip-real-value', formatINR(res.realValue));
    setText('sip-swp-monthly', `${formatINR(res.swpMonthly)} / mo`);
    setText('sip-ltcg-est', formatINR(res.estLtcg112A));

    renderSipGrowthChart(res.schedule);

    const tbody = document.getElementById('sip-schedule-tbody');
    if (tbody) {
      tbody.innerHTML = res.schedule
        .map(
          (row, idx) => `
          <tr class="${idx === res.schedule.length - 1 ? 'bg-primary-fixed/15 font-bold text-on-surface' : 'text-on-surface-variant'}">
            <td class="py-2.5 px-4">Year ${row.year}</td>
            <td class="py-2.5 px-4 text-right">${formatINR(row.annualDeposit)}</td>
            <td class="py-2.5 px-4 text-right">${formatINR(row.cumulativeInvested)}</td>
            <td class="py-2.5 px-4 text-right text-primary">${formatINR(row.totalReturns)}</td>
            <td class="py-2.5 px-4 text-right font-semibold">${formatINR(row.yearEndValue)}</td>
          </tr>`
        )
        .join('');
    }

    sipState.lastReportData = {
      filenameBase: `BharatCalc-SIP-${res.years}Yrs`,
      title: `Mutual Fund ${res.mode === 'sip' ? 'SIP' : 'Lumpsum'} Wealth Projection`,
      subtitle: `${res.mode === 'sip' ? `${formatINR(res.amount)} / month` : `One-time ${formatINR(res.amount)}`} | ${res.ratePct}% p.a. expected return | ${res.years} Years${res.stepUpPct > 0 ? ` (+${res.stepUpPct}% Step-Up)` : ''}`,
      periodLabel: 'Compounded Wealth Forecast',
      kpis: [
        { label: 'Total Invested', value: formatINR(res.invested), sub: `${res.years * 12} Months` },
        { label: 'Est. Wealth Gain', value: formatINR(res.returns), sub: `+${res.gainPct.toFixed(1)}% Return` },
        { label: 'Projected Maturity', value: formatINR(res.maturity), sub: `${res.multiplier.toFixed(2)}x Multiplier`, highlight: true },
        { label: 'Inflation-Adj. Value', value: formatINR(res.realValue), sub: 'At 6% p.a. CPI benchmark' },
      ],
      sections: [
        {
          heading: '1. User Inputs & Return Assumptions',
          head: ['Parameter', 'Value'],
          colAlign: ['left', 'right'],
          rows: [
            ['Investment Mode', res.mode === 'sip' ? 'Monthly SIP (Annuity Due)' : 'Lumpsum One-Time'],
            ['Installment / Principal Amount', formatINR(res.amount)],
            ['Expected Annual Return (CAGR)', `${res.ratePct}% p.a.`],
            ['Horizon / Annual Step-Up', `${res.years} Years / ${res.stepUpPct}% p.a.`],
            ['Estimated Equity LTCG (> ₹1.25L @ 12.5% Sec 112A)', formatINR(res.estLtcg112A)],
          ],
        },
        {
          heading: '2. Year-by-Year Wealth Compounding Schedule',
          head: ['Year', 'Annual Contribution', 'Cumulative Invested', 'Cumulative Gain', 'Year-End Value'],
          colAlign: ['left', 'right', 'right', 'right', 'right'],
          boldLastRow: true,
          rows: res.schedule.map((row) => [
            `Year ${row.year}`,
            formatINR(row.annualDeposit),
            formatINR(row.cumulativeInvested),
            formatINR(row.totalReturns),
            formatINR(row.yearEndValue),
          ]),
        },
      ],
      disclaimer:
        'Mutual fund investments are subject to market risks. Compounding figures use constant annual/monthly return assumptions for illustrative planning only; Sec 112A LTCG tax note assumes post-July 2024 12.5% rate above ₹1,25,000 annual exemption.',
    };

    if (withPulse) pulseHighlight(document.getElementById('sip-outcome-banner'));
    return res;
  }

  function initSIPCalculator() {
    renderSipEmptyState();
    wireAccordion('toggle-sip-schedule', 'sip-schedule-container', 'sip-accordion-arrow');

    const amtEl = document.getElementById('sip-amount');
    const amtRange = document.getElementById('sip-amount-range');
    const rateEl = document.getElementById('sip-rate');
    const rateRange = document.getElementById('sip-rate-range');
    const yearsEl = document.getElementById('sip-years');
    const yearsRange = document.getElementById('sip-years-range');
    const stepEl = document.getElementById('sip-stepup');

    syncSliderVisual(amtRange);
    syncSliderVisual(rateRange);
    syncSliderVisual(yearsRange);

    function linkRange(input, range) {
      if (!input || !range) return;
      input.addEventListener('input', () => {
        if (Number.isFinite(parseFloat(input.value))) {
          range.value = String(Math.min(Math.max(parseFloat(input.value), parseFloat(range.min)), parseFloat(range.max)));
          syncSliderVisual(range);
        }
        recomputeSIP();
      });
      range.addEventListener('input', () => {
        input.value = range.value;
        syncSliderVisual(range);
        recomputeSIP();
      });
    }
    linkRange(amtEl, amtRange);
    linkRange(rateEl, rateRange);
    linkRange(yearsEl, yearsRange);
    stepEl?.addEventListener('input', () => recomputeSIP());

    document.querySelectorAll('#sip-mode-selector .sip-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        updateSegmentedActive('#sip-mode-selector .sip-mode-btn', btn, BTN_PRIMARY_ACTIVE, BTN_NEUTRAL_INACTIVE);
        sipState.mode = btn.dataset.mode;
        const isLumpsum = sipState.mode === 'lumpsum';
        setText('sip-amount-label', isLumpsum ? 'One-Time Lumpsum Investment' : 'Monthly SIP Investment');
        setText('sip-mode-badge', isLumpsum ? 'Annual Compounding' : 'Monthly Compounding');
        if (amtRange) {
          amtRange.max = isLumpsum ? '5000000' : '200000';
          amtRange.step = isLumpsum ? '5000' : '500';
          syncSliderVisual(amtRange);
        }
        document.getElementById('sip-stepup-field')?.classList.toggle('opacity-50', isLumpsum);
        document.getElementById('sip-stepup-field')?.classList.toggle('pointer-events-none', isLumpsum);
        recomputeSIP({ withPulse: true });
      });
    });

    document.querySelectorAll('.sip-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (amtEl) amtEl.value = btn.dataset.val;
        if (amtRange) {
          amtRange.value = btn.dataset.val;
          syncSliderVisual(amtRange);
        }
        recomputeSIP({ withPulse: true });
      });
    });

    document.querySelectorAll('.sip-rate-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (rateEl) rateEl.value = btn.dataset.rate;
        if (rateRange) {
          rateRange.value = btn.dataset.rate;
          syncSliderVisual(rateRange);
        }
        recomputeSIP({ withPulse: true });
      });
    });

    document.querySelectorAll('.sip-tenure-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (yearsEl) yearsEl.value = btn.dataset.years;
        if (yearsRange) {
          yearsRange.value = btn.dataset.years;
          syncSliderVisual(yearsRange);
        }
        recomputeSIP({ withPulse: true });
      });
    });

    document.querySelectorAll('.sip-stepup-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (stepEl) stepEl.value = btn.dataset.stepup;
        recomputeSIP({ withPulse: true });
      });
    });

    document.getElementById('btn-sip-calculate')?.addEventListener('click', () => {
      recomputeSIP({ showRequired: true, withPulse: true });
    });

    document.getElementById('btn-sip-reset')?.addEventListener('click', () => {
      if (amtEl) amtEl.value = '';
      if (rateEl) rateEl.value = '';
      if (yearsEl) yearsEl.value = '';
      if (stepEl) stepEl.value = '';
      if (amtRange) {
        amtRange.value = amtRange.min;
        syncSliderVisual(amtRange);
      }
      if (rateRange) {
        rateRange.value = rateRange.min;
        syncSliderVisual(rateRange);
      }
      if (yearsRange) {
        yearsRange.value = yearsRange.min;
        syncSliderVisual(yearsRange);
      }
      renderAlertBox('sip-error-box', 'sip-error-msg', []);
      renderSipEmptyState();
      showToast('SIP Planner inputs cleared');
    });

    document.getElementById('btn-sip-pdf')?.addEventListener('click', () => exportReport('sip-mutual-fund', 'pdf'));
    document.getElementById('btn-sip-docx')?.addEventListener('click', () => exportReport('sip-mutual-fund', 'docx'));
  }

  /* ========================================================================
   * 6. TOOL 4: HRA & RENT EXEMPTION CALCULATOR (SEC 10(13A) / RULE 2A)
   * ====================================================================== */

  const hraState = {
    isMetro: true,
    lastReportData: null,
  };

  function renderHraEmptyState(bannerMsg) {
    hraState.lastReportData = null;
    setText('hra-hero-exempt', '—');
    setText('hra-banner-title', bannerMsg || 'Enter salary, HRA received, and rent paid to compute exemption.');
    setText('hra-banner-subtitle', 'Minimum of the three Rule 2A conditions qualifies as exempt HRA.');
    setText('hra-banner-pct', '—');
    setText('hra-exempt-amount', '—');
    setText('hra-taxable-amount', '—');
    setText('hra-newregime-taxable', '—');
    setText('hra-pan-status', '—');
    setText('hra-194ib-status', '—');
    setText('hra-cond1', '—');
    setText('hra-cond2', '—');
    setText('hra-cond3', '—');
    setText('hra-binding-rule', '—');
  }

  function recomputeHRA({ showRequired = false, withPulse = false } = {}) {
    const engine = getEngine();
    const basicRes = validateFieldEl(document.getElementById('hra-basic'), { fieldName: 'Annual Basic Salary', required: true, min: 0 }, showRequired);
    const daRes = validateFieldEl(document.getElementById('hra-da'), { fieldName: 'Annual DA', min: 0 });
    const hraRes = validateFieldEl(document.getElementById('hra-received'), { fieldName: 'Annual HRA Received', required: true, min: 0 }, showRequired);
    const rentRes = validateFieldEl(document.getElementById('hra-rent'), { fieldName: 'Annual Actual Rent Paid', required: true, min: 0 }, showRequired);

    const errors = [basicRes, daRes, hraRes, rentRes].filter((r) => !r.valid).map((r) => r.error);
    if (errors.length > 0) {
      renderAlertBox('hra-error-box', 'hra-error-msg', errors);
      renderHraEmptyState('Fix the validation error(s) above to calculate HRA.');
      return null;
    }

    renderAlertBox('hra-error-box', 'hra-error-msg', []);
    if (basicRes.missingRequired || hraRes.missingRequired || rentRes.missingRequired) {
      renderHraEmptyState();
      return null;
    }

    const res = engine.calculateHRA({
      basicSalaryAnnual: basicRes.value,
      daAnnual: daRes.value,
      hraReceivedAnnual: hraRes.value,
      rentPaidAnnual: rentRes.value,
      isMetro: hraState.isMetro,
    });

    const exemptSharePct = res.hraReceivedAnnual > 0 ? (res.exemptHra / res.hraReceivedAnnual) * 100 : 0;

    setText('hra-hero-exempt', formatINR(res.exemptHra));
    setText('hra-banner-title', `Exempt HRA (Old Regime): ${formatINR(res.exemptHra)} / year`);
    setText('hra-banner-subtitle', `Taxable HRA in Old Regime: ${formatINR(res.taxableHra)} | In New Regime: ${formatINR(res.hraReceivedAnnual)} (100% taxable).`);
    setText('hra-banner-pct', `${exemptSharePct.toFixed(1)}% Exempt`);

    setText('hra-exempt-amount', formatINR(res.exemptHra));
    setText('hra-taxable-amount', formatINR(res.taxableHra));
    setText('hra-newregime-taxable', formatINR(res.hraReceivedAnnual));
    setText('hra-pan-status', res.landlordPanRequired ? 'Required (> ₹1L/yr)' : 'Not Required (<= ₹1L)');
    setText('hra-194ib-status', res.tds194IBApplicable ? 'Applicable (5% u/s 194-IB)' : 'Not Applicable (<= ₹50k/mo)');

    setText('hra-cond1', formatINR(res.cond1ActualHra));
    setText('hra-cond2', formatINR(res.cond2RentMinus10Pct));
    setText('hra-cond3-title', `3. ${res.isMetro ? '50% of Salary (Metro)' : '40% of Salary (Non-Metro)'}`);
    setText('hra-cond3', formatINR(res.cond3CityLimit));
    setText('hra-binding-rule', res.bindingCondition);

    hraState.lastReportData = {
      filenameBase: 'BharatCalc-HRA-Exemption',
      title: 'HRA Tax Exemption Statement (Rule 2A / Sec 10(13A))',
      subtitle: `${res.isMetro ? 'Metro City (50% Cap)' : 'Non-Metro City (40% Cap)'} | Old Tax Regime Eligibility`,
      periodLabel: 'Income Tax Exemption Computation',
      kpis: [
        { label: 'Exempt HRA (Old)', value: formatINR(res.exemptHra), sub: `${exemptSharePct.toFixed(1)}% of HRA`, highlight: true },
        { label: 'Taxable HRA (Old)', value: formatINR(res.taxableHra), sub: 'Added to Salary Head' },
        { label: 'HRA in New Regime', value: formatINR(res.hraReceivedAnnual), sub: '100% Taxable (No Exemption)' },
        { label: 'Landlord PAN Status', value: res.landlordPanRequired ? 'Mandatory' : 'Optional', sub: 'Trigger > ₹1,00,000/yr' },
      ],
      sections: [
        {
          heading: '1. User Inputs',
          head: ['Parameter', 'Annual Amount'],
          colAlign: ['left', 'right'],
          rows: [
            ['Basic Salary', formatINR(res.basicSalaryAnnual)],
            ['DA (Forming part of retirement benefits)', formatINR(res.daAnnual)],
            ['Actual HRA Received', formatINR(res.hraReceivedAnnual)],
            ['Actual Rent Paid', formatINR(res.rentPaidAnnual)],
            ['City Tier', res.isMetro ? 'Metro (50% Limit)' : 'Non-Metro (40% Limit)'],
          ],
        },
        {
          heading: '2. Statutory Three-Condition Rule 2A Evaluation',
          head: ['Exemption Condition', 'Computed Amount', 'Binding Rule'],
          colAlign: ['left', 'right', 'left'],
          boldLastRow: true,
          rows: [
            ['1. Actual HRA Received from Employer', formatINR(res.cond1ActualHra), res.exemptHra === res.cond1ActualHra && res.exemptHra > 0 ? 'Minimum (Binding)' : '—'],
            ['2. Actual Rent Paid minus 10% of (Basic + DA)', formatINR(res.cond2RentMinus10Pct), res.exemptHra === res.cond2RentMinus10Pct && res.exemptHra > 0 ? 'Minimum (Binding)' : '—'],
            [`3. ${res.isMetro ? '50%' : '40%'} of (Basic + DA)`, formatINR(res.cond3CityLimit), res.exemptHra === res.cond3CityLimit && res.exemptHra > 0 ? 'Minimum (Binding)' : '—'],
            ['Eligible Tax-Exempt HRA (Least of Above)', formatINR(res.exemptHra), 'Old Regime Only'],
          ],
        },
      ],
      disclaimer:
        'HRA exemption under Rule 2A / Sec 10(13A) (Income-tax Act, 2025 corresponding provision) is available only to salaried individuals opting for the Old Tax Regime who live in rented premises and retain rent receipts.',
    };

    if (withPulse) pulseHighlight(document.getElementById('hra-outcome-banner'));
    return res;
  }

  function initHRACalculator() {
    renderHraEmptyState();

    document.querySelectorAll('#hra-city-selector .hra-city-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        updateSegmentedActive('#hra-city-selector .hra-city-btn', btn, BTN_PRIMARY_ACTIVE, BTN_NEUTRAL_INACTIVE);
        hraState.isMetro = btn.dataset.city === 'metro';
        setText('hra-cond3-title', `3. ${hraState.isMetro ? '50% of Salary (Metro)' : '40% of Salary (Non-Metro)'}`);
        recomputeHRA({ withPulse: true });
      });
    });

    document.querySelectorAll('.hra-basic-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const el = document.getElementById('hra-basic');
        if (el) el.value = btn.dataset.val;
        recomputeHRA();
      });
    });

    ['hra-basic', 'hra-da', 'hra-received', 'hra-rent'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => recomputeHRA());
    });

    document.getElementById('btn-hra-calculate')?.addEventListener('click', () => {
      recomputeHRA({ showRequired: true, withPulse: true });
    });

    document.getElementById('btn-hra-reset')?.addEventListener('click', () => {
      ['hra-basic', 'hra-da', 'hra-received', 'hra-rent'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderAlertBox('hra-error-box', 'hra-error-msg', []);
      renderHraEmptyState();
      showToast('HRA Calculator inputs cleared');
    });

    document.getElementById('btn-hra-apply-tax')?.addEventListener('click', () => {
      const res = recomputeHRA({ showRequired: true });
      if (!res) return;
      const otherEl = document.getElementById('ded-other');
      if (otherEl) {
        otherEl.value = String(Math.round(res.exemptHra));
      }
      if (history.replaceState) history.replaceState(null, '', '#income-tax');
      switchTab('income-tax');
      recomputeTax({ withPulse: true });
      showToast(`Applied Exempt HRA (${formatINR(res.exemptHra)}) to Old Regime Estimator`);
    });

    document.getElementById('btn-hra-pdf')?.addEventListener('click', () => exportReport('hra-rent-exemption', 'pdf'));
    document.getElementById('btn-hra-docx')?.addEventListener('click', () => exportReport('hra-rent-exemption', 'docx'));
  }

  /* ========================================================================
   * 7. TOOL 5: FD & RD MATURITY CALCULATOR (WITH SEC 194A TDS ASSUMPTIONS)
   * ====================================================================== */

  const fdrdState = {
    type: 'fd',
    lastReportData: null,
  };

  function renderFdrdEmptyState(bannerMsg) {
    fdrdState.lastReportData = null;
    setText('fdrd-hero-maturity', '—');
    setText('fdrd-banner-title', bannerMsg || 'Enter deposit amount, interest rate, and tenure to project returns.');
    setText('fdrd-banner-subtitle', 'Interest is taxable at slab rate; Sec 194A TDS applies above threshold.');
    setText('fdrd-banner-yield', '—');
    setText('fdrd-maturity-val', '—');
    setText('fdrd-invested-val', '—');
    setText('fdrd-interest-val', '—');
    setText('fdrd-effective-yield', '—');
    setText('fdrd-post-tds-val', '—');
    setText('fdrd-tds-threshold', '—');
    setText('fdrd-tds-status', '—');
    setText('fdrd-est-tds', '—');

    const tbody = document.getElementById('fdrd-schedule-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-4 px-4 text-center text-on-surface-variant">Calculate FD / RD maturity to view period-wise interest schedule.</td></tr>`;
    }
  }

  function recomputeFDRD({ showRequired = false, withPulse = false } = {}) {
    const engine = getEngine();
    const amtRes = validateFieldEl(
      document.getElementById('fdrd-amount'),
      { fieldName: fdrdState.type === 'fd' ? 'Principal Amount' : 'Monthly Installment', required: true, min: 100 },
      showRequired
    );
    const rateRes = validateFieldEl(
      document.getElementById('fdrd-rate'),
      { fieldName: 'Annual Interest Rate', required: true, min: 0.5, max: 15 },
      showRequired
    );
    const monthsRes = validateFieldEl(
      document.getElementById('fdrd-months'),
      { fieldName: 'Tenure (Months)', required: true, min: 1, max: 120, integer: true },
      showRequired
    );

    const errors = [amtRes, rateRes, monthsRes].filter((r) => !r.valid).map((r) => r.error);
    if (errors.length > 0) {
      renderAlertBox('fdrd-error-box', 'fdrd-error-msg', errors);
      renderFdrdEmptyState('Fix the validation error(s) above to calculate maturity.');
      return null;
    }

    renderAlertBox('fdrd-error-box', 'fdrd-error-msg', []);
    if (amtRes.missingRequired || rateRes.missingRequired || monthsRes.missingRequired) {
      renderFdrdEmptyState();
      return null;
    }

    const compSelect = document.getElementById('fdrd-compounding')?.value || '4';
    const compMap = { '12': 'monthly', '4': 'quarterly', '2': 'half-yearly', '1': 'annual' };
    const compounding = compMap[compSelect] || 'quarterly';
    const isSeniorCitizen = Boolean(document.getElementById('fdrd-senior')?.checked);
    const hasPan = Boolean(document.getElementById('fdrd-pan')?.checked);

    const res = engine.calculateFDRD({
      type: fdrdState.type,
      amount: amtRes.value,
      ratePct: rateRes.value,
      months: monthsRes.value,
      compounding,
      isSeniorCitizen,
      hasPan,
    });

    setText('fdrd-hero-maturity', formatINR(res.maturity));
    setText('fdrd-banner-title', `Estimated Maturity Value: ${formatINR(res.maturity)} (Gain: ${formatINR(res.totalInterest)})`);
    setText(
      'fdrd-banner-subtitle',
      `Avg Annual Interest: ${formatINR(res.annualAvgInterest)} | Sec 194A Threshold: ${formatINR(res.tdsThreshold)} (${res.tdsTriggered ? `TDS @ ${res.tdsRatePct}% Applicable` : 'Below TDS Threshold'})`
    );
    setText('fdrd-banner-yield', `${res.effectiveAnnualYieldPct.toFixed(2)}% Yield`);

    setText('fdrd-type-pill', res.type === 'fd' ? 'Fixed Deposit' : 'Recurring Deposit');
    setText('fdrd-maturity-val', formatINR(res.maturity));
    setText('fdrd-invested-val', formatINR(res.invested));
    setText('fdrd-interest-val', formatINR(res.totalInterest));
    setText('fdrd-effective-yield', `${res.effectiveAnnualYieldPct.toFixed(2)}% p.a.`);
    setText('fdrd-post-tds-val', formatINR(res.postTdsMaturity));
    setText('fdrd-tds-threshold', `${formatINR(res.tdsThreshold)} / yr`);
    setText(
      'fdrd-tds-status',
      res.tdsTriggered ? `Triggered (${res.tdsRatePct}% ${res.hasPan ? 'PAN' : 'No PAN'})` : 'Exempt (Within Limit)'
    );
    setText('fdrd-est-tds', formatINR(res.estimatedTotalTds));

    const tbody = document.getElementById('fdrd-schedule-tbody');
    if (tbody) {
      tbody.innerHTML = res.yearlySchedule
        .map(
          (row, idx) => `
          <tr class="${idx === res.yearlySchedule.length - 1 ? 'bg-primary-fixed/15 font-bold text-on-surface' : 'text-on-surface-variant'}">
            <td class="py-2.5 px-4">${escapeHtml(row.label)}</td>
            <td class="py-2.5 px-4 text-right">${formatINR(row.invested)}</td>
            <td class="py-2.5 px-4 text-right text-primary">${formatINR(row.interest)}</td>
            <td class="py-2.5 px-4 text-right font-semibold">${formatINR(row.value)}</td>
          </tr>`
        )
        .join('');
    }

    fdrdState.lastReportData = {
      filenameBase: `BharatCalc-${res.type.toUpperCase()}-${res.months}M`,
      title: `${res.type === 'fd' ? 'Fixed Deposit (FD)' : 'Recurring Deposit (RD)'} Maturity Statement`,
      subtitle: `${res.type === 'fd' ? `Principal ${formatINR(res.amount)}` : `${formatINR(res.amount)} / month`} | ${res.ratePct}% p.a. (${res.compounding}) | ${res.months} Months`,
      periodLabel: 'Deposit & Sec 194A TDS Analysis',
      kpis: [
        { label: 'Total Principal', value: formatINR(res.invested), sub: `${res.months} Months` },
        { label: 'Gross Interest', value: formatINR(res.totalInterest), sub: `${res.effectiveAnnualYieldPct.toFixed(2)}% Eff. Yield` },
        { label: 'Gross Maturity', value: formatINR(res.maturity), sub: res.compounding, highlight: true },
        { label: 'Post-TDS Estimate', value: formatINR(res.postTdsMaturity), sub: res.tdsTriggered ? `TDS ${formatINR(res.estimatedTotalTds)}` : 'Zero TDS Assumed' },
      ],
      sections: [
        {
          heading: '1. Deposit Parameters & Sec 194A TDS Assumptions',
          head: ['Parameter', 'Value'],
          colAlign: ['left', 'right'],
          rows: [
            ['Deposit Type', res.type === 'fd' ? 'Fixed Deposit (Lumpsum)' : 'Recurring Deposit (Monthly)'],
            [res.type === 'fd' ? 'Principal Deposit' : 'Monthly Installment', formatINR(res.amount)],
            ['Interest Rate & Compounding', `${res.ratePct}% p.a. (${res.compounding})`],
            ['Depositor Category / PAN', `${res.isSeniorCitizen ? 'Senior Citizen (60+)' : 'Resident (< 60)'} / ${res.hasPan ? 'PAN Linked (10%)' : 'No PAN (20% Sec 206AA)'}`],
            ['Annual TDS Threshold (Sec 194A)', formatINR(res.tdsThreshold)],
            ['Estimated Total TDS Over Tenure', formatINR(res.estimatedTotalTds)],
          ],
        },
        {
          heading: '2. Period-Wise Balance & Interest Schedule',
          head: ['Period', 'Cumulative Invested', 'Cumulative Interest', 'Closing Value'],
          colAlign: ['left', 'right', 'right', 'right'],
          boldLastRow: true,
          rows: res.yearlySchedule.map((r) => [r.label, formatINR(r.invested), formatINR(r.interest), formatINR(r.value)]),
        },
      ],
      disclaimer:
        'TDS assumptions reflect Sec 194A bank/post-office annual interest limits (₹50,000 regular resident; ₹1,00,000 resident senior citizen 60+ w.e.f. FY 2025-26 / TY 2026-27). Deposit interest remains taxable at your applicable income slab rate.',
    };

    if (withPulse) pulseHighlight(document.getElementById('fdrd-outcome-banner'));
    return res;
  }

  function initFDRDCalculator() {
    renderFdrdEmptyState();
    wireAccordion('toggle-fdrd-schedule', 'fdrd-schedule-container', 'fdrd-accordion-arrow');

    document.querySelectorAll('#fdrd-type-selector .fdrd-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        updateSegmentedActive('#fdrd-type-selector .fdrd-type-btn', btn, BTN_PRIMARY_ACTIVE, BTN_NEUTRAL_INACTIVE);
        fdrdState.type = btn.dataset.type;
        setText('fdrd-mode-badge', fdrdState.type === 'fd' ? 'Fixed Deposit (FD)' : 'Recurring Deposit (RD)');
        setText('fdrd-amount-label', fdrdState.type === 'fd' ? 'Deposit Principal Amount' : 'Monthly RD Installment');
        recomputeFDRD({ withPulse: true });
      });
    });

    document.querySelectorAll('.fdrd-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const el = document.getElementById('fdrd-amount');
        if (el) el.value = btn.dataset.val;
        recomputeFDRD();
      });
    });
    document.querySelectorAll('.fdrd-rate-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const el = document.getElementById('fdrd-rate');
        if (el) el.value = btn.dataset.rate;
        recomputeFDRD();
      });
    });
    document.querySelectorAll('.fdrd-month-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const el = document.getElementById('fdrd-months');
        if (el) el.value = btn.dataset.months;
        recomputeFDRD();
      });
    });

    ['fdrd-amount', 'fdrd-rate', 'fdrd-months'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => recomputeFDRD());
    });
    ['fdrd-compounding', 'fdrd-senior', 'fdrd-pan'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => recomputeFDRD());
    });

    document.getElementById('btn-fdrd-calculate')?.addEventListener('click', () => {
      recomputeFDRD({ showRequired: true, withPulse: true });
    });

    document.getElementById('btn-fdrd-reset')?.addEventListener('click', () => {
      ['fdrd-amount', 'fdrd-rate', 'fdrd-months'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderAlertBox('fdrd-error-box', 'fdrd-error-msg', []);
      renderFdrdEmptyState();
      showToast('FD & RD inputs cleared');
    });

    document.getElementById('btn-fdrd-pdf')?.addEventListener('click', () => exportReport('fd-rd-returns', 'pdf'));
    document.getElementById('btn-fdrd-docx')?.addEventListener('click', () => exportReport('fd-rd-returns', 'docx'));
  }

  /* ========================================================================
   * 8. TOOL 6: NPS TAX SAVINGS & RETIREMENT PENSION CALCULATOR
   * ====================================================================== */

  const npsState = {
    lastReportData: null,
  };

  function renderNpsEmptyState(bannerMsg) {
    npsState.lastReportData = null;
    setText('nps-hero-corpus', '—');
    setText('nps-banner-title', bannerMsg || 'Enter age, contribution, and return assumptions to project your pension corpus.');
    setText('nps-banner-subtitle', 'Compares annual deduction eligibility across Old and New Regimes.');
    setText('nps-banner-pension', '—');
    setText('nps-total-corpus', '—');
    setText('nps-invested-val', '—');
    setText('nps-returns-val', '—');
    setText('nps-lumpsum-val', '—');
    setText('nps-annuity-corpus', '—');
    setText('nps-monthly-pension', '—');
    setText('nps-new-80ccd2', '—');
    setText('nps-old-80ccd1', '—');
    setText('nps-old-80ccd1b', '—');
    setText('nps-old-80ccd2', '—');
    setText('nps-old-total-ded', '—');
  }

  function recomputeNPS({ showRequired = false, withPulse = false } = {}) {
    const engine = getEngine();
    const ageRes = validateFieldEl(document.getElementById('nps-age'), { fieldName: 'Current Age', required: true, min: 18, max: 65, integer: true }, showRequired);
    const retAgeRes = validateFieldEl(document.getElementById('nps-retire-age'), { fieldName: 'Retirement Age', required: true, min: 30, max: 75, integer: true }, showRequired);
    const monthlyRes = validateFieldEl(document.getElementById('nps-monthly'), { fieldName: 'Monthly Own Contribution', required: true, min: 0 }, showRequired);
    const basicDaRes = validateFieldEl(document.getElementById('nps-basic-da'), { fieldName: 'Annual Basic + DA', min: 0 });
    const empPctRes = validateFieldEl(document.getElementById('nps-emp-pct'), { fieldName: 'Employer NPS %', min: 0, max: 14 });
    const volRes = validateFieldEl(document.getElementById('nps-voluntary-1b'), { fieldName: 'Voluntary 80CCD(1B)', min: 0, max: 50000 });
    const retPctRes = validateFieldEl(document.getElementById('nps-return'), { fieldName: 'Expected Return %', required: true, min: 1, max: 18 }, showRequired);
    const annPctRes = validateFieldEl(document.getElementById('nps-annuity-pct'), { fieldName: 'Annuity Allocation %', min: 40, max: 100 });
    const annRateRes = validateFieldEl(document.getElementById('nps-annuity-rate'), { fieldName: 'Annuity Yield %', min: 2, max: 12 });

    const errors = [ageRes, retAgeRes, monthlyRes, basicDaRes, empPctRes, volRes, retPctRes, annPctRes, annRateRes]
      .filter((r) => !r.valid)
      .map((r) => r.error);

    if (ageRes.valid && retAgeRes.valid && !ageRes.empty && !retAgeRes.empty && retAgeRes.value <= ageRes.value) {
      errors.push('Retirement Age must be greater than Current Age.');
    }

    if (errors.length > 0) {
      renderAlertBox('nps-error-box', 'nps-error-msg', errors);
      renderNpsEmptyState('Fix the validation error(s) above to calculate NPS projections.');
      return null;
    }

    renderAlertBox('nps-error-box', 'nps-error-msg', []);

    if (ageRes.missingRequired || retAgeRes.missingRequired || monthlyRes.missingRequired || retPctRes.missingRequired) {
      renderNpsEmptyState();
      return null;
    }

    const sector = document.getElementById('nps-sector')?.value || 'private';
    const res = engine.calculateNPS({
      currentAge: ageRes.value,
      retirementAge: retAgeRes.value,
      monthlyEmployeeContribution: monthlyRes.value,
      annualBasicPlusDa: basicDaRes.value,
      employerContribPct: empPctRes.value,
      voluntaryAnnual80CCD1B: volRes.value,
      sector,
      expectedReturnPct: retPctRes.value,
      annuitySharePct: annPctRes.empty ? 40 : annPctRes.value,
      annuityRatePct: annRateRes.empty ? 6 : annRateRes.value,
    });

    setText('nps-hero-corpus', formatINR(res.totalCorpus));
    setText('nps-banner-title', `Projected Corpus at Age ${res.retirementAge}: ${formatINR(res.totalCorpus)}`);
    setText(
      'nps-banner-subtitle',
      `Old Regime Eligible Deductions: ${formatINR(res.totalOldRegimeDeduction)}/yr | New Regime 80CCD(2): ${formatINR(res.totalNewRegimeDeduction)}/yr`
    );
    setText('nps-banner-pension', `${formatINR(res.estimatedMonthlyPension)} / mo`);

    setText('nps-total-corpus', formatINR(res.totalCorpus));
    setText('nps-invested-val', formatINR(res.totalInvested));
    setText('nps-returns-val', formatINR(res.totalReturns));
    setText('nps-lumpsum-val', `${formatINR(res.lumpSumCorpus)} (${res.lumpSumSharePct}%)`);
    setText('nps-annuity-corpus', `${formatINR(res.annuityCorpus)} (${res.annuitySharePct}%)`);
    setText('nps-monthly-pension', `${formatINR(res.estimatedMonthlyPension)} / mo`);

    setText('nps-new-80ccd2', `${formatINR(res.newRegime80CCD2)} / yr`);
    setText('nps-old-80ccd1', `${formatINR(res.oldRegime80CCD1)} / yr`);
    setText('nps-old-80ccd1b', `${formatINR(res.oldRegime80CCD1B)} / yr`);
    setText('nps-old-80ccd2', `${formatINR(res.oldRegime80CCD2)} / yr`);
    setText('nps-old-total-ded', `${formatINR(res.totalOldRegimeDeduction)} / yr`);

    npsState.lastReportData = {
      filenameBase: `BharatCalc-NPS-Age${res.retirementAge}`,
      title: 'NPS Tax Deduction & Retirement Corpus Report',
      subtitle: `Age ${res.currentAge} to ${res.retirementAge} (${res.years} Yrs) | ${res.sector === 'government' ? 'Govt Sector' : 'Private Corporate'} | ${retPctRes.value}% p.a.`,
      periodLabel: 'PFRDA & Sec 80CCD Planning',
      kpis: [
        { label: 'Total Corpus', value: formatINR(res.totalCorpus), sub: `At Age ${res.retirementAge}`, highlight: true },
        { label: 'Tax-Free Lump Sum', value: formatINR(res.lumpSumCorpus), sub: `${res.lumpSumSharePct}% Sec 10(12A)` },
        { label: 'Est. Monthly Pension', value: formatINR(res.estimatedMonthlyPension), sub: `${res.annuitySharePct}% Annuity`, highlight: true },
        { label: 'Annual 80CCD(2) New', value: formatINR(res.newRegime80CCD2), sub: `Old Total: ${formatINR(res.totalOldRegimeDeduction)}` },
      ],
      sections: [
        {
          heading: '1. Annual Tax Deduction Comparison (Sec 80CCD)',
          head: ['Deduction Section', 'New Regime Limit / Eligible', 'Old Regime Limit / Eligible'],
          colAlign: ['left', 'right', 'right'],
          boldLastRow: true,
          rows: [
            ['Sec 80CCD(1) Employee Contribution (10% salary, inside 80CCE ₹1.5L)', '₹0 (Not Eligible)', formatINR(res.oldRegime80CCD1)],
            ['Sec 80CCD(1B) Additional Voluntary (Max ₹50,000)', '₹0 (Not Eligible)', formatINR(res.oldRegime80CCD1B)],
            [`Sec 80CCD(2) Employer (${res.sector === 'government' ? '14% Govt' : '14% New / 10% Old Pvt'})`, formatINR(res.newRegime80CCD2), formatINR(res.oldRegime80CCD2)],
            ['Total Annual NPS Tax Deduction', formatINR(res.totalNewRegimeDeduction), formatINR(res.totalOldRegimeDeduction)],
          ],
        },
        {
          heading: '2. Milestone Corpus Growth Trajectory',
          head: ['Horizon', 'Subscriber Age', 'Cumulative Invested', 'Total Gains', 'NPS Corpus Value'],
          colAlign: ['left', 'right', 'right', 'right', 'right'],
          boldLastRow: true,
          rows: res.schedule
            .filter((s, idx) => idx === 0 || s.year % 5 === 0 || idx === res.schedule.length - 1)
            .map((s) => [`Year ${s.year}`, `Age ${s.age}`, formatINR(s.cumulativeInvested), formatINR(s.returns), formatINR(s.corpusValue)]),
        },
      ],
      disclaimer:
        'NPS exit corpus rules (minimum 40% annuity purchase for normal exit, 60% lump sum exempt u/s 10(12A)) and Sec 80CCD ceilings follow Income-tax Act, 2025 & PFRDA regulations. Annuity pension is taxable in year of receipt.',
    };

    if (withPulse) pulseHighlight(document.getElementById('nps-outcome-banner'));
    return res;
  }

  function initNPSCalculator() {
    renderNpsEmptyState();

    [
      'nps-age',
      'nps-retire-age',
      'nps-monthly',
      'nps-basic-da',
      'nps-emp-pct',
      'nps-voluntary-1b',
      'nps-return',
      'nps-annuity-pct',
      'nps-annuity-rate',
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => recomputeNPS());
    });
    document.getElementById('nps-sector')?.addEventListener('change', () => recomputeNPS());

    document.getElementById('btn-nps-calculate')?.addEventListener('click', () => {
      recomputeNPS({ showRequired: true, withPulse: true });
    });

    document.getElementById('btn-nps-reset')?.addEventListener('click', () => {
      [
        'nps-age',
        'nps-retire-age',
        'nps-monthly',
        'nps-basic-da',
        'nps-emp-pct',
        'nps-voluntary-1b',
        'nps-return',
        'nps-annuity-pct',
        'nps-annuity-rate',
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderAlertBox('nps-error-box', 'nps-error-msg', []);
      renderNpsEmptyState();
      showToast('NPS inputs cleared');
    });

    document.getElementById('btn-nps-pdf')?.addEventListener('click', () => exportReport('nps-tax-savings', 'pdf'));
    document.getElementById('btn-nps-docx')?.addEventListener('click', () => exportReport('nps-tax-savings', 'docx'));
  }

  /* ========================================================================
   * 9. A4 FINANCIAL STATEMENT ENGINE (PDF & DOCX EXPORT ACROSS ALL 6 TOOLS)
   * ====================================================================== */

  const LOGO_ASSET_URL = 'BharatCalc%20Logo.png';
  let cachedLogoPromise = null;

  function loadLogoAssets() {
    if (cachedLogoPromise) return cachedLogoPromise;

    cachedLogoPromise = (async () => {
      try {
        const res = await fetch(LOGO_ASSET_URL);
        if (!res.ok) return { dataUrl: null, pngBytes: null };
        const buf = await res.arrayBuffer();
        const pngBytes = new Uint8Array(buf);

        const blob = new Blob([pngBytes], { type: 'image/png' });
        const objectUrl = URL.createObjectURL(blob);
        const dataUrl = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const size = 240;
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, size, size);
              ctx.drawImage(img, 0, 0, size, size);
              resolve(canvas.toDataURL('image/png'));
            } catch (_) {
              resolve(null);
            } finally {
              URL.revokeObjectURL(objectUrl);
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
          };
          img.src = objectUrl;
        });

        return { dataUrl, pngBytes };
      } catch (_) {
        return { dataUrl: null, pngBytes: null };
      }
    })();

    return cachedLogoPromise;
  }

  function pdfSafeText(str) {
    return String(str ?? '')
      .replace(/₹\s*/g, 'Rs. ')
      .replace(/[–—]/g, '-')
      .replace(/≤/g, '<=')
      .replace(/≥/g, '>=')
      .replace(/•/g, '|');
  }

  function escapeXml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function getPreparedReport(tool) {
    const map = {
      'income-tax': taxState.lastReportData,
      'gst-calculator': gstState.lastReportData,
      'sip-mutual-fund': sipState.lastReportData,
      'hra-rent-exemption': hraState.lastReportData,
      'fd-rd-returns': fdrdState.lastReportData,
      'nps-tax-savings': npsState.lastReportData,
    };
    const base = map[tool] || null;
    if (!base) return null;

    const now = new Date();
    const generatedAt = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const refId = `BC-${dateStamp}-${String(now.getTime()).slice(-5)}`;

    return {
      ...base,
      filenameBase: `${base.filenameBase}-${dateStamp}`,
      generatedAt,
      refId,
    };
  }

  function renderA4PrintSheet(report) {
    const sheet = document.getElementById('a4-print-sheet');
    if (!sheet || !report) return;

    const kpiHtml = report.kpis
      .map(
        (k) => `
      <div style="border: 1px solid ${k.highlight ? '#005d42' : '#cbd5e1'}; background: ${k.highlight ? '#ecfdf5' : '#f8fafc'}; border-radius: 6px; padding: 8px 10px;">
        <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">${escapeHtml(k.label)}</div>
        <div style="font-size: 13px; font-weight: 800; color: ${k.highlight ? '#005d42' : '#0f172a'}; margin-top: 3px;">${escapeHtml(k.value)}</div>
        ${k.sub ? `<div style="font-size: 9px; color: #475569; margin-top: 2px;">${escapeHtml(k.sub)}</div>` : ''}
      </div>`
      )
      .join('');

    const sectionsHtml = report.sections
      .map((sec) => {
        const ths = sec.head
          .map(
            (h, idx) =>
              `<th style="background:#005d42; color:#ffffff; padding:6px 8px; text-align:${sec.colAlign?.[idx] || 'left'}; font-size:10px; font-weight:700; border:1px solid #005d42;">${escapeHtml(h)}</th>`
          )
          .join('');
        const trs = sec.rows
          .map((row, rIdx) => {
            const isLastBold = sec.boldLastRow && rIdx === sec.rows.length - 1;
            const bg = isLastBold ? '#ecfdf5' : rIdx % 2 === 1 ? '#f8fafc' : '#ffffff';
            const color = isLastBold ? '#005d42' : '#1e293b';
            const weight = isLastBold ? '700' : '400';
            const tds = row
              .map(
                (cell, cIdx) =>
                  `<td style="padding:5px 8px; text-align:${sec.colAlign?.[cIdx] || 'left'}; font-size:10px; border:1px solid #e2e8f0; color:${color}; font-weight:${cIdx === 0 || isLastBold ? '600' : weight};">${escapeHtml(cell)}</td>`
              )
              .join('');
            return `<tr style="background:${bg};">${tds}</tr>`;
          })
          .join('');
        return `
        <div style="margin-top: 16px; page-break-inside: avoid;">
          <h3 style="font-size: 12px; font-weight: 700; color: #005d42; margin: 0 0 6px 0;">${escapeHtml(sec.heading)}</h3>
          <table style="width:100%; border-collapse:collapse;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
        </div>`;
      })
      .join('');

    sheet.innerHTML = `
      <div style="font-family: 'Inter', Arial, sans-serif; color: #0f172a; padding: 6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #005d42; padding-bottom: 10px;">
          <div style="display:flex; align-items:center; gap: 10px;">
            <img src="${LOGO_ASSET_URL}" alt="BharatCalc Logo" style="width: 38px; height: 38px; object-fit: contain;" onerror="this.style.display='none'" />
            <div>
              <div style="font-size: 15px; font-weight: 800; color: #005d42; letter-spacing: 0.02em;">BHARATCALC HUB</div>
              <div style="font-size: 10px; color: #64748b;">Indian Financial &amp; Tax Intelligence Suite v3.0</div>
            </div>
          </div>
          <div style="text-align:right; font-size: 9.5px; color: #475569; line-height: 1.45;">
            <div style="font-weight:700; color:#0f172a;">${escapeHtml(report.periodLabel)}</div>
            <div>Generated: ${escapeHtml(report.generatedAt)}</div>
            <div>Ref: ${escapeHtml(report.refId)}</div>
          </div>
        </div>
        <div style="margin-top: 14px;">
          <h1 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0;">${escapeHtml(report.title)}</h1>
          <p style="font-size: 10.5px; color: #475569; margin: 4px 0 0 0;">${escapeHtml(report.subtitle)}</p>
        </div>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px;">${kpiHtml}</div>
        ${sectionsHtml}
        <div style="margin-top: 18px; padding: 9px 11px; background: #f8fafc; border-left: 3px solid #005d42; font-size: 9px; color: #475569; line-height: 1.45;">
          ${escapeHtml(report.disclaimer)}
        </div>
      </div>`;
  }

  async function downloadA4PDF(report) {
    const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDFCtor) {
      renderA4PrintSheet(report);
      showToast('PDF library offline — opening formatted A4 print dialog');
      window.print();
      return;
    }

    const doc = new jsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    if (typeof doc.autoTable !== 'function') {
      renderA4PrintSheet(report);
      showToast('PDF table plugin offline — opening formatted A4 print dialog');
      window.print();
      return;
    }

    const logo = await loadLogoAssets();
    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;

    let textStartX = marginX;
    if (logo.dataUrl) {
      try {
        doc.addImage(logo.dataUrl, 'PNG', marginX, 11, 13, 13);
        textStartX = marginX + 16;
      } catch (_) {
        textStartX = marginX;
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 93, 66);
    doc.text('BHARATCALC HUB', textStartX, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(100, 116, 139);
    doc.text('Indian Financial & Tax Intelligence Suite v3.0', textStartX, 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafeText(report.periodLabel), pageWidth - marginX, 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${pdfSafeText(report.generatedAt)}`, pageWidth - marginX, 19.5, { align: 'right' });
    doc.text(`Ref: ${pdfSafeText(report.refId)}`, pageWidth - marginX, 23.5, { align: 'right' });

    doc.setDrawColor(0, 93, 66);
    doc.setLineWidth(0.6);
    doc.line(marginX, 27.5, pageWidth - marginX, 27.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafeText(report.title), marginX, 35.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(71, 85, 105);
    const subtitleLines = doc.splitTextToSize(pdfSafeText(report.subtitle), contentWidth);
    doc.text(subtitleLines, marginX, 41);

    let cursorY = 42 + subtitleLines.length * 4.2 + 2;

    const gap = 3;
    const cardW = (contentWidth - gap * 3) / 4;
    const cardH = 19.5;
    report.kpis.slice(0, 4).forEach((kpi, idx) => {
      const cardX = marginX + idx * (cardW + gap);
      if (kpi.highlight) {
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(0, 93, 66);
      } else {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
      }
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, cursorY, cardW, cardH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.6);
      doc.setTextColor(100, 116, 139);
      doc.text(pdfSafeText(kpi.label).toUpperCase(), cardX + 2.5, cursorY + 4.8, { maxWidth: cardW - 5 });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.4);
      doc.setTextColor(kpi.highlight ? 0 : 15, kpi.highlight ? 93 : 23, kpi.highlight ? 66 : 42);
      doc.text(pdfSafeText(kpi.value), cardX + 2.5, cursorY + 11.2, { maxWidth: cardW - 5 });

      if (kpi.sub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.6);
        doc.setTextColor(71, 85, 105);
        doc.text(pdfSafeText(kpi.sub), cardX + 2.5, cursorY + 16.5, { maxWidth: cardW - 5 });
      }
    });

    cursorY += cardH + 7;

    report.sections.forEach((sec) => {
      if (cursorY > pageHeight - 40) {
        doc.addPage();
        cursorY = 18;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.2);
      doc.setTextColor(0, 93, 66);
      doc.text(pdfSafeText(sec.heading), marginX, cursorY);

      const columnStyles = {};
      (sec.colAlign || []).forEach((align, idx) => {
        columnStyles[idx] = { halign: align };
      });

      const lastRowIdx = sec.rows.length - 1;
      doc.autoTable({
        startY: cursorY + 2.5,
        margin: { left: marginX, right: marginX, top: 16, bottom: 20 },
        theme: 'grid',
        head: [sec.head.map((h) => pdfSafeText(h))],
        body: sec.rows.map((r) => r.map((cell) => pdfSafeText(cell))),
        columnStyles,
        headStyles: {
          fillColor: [0, 93, 66],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.1,
          cellPadding: 2.5,
        },
        bodyStyles: {
          fontSize: 8.0,
          textColor: [30, 41, 59],
          cellPadding: 2.2,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell(data) {
          if (data.section === 'head' && sec.colAlign && sec.colAlign[data.column.index]) {
            data.cell.styles.halign = sec.colAlign[data.column.index];
          }
          if (data.section === 'body' && data.column.index === 0) {
            data.cell.styles.fontStyle = 'bold';
          }
          if (sec.boldLastRow && data.section === 'body' && data.row.index === lastRowIdx) {
            data.cell.styles.fillColor = [236, 253, 245];
            data.cell.styles.textColor = [0, 93, 66];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      cursorY = doc.lastAutoTable.finalY + 7.5;
    });

    const disclaimerLines = doc.splitTextToSize(pdfSafeText(report.disclaimer), contentWidth - 6);
    const boxHeight = disclaimerLines.length * 3.8 + 5;
    if (cursorY + boxHeight > pageHeight - 18) {
      doc.addPage();
      cursorY = 18;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(0, 93, 66);
    doc.setLineWidth(0.4);
    doc.rect(marginX, cursorY, contentWidth, boxHeight, 'F');
    doc.line(marginX, cursorY, marginX, cursorY + boxHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(disclaimerLines, marginX + 3.5, cursorY + 4.5);

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('BharatCalc Hub v3.0 | A4 Financial Computation Statement (Informational Estimate)', marginX, pageHeight - 8.5);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 8.5, { align: 'right' });
    }

    doc.save(`${report.filenameBase}.pdf`);
    showToast(`Downloaded A4 PDF: ${report.filenameBase}.pdf`);
  }

  /* ---- Pure-JS CRC32 & PKZIP STORE Builder for Zero-Dependency DOCX ---- */

  const CRC32_TABLE = (() => {
    const tbl = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      tbl[n] = c >>> 0;
    }
    return tbl;
  })();

  function computeCRC32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildZipStore(entries) {
    const encoder = new TextEncoder();
    const now = new Date();
    const dosTime =
      ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((now.getSeconds() >> 1) & 0x1f);
    const dosDate =
      (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
      (((now.getMonth() + 1) & 0x0f) << 5) |
      (now.getDate() & 0x1f);

    const localChunks = [];
    const centralChunks = [];
    let offset = 0;

    entries.forEach(({ name, data }) => {
      const nameBytes = encoder.encode(name);
      const dataBytes = data instanceof Uint8Array ? data : encoder.encode(data);
      const crc = computeCRC32(dataBytes);
      const size = dataBytes.length;

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      localChunks.push(localHeader, dataBytes);

      const cdHeader = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cdHeader.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cdHeader.set(nameBytes, 46);

      centralChunks.push(cdHeader);
      offset += localHeader.length + size;
    });

    const cdSize = centralChunks.reduce((sum, c) => sum + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const totalLen = offset + cdSize + eocd.length;
    const out = new Uint8Array(totalLen);
    let pos = 0;
    [...localChunks, ...centralChunks, eocd].forEach((chunk) => {
      out.set(chunk, pos);
      pos += chunk.length;
    });
    return out;
  }

  function getDocxColumnWidths(colCount) {
    const total = 9866;
    const presets = {
      2: [6366, 3500],
      3: [4466, 2700, 2700],
      4: [3666, 1300, 2500, 2400],
      5: [1466, 2000, 2100, 2100, 2200],
      7: [1766, 1400, 1250, 1250, 1250, 1400, 1550],
    };
    if (presets[colCount]) return presets[colCount];
    const base = Math.floor(total / colCount);
    const widths = Array(colCount).fill(base);
    widths[0] += total - base * colCount;
    return widths;
  }

  function docxPara(text, opts = {}) {
    const {
      align = 'left',
      bold = false,
      size = 20,
      color = '1E293B',
      spaceBefore = 0,
      spaceAfter = 60,
      keepNext = false,
      caps = false,
    } = opts;
    return `<w:p>
      <w:pPr>
        <w:jc w:val="${align}"/>
        <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}"/>
        ${keepNext ? '<w:keepNext/>' : ''}
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          ${bold ? '<w:b/>' : ''}
          ${caps ? '<w:caps/>' : ''}
          <w:color w:val="${color}"/>
          <w:sz w:val="${size}"/>
          <w:szCs w:val="${size}"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(text)}</w:t>
      </w:r>
    </w:p>`;
  }

  function docxInlineLogoRun(relId) {
    return `<w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="438150" cy="438150"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="1" name="BharatCalc Logo"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="1" name="logo.png"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${relId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="438150" cy="438150"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>`;
  }

  async function downloadA4DOCX(report) {
    const logo = await loadLogoAssets();
    const hasLogo = Boolean(logo.pngBytes && logo.pngBytes.length > 0);

    const headerCols = hasLogo ? [820, 4846, 4200] : [5666, 4200];
    const headerGridXml = headerCols.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
    const logoCellXml = hasLogo
      ? `<w:tc>
          <w:tcPr>
            <w:tcW w:w="820" w:type="dxa"/>
            <w:vAlign w:val="center"/>
            <w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>
          </w:tcPr>
          <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>${docxInlineLogoRun('rId2')}</w:p>
        </w:tc>`
      : '';

    const brandCellW = hasLogo ? 4846 : 5666;
    const headerTableXml = `<w:tbl>
      <w:tblPr>
        <w:tblW w:w="9866" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
          <w:bottom w:val="single" w:sz="18" w:space="0" w:color="005D42"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>${headerGridXml}</w:tblGrid>
      <w:tr>
        ${logoCellXml}
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${brandCellW}" w:type="dxa"/>
            <w:vAlign w:val="center"/>
            <w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>
          </w:tcPr>
          ${docxPara('BHARATCALC HUB', { bold: true, size: 28, color: '005D42', spaceAfter: 20 })}
          ${docxPara('Indian Financial & Tax Intelligence Suite v3.0', { size: 17, color: '64748B', spaceAfter: 0 })}
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4200" w:type="dxa"/>
            <w:vAlign w:val="center"/>
            <w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>
          </w:tcPr>
          ${docxPara(report.periodLabel, { align: 'right', bold: true, size: 18, color: '0F172A', spaceAfter: 25 })}
          ${docxPara(`Generated: ${report.generatedAt}`, { align: 'right', size: 16, color: '64748B', spaceAfter: 20 })}
          ${docxPara(`Ref: ${report.refId}`, { align: 'right', size: 15, color: '64748B', spaceAfter: 0 })}
        </w:tc>
      </w:tr>
    </w:tbl>`;

    const titleXml =
      docxPara(report.title, { bold: true, size: 32, color: '0F172A', spaceBefore: 200, spaceAfter: 50, keepNext: true }) +
      docxPara(report.subtitle, { size: 19, color: '475569', spaceBefore: 0, spaceAfter: 160 });

    const kpiWidths = [2466, 2466, 2467, 2467];
    const kpiCellsXml = report.kpis
      .slice(0, 4)
      .map((kpi, idx) => {
        const bg = kpi.highlight ? 'ECFDF5' : 'F8FAFC';
        const borderColor = kpi.highlight ? '005D42' : 'CBD5E1';
        const valColor = kpi.highlight ? '005D42' : '0F172A';
        return `<w:tc>
          <w:tcPr>
            <w:tcW w:w="${kpiWidths[idx]}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/>
              <w:left w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/>
              <w:right w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/>
            </w:tcBorders>
            <w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>
          </w:tcPr>
          ${docxPara(kpi.label, { bold: true, size: 15, color: '64748B', caps: true, spaceAfter: 35 })}
          ${docxPara(kpi.value, { bold: true, size: 22, color: valColor, spaceAfter: kpi.sub ? 25 : 0 })}
          ${kpi.sub ? docxPara(kpi.sub, { size: 15, color: '475569', spaceAfter: 0 }) : ''}
        </w:tc>`;
      })
      .join('');

    const kpiTableXml = `<w:tbl>
      <w:tblPr>
        <w:tblW w:w="9866" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
      </w:tblPr>
      <w:tblGrid>${kpiWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>
      <w:tr>${kpiCellsXml}</w:tr>
    </w:tbl>`;

    const sectionsXml = report.sections
      .map((sec) => {
        const colWidths = getDocxColumnWidths(sec.head.length);
        const gridXml = colWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');

        const headCells = sec.head
          .map((h, cIdx) => {
            const align = sec.colAlign?.[cIdx] || 'left';
            return `<w:tc>
              <w:tcPr>
                <w:tcW w:w="${colWidths[cIdx]}" w:type="dxa"/>
                <w:shd w:val="clear" w:color="auto" w:fill="005D42"/>
                <w:tcMar><w:top w:w="95" w:type="dxa"/><w:bottom w:w="95" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tcMar>
              </w:tcPr>
              ${docxPara(h, { align, bold: true, size: 18, color: 'FFFFFF', spaceAfter: 0 })}
            </w:tc>`;
          })
          .join('');

        const bodyRows = sec.rows
          .map((row, rIdx) => {
            const isLastBold = sec.boldLastRow && rIdx === sec.rows.length - 1;
            const bg = isLastBold ? 'ECFDF5' : rIdx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
            const textColor = isLastBold ? '005D42' : '1E293B';

            const cells = row
              .map((cell, cIdx) => {
                const align = sec.colAlign?.[cIdx] || 'left';
                const isBold = isLastBold || cIdx === 0;
                return `<w:tc>
                  <w:tcPr>
                    <w:tcW w:w="${colWidths[cIdx]}" w:type="dxa"/>
                    <w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>
                    <w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tcMar>
                  </w:tcPr>
                  ${docxPara(cell, { align, bold: isBold, size: 18, color: textColor, spaceAfter: 0 })}
                </w:tc>`;
              })
              .join('');

            return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr>`;
          })
          .join('');

        return (
          docxPara(sec.heading, { bold: true, size: 22, color: '005D42', spaceBefore: 220, spaceAfter: 70, keepNext: true }) +
          `<w:tbl>
            <w:tblPr>
              <w:tblW w:w="9866" w:type="dxa"/>
              <w:tblLayout w:type="fixed"/>
              <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
              </w:tblBorders>
            </w:tblPr>
            <w:tblGrid>${gridXml}</w:tblGrid>
            <w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${headCells}</w:tr>
            ${bodyRows}
          </w:tbl>`
        );
      })
      .join('');

    const disclaimerXml =
      docxPara('', { spaceBefore: 160, spaceAfter: 0 }) +
      `<w:tbl>
        <w:tblPr>
          <w:tblW w:w="9866" w:type="dxa"/>
          <w:tblLayout w:type="fixed"/>
          <w:tblBorders>
            <w:top w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
            <w:left w:val="single" w:sz="18" w:space="0" w:color="005D42"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tblGrid><w:gridCol w:w="9866"/></w:tblGrid>
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="9866" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
              <w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="150" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>
            </w:tcPr>
            ${docxPara(report.disclaimer, { size: 16, color: '475569', spaceAfter: 0 })}
          </w:tc>
        </w:tr>
      </w:tbl>` +
      docxPara('BharatCalc Hub v3.0 • A4 Financial Statement • Informational Estimation Suite', {
        align: 'center',
        size: 15,
        color: '94A3B8',
        spaceBefore: 140,
        spaceAfter: 0,
      });

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${headerTableXml}
    ${titleXml}
    ${kpiTableXml}
    ${sectionsXml}
    ${disclaimerXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020" w:header="567" w:footer="567" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasLogo ? '<Default Extension="png" ContentType="image/png"/>' : ''}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-package.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-package.wordprocessingml.styles+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${hasLogo
        ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>'
        : ''
      }
</Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:color w:val="1E293B"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:spacing w:after="60" w:line="240" w:lineRule="auto"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

    const entries = [
      { name: '[Content_Types].xml', data: contentTypesXml },
      { name: '_rels/.rels', data: rootRelsXml },
      { name: 'word/_rels/document.xml.rels', data: docRelsXml },
      { name: 'word/styles.xml', data: stylesXml },
      { name: 'word/document.xml', data: documentXml },
    ];
    if (hasLogo) {
      entries.push({ name: 'word/media/logo.png', data: logo.pngBytes });
    }

    const zipBytes = buildZipStore(entries);
    const blob = new Blob([zipBytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.filenameBase}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    showToast(`Downloaded A4 DOCX: ${report.filenameBase}.docx`);
  }

  async function exportReport(tool, format) {
    const focusMap = {
      'income-tax': 'income-gross',
      'gst-calculator': 'gst-amount',
      'sip-mutual-fund': 'sip-amount',
      'hra-rent-exemption': 'hra-basic',
      'fd-rd-returns': 'fdrd-amount',
      'nps-tax-savings': 'nps-age',
    };
    const report = getPreparedReport(tool);
    if (!report) {
      showToast('Complete valid calculation inputs first before exporting');
      document.getElementById(focusMap[tool])?.focus();
      return;
    }

    try {
      if (format === 'docx') {
        await downloadA4DOCX(report);
      } else {
        await downloadA4PDF(report);
      }
    } catch (err) {
      console.error('A4 export failed:', err);
      showToast('Unable to generate export file — please check console');
    }
  }

  // Expose report builder hook for automated verification if needed
  window.__BharatCalcTestHooks = {
    getPreparedReport,
    recomputeTax,
    recomputeGST,
    recomputeSIP,
    recomputeHRA,
    recomputeFDRD,
    recomputeNPS,
  };

  /* ========================================================================
   * INITIALIZATION
   * ====================================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    initTaxCalculator();
    initGSTCalculator();
    initSIPCalculator();
    initHRACalculator();
    initFDRDCalculator();
    initNPSCalculator();
    initNavigation();
  });
})();
