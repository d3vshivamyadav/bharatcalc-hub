/**
 * BharatCalc Hub v3.0 — Centralized Pure Financial & Indian Tax Calculation Engine
 * ----------------------------------------------------------------------------------
 * Completely independent of DOM / UI components for deterministic verification.
 * Compatible with both Browser globals (`window.BharatCalcEngine`) and Node.js (`module.exports`).
 *
 * Primary Statutory Basis (Tax Year 2026-27):
 * - Income-tax Act, 2025 & Finance Act, 2026 (Effective April 1, 2026)
 *   • Section 202 / Legacy Sec 115BAC: Default New Tax Regime slabs
 *   • Section 19 / Legacy Sec 16(ia): Standard Deduction (₹75,000 New / ₹50,000 Old)
 *   • Section 156 / Legacy Sec 87A: Resident Tax Rebate (excluded on Sec 111A/112A capital gains)
 *   • Sections 288A & 288B Equivalents: Rounding Total Income & Tax Payable to nearest ₹10
 * - GST Council 56th Meeting / GST 2.0 Reforms (Effective Sept 22, 2025): 0%, 3%, 5%, 18%, 40%
 *   (plus Historical 12%, 28% reference rates for pre-reform verification)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.BharatCalcEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  /* ==========================================================================
   * 1. VALIDATION & STATUTORY ROUNDING UTILITIES
   * ======================================================================== */

  /**
   * Statutory Income Tax rounding rule (Sec 288A / Sec 288B & Income-tax Act, 2025):
   * Ignore paise, then round to nearest multiple of ₹10 (>= 5 rounds up, < 5 rounds down).
   */
  function roundNearest10(value) {
    if (!Number.isFinite(value) || value <= 0) return 0;
    const whole = Math.floor(value);
    const rem = whole % 10;
    return rem >= 5 ? whole - rem + 10 : whole - rem;
  }

  function roundPaisa(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
  }

  /**
   * Parse and validate a non-negative finite number. Rejects negative / NaN / Infinity inputs.
   */
  function validateNumericInput(rawValue, { fieldName = 'Value', required = false, min = 0, max = Infinity, integer = false } = {}) {
    if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
      if (required) {
        return { valid: false, empty: true, value: 0, error: `${fieldName} is required.` };
      }
      return { valid: true, empty: true, value: 0, error: null };
    }

    const num = Number(rawValue);
    if (!Number.isFinite(num)) {
      return { valid: false, empty: false, value: 0, error: `${fieldName} must be a valid finite number.` };
    }
    if (num < 0) {
      return { valid: false, empty: false, value: 0, error: `${fieldName} cannot be negative.` };
    }
    if (integer && !Number.isInteger(num)) {
      return { valid: false, empty: false, value: Math.floor(num), error: `${fieldName} must be a whole number.` };
    }
    if (num < min) {
      return { valid: false, empty: false, value: num, error: `${fieldName} must be at least ${min}.` };
    }
    if (num > max) {
      return { valid: false, empty: false, value: max, error: `${fieldName} exceeds maximum allowed limit (${max}).`, capped: true };
    }

    return { valid: true, empty: false, value: num, error: null };
  }

  /* ==========================================================================
   * 2. INCOME TAX LAW PARAMETERS & CALCULATION ENGINE
   * ======================================================================== */

  const TAX_YEAR_CONFIG = {
    '2026-27': {
      key: '2026-27',
      label: 'Tax Year 2026–27',
      shortLabel: 'TY 2026–27',
      subPeriodLabel: 'Income-tax Act, 2025 & Finance Act, 2026',
      versionBadge: 'v3.0 TY 26–27',
      heroBadge: 'Tax Year 2026–27 (Income-tax Act, 2025 / Finance Act, 2026)',
      heroTitle: 'Income Tax Estimator — Tax Year 2026–27',
      heroSubtitle:
        'Compare New Regime (Sec 202 / 115BAC, ₹75,000 standard deduction, zero tax up to ₹12.75L salaried resident) vs Old Regime with statutory caps and special-rate capital gains.',
      footerSync: 'Tax Year 2026–27 Schedules Aligned (Income-tax Act, 2025 & Finance Act, 2026)',
      newStdDed: 75000,
      oldStdDed: 50000,
      newRebateLimit: 1200000,
      newMaxRebate: 60000,
      newHasRebateMarginalRelief: true,
      oldRebateLimit: 500000,
      oldMaxRebate: 12500,
      oldHasRebateMarginalRelief: false,
      newMaxSurchargeRate: 0.25,
      oldMaxSurchargeRate: 0.37,
      ltcg112AExemption: 125000,
      ltcg112ARate: 0.125,
      stcg111ARate: 0.20,
      newSlabs: [
        { min: 0, max: 400000, rate: 0, label: '₹0 – ₹4,00,000' },
        { min: 400000, max: 800000, rate: 0.05, label: '₹4,00,001 – ₹8,00,000' },
        { min: 800000, max: 1200000, rate: 0.10, label: '₹8,00,001 – ₹12,00,000' },
        { min: 1200000, max: 1600000, rate: 0.15, label: '₹12,00,001 – ₹16,00,000' },
        { min: 1600000, max: 2000000, rate: 0.20, label: '₹16,00,001 – ₹20,00,000' },
        { min: 2000000, max: 2400000, rate: 0.25, label: '₹20,00,001 – ₹24,00,000' },
        { min: 2400000, max: Infinity, rate: 0.30, label: 'Above ₹24,00,000' },
      ],
    },
    '2025-26': {
      key: '2025-26',
      label: 'FY 2025–26 (AY 2026–27)',
      shortLabel: 'FY 2025–26',
      subPeriodLabel: 'Finance Act, 2025 (Sec 115BAC)',
      versionBadge: 'v3.0 FY 25–26',
      heroBadge: 'FY 2025–26 (AY 2026–27) Rate Schedule',
      heroTitle: 'Income Tax Estimator — FY 2025–26',
      heroSubtitle:
        'Historical comparison under Finance Act, 2025 (Sec 115BAC, ₹75,000 standard deduction, zero tax up to ₹12.75L salaried resident) vs Old Tax Regime.',
      footerSync: 'FY 2025–26 & AY 2026–27 Historical Rate Schedule Selected',
      newStdDed: 75000,
      oldStdDed: 50000,
      newRebateLimit: 1200000,
      newMaxRebate: 60000,
      newHasRebateMarginalRelief: true,
      oldRebateLimit: 500000,
      oldMaxRebate: 12500,
      oldHasRebateMarginalRelief: false,
      newMaxSurchargeRate: 0.25,
      oldMaxSurchargeRate: 0.37,
      ltcg112AExemption: 125000,
      ltcg112ARate: 0.125,
      stcg111ARate: 0.20,
      newSlabs: [
        { min: 0, max: 400000, rate: 0, label: '₹0 – ₹4,00,000' },
        { min: 400000, max: 800000, rate: 0.05, label: '₹4,00,001 – ₹8,00,000' },
        { min: 800000, max: 1200000, rate: 0.10, label: '₹8,00,001 – ₹12,00,000' },
        { min: 1200000, max: 1600000, rate: 0.15, label: '₹12,00,001 – ₹16,00,000' },
        { min: 1600000, max: 2000000, rate: 0.20, label: '₹16,00,001 – ₹20,00,000' },
        { min: 2000000, max: 2400000, rate: 0.25, label: '₹20,00,001 – ₹24,00,000' },
        { min: 2400000, max: Infinity, rate: 0.30, label: 'Above ₹24,00,000' },
      ],
    },
    '2024-25': {
      key: '2024-25',
      label: 'FY 2024–25 (AY 2025–26)',
      shortLabel: 'FY 2024–25',
      subPeriodLabel: 'Finance (No. 2) Act, 2024 (Sec 115BAC)',
      versionBadge: 'v3.0 FY 24–25',
      heroBadge: 'FY 2024–25 (AY 2025–26) Historical Schedule',
      heroTitle: 'Income Tax Estimator — FY 2024–25',
      heroSubtitle:
        'Historical comparison under Finance (No. 2) Act, 2024 (Sec 115BAC, ₹75,000 standard deduction, ₹7L Sec 87A rebate threshold) vs Old Regime.',
      footerSync: 'FY 2024–25 & AY 2025–26 Historical Rate Schedule Selected',
      newStdDed: 75000,
      oldStdDed: 50000,
      newRebateLimit: 700000,
      newMaxRebate: 25000,
      newHasRebateMarginalRelief: true,
      oldRebateLimit: 500000,
      oldMaxRebate: 12500,
      oldHasRebateMarginalRelief: false,
      newMaxSurchargeRate: 0.25,
      oldMaxSurchargeRate: 0.37,
      ltcg112AExemption: 125000,
      ltcg112ARate: 0.125,
      stcg111ARate: 0.20,
      newSlabs: [
        { min: 0, max: 300000, rate: 0, label: '₹0 – ₹3,00,000' },
        { min: 300000, max: 700000, rate: 0.05, label: '₹3,00,001 – ₹7,00,000' },
        { min: 700000, max: 1000000, rate: 0.10, label: '₹7,00,001 – ₹10,00,000' },
        { min: 1000000, max: 1200000, rate: 0.15, label: '₹10,00,001 – ₹12,00,000' },
        { min: 1200000, max: 1500000, rate: 0.20, label: '₹12,00,001 – ₹15,00,000' },
        { min: 1500000, max: Infinity, rate: 0.30, label: 'Above ₹15,00,000' },
      ],
    },
  };

  /**
   * Get Old Regime slab structure. Note: Higher exemption slabs (₹3L / ₹5L)
   * apply ONLY to RESIDENT individuals aged 60+ or 80+. Non-Residents always get ₹2.5L.
   */
  function getOldRegimeSlabs(ageGroup = 'below60', residency = 'resident') {
    if (residency === 'resident') {
      if (ageGroup === 'super-senior') {
        return [
          { min: 0, max: 500000, rate: 0, label: '₹0 – ₹5,00,000' },
          { min: 500000, max: 1000000, rate: 0.20, label: '₹5,00,001 – ₹10,00,000' },
          { min: 1000000, max: Infinity, rate: 0.30, label: 'Above ₹10,00,000' },
        ];
      }
      if (ageGroup === 'senior') {
        return [
          { min: 0, max: 300000, rate: 0, label: '₹0 – ₹3,00,000' },
          { min: 300000, max: 500000, rate: 0.05, label: '₹3,00,001 – ₹5,00,000' },
          { min: 500000, max: 1000000, rate: 0.20, label: '₹5,00,001 – ₹10,00,000' },
          { min: 1000000, max: Infinity, rate: 0.30, label: 'Above ₹10,00,000' },
        ];
      }
    }
    return [
      { min: 0, max: 250000, rate: 0, label: '₹0 – ₹2,50,000' },
      { min: 250000, max: 500000, rate: 0.05, label: '₹2,50,001 – ₹5,00,000' },
      { min: 500000, max: 1000000, rate: 0.20, label: '₹5,00,001 – ₹10,00,000' },
      { min: 1000000, max: Infinity, rate: 0.30, label: 'Above ₹10,00,000' },
    ];
  }

  /**
   * Compute progressive slab-by-slab tax given taxable normal income and slabs.
   */
  function computeSlabBreakdown(normalTaxableIncome, slabs) {
    const safeIncome = Math.max(0, normalTaxableIncome);
    let rawTax = 0;
    const rows = slabs.map((slab) => {
      const span = slab.max === Infinity ? Infinity : slab.max - slab.min;
      const taxableInSlab = safeIncome > slab.min ? Math.min(safeIncome - slab.min, span) : 0;
      const taxInSlab = taxableInSlab * slab.rate;
      rawTax += taxInSlab;
      return {
        label: slab.label,
        rate: slab.rate,
        taxableInSlab,
        taxInSlab,
      };
    });
    return { rawTax, rows };
  }

  /**
   * Compute special-rate Equity STCG (Sec 111A @ 20%) and LTCG (Sec 112A @ 12.5% above ₹1.25L).
   * Residents only may utilize unexhausted Basic Exemption Limit against 111A (20% first) then 112A (12.5%).
   */
  function computeSpecialCapitalGainsTax({
    normalTaxableIncome,
    stcg111A = 0,
    ltcg112A = 0,
    basicExemptionLimit,
    residency = 'resident',
    cfg,
  }) {
    const safeStcg = Math.max(0, stcg111A);
    const safeLtcg = Math.max(0, ltcg112A);

    let unexhaustedBasic =
      residency === 'resident' ? Math.max(0, basicExemptionLimit - Math.max(0, normalTaxableIncome)) : 0;

    // Prioritize STCG (20%) before LTCG (12.5%) for unexhausted basic exemption benefit
    const basicShiftToStcg = Math.min(safeStcg, unexhaustedBasic);
    const remainingStcg = safeStcg - basicShiftToStcg;
    unexhaustedBasic -= basicShiftToStcg;

    const ltcgAboveExemption = Math.max(0, safeLtcg - cfg.ltcg112AExemption);
    const basicShiftToLtcg = Math.min(ltcgAboveExemption, unexhaustedBasic);
    const taxableLtcg = Math.max(0, ltcgAboveExemption - basicShiftToLtcg);

    const stcgTax = remainingStcg * cfg.stcg111ARate;
    const ltcgTax = taxableLtcg * cfg.ltcg112ARate;

    return {
      stcg111AGross: safeStcg,
      ltcg112AGross: safeLtcg,
      basicShiftToStcg,
      basicShiftToLtcg,
      taxableStcg: remainingStcg,
      taxableLtcg,
      stcgTax,
      ltcgTax,
      totalSpecialTax: stcgTax + ltcgTax,
    };
  }

  /**
   * Helper: compute tax before surcharge & surcharge for any income level (supports marginal relief recursion).
   */
  function computeBaseAndSurcharge({
    regime, // 'new' | 'old'
    normalTaxableIncome,
    stcg111A,
    ltcg112A,
    slabs,
    residency,
    cfg,
  }) {
    const basicExemptionLimit = slabs[0].max;
    const { rawTax: normalRawTax, rows } = computeSlabBreakdown(normalTaxableIncome, slabs);

    const cg = computeSpecialCapitalGainsTax({
      normalTaxableIncome,
      stcg111A,
      ltcg112A,
      basicExemptionLimit,
      residency,
      cfg,
    });

    const totalTaxableIncome = Math.max(0, normalTaxableIncome + cg.stcg111AGross + cg.ltcg112AGross);

    // Section 87A / IT Act 2025 Sec 156 Rebate (Residents only, normal slab income only)
    let rebate87A = 0;
    let rebateMarginalRelief = 0;
    let normalTaxAfterRebate = normalRawTax;

    if (residency === 'resident') {
      const limit = regime === 'new' ? cfg.newRebateLimit : cfg.oldRebateLimit;
      const maxRebate = regime === 'new' ? cfg.newMaxRebate : cfg.oldMaxRebate;
      const allowMarginalRelief = regime === 'new' ? cfg.newHasRebateMarginalRelief : cfg.oldHasRebateMarginalRelief;

      if (totalTaxableIncome <= limit) {
        // Rebate never applies against Sec 111A / 112A special-rate taxes
        rebate87A = Math.min(normalRawTax, maxRebate);
        normalTaxAfterRebate = Math.max(0, normalRawTax - rebate87A);
      } else if (allowMarginalRelief && normalRawTax > 0) {
        const excessOverLimit = totalTaxableIncome - limit;
        if (normalRawTax > excessOverLimit) {
          rebateMarginalRelief = normalRawTax - excessOverLimit;
          normalTaxAfterRebate = excessOverLimit;
        }
      }
    }

    const baseTax = normalTaxAfterRebate + cg.totalSpecialTax;

    // Surcharge with 15% cap on Sec 111A / Sec 112A & Threshold Marginal Relief
    let surchargeRateNormal = 0;
    let surchargeRateSpecial = 0;
    let surchargeThreshold = 0;

    if (totalTaxableIncome > 50000000) {
      surchargeRateNormal = regime === 'new' ? cfg.newMaxSurchargeRate : cfg.oldMaxSurchargeRate;
      surchargeRateSpecial = 0.15;
      surchargeThreshold = 50000000;
    } else if (totalTaxableIncome > 20000000) {
      surchargeRateNormal = 0.25;
      surchargeRateSpecial = 0.15;
      surchargeThreshold = 20000000;
    } else if (totalTaxableIncome > 10000000) {
      surchargeRateNormal = 0.15;
      surchargeRateSpecial = 0.15;
      surchargeThreshold = 10000000;
    } else if (totalTaxableIncome > 5000000) {
      surchargeRateNormal = 0.10;
      surchargeRateSpecial = 0.10;
      surchargeThreshold = 5000000;
    }

    const rawSurcharge =
      baseTax > 0 && surchargeThreshold > 0
        ? normalTaxAfterRebate * surchargeRateNormal + cg.totalSpecialTax * surchargeRateSpecial
        : 0;

    let surcharge = rawSurcharge;
    let surchargeMarginalRelief = 0;

    if (rawSurcharge > 0 && surchargeThreshold > 0) {
      // Scale income cleanly down by excess above threshold (prioritizing normal income first, matching ITD relief rules)
      const excessIncome = totalTaxableIncome - surchargeThreshold;
      let rem = excessIncome;
      const cutNormal = Math.min(normalTaxableIncome, rem);
      rem -= cutNormal;
      const cutStcg = Math.min(cg.stcg111AGross, rem);
      rem -= cutStcg;
      const cutLtcg = Math.min(cg.ltcg112AGross, rem);

      const atThreshold = computeBaseAndSurcharge({
        regime,
        normalTaxableIncome: normalTaxableIncome - cutNormal,
        stcg111A: cg.stcg111AGross - cutStcg,
        ltcg112A: cg.ltcg112AGross - cutLtcg,
        slabs,
        residency,
        cfg,
      });

      const maxAllowedTaxPlusSurcharge = atThreshold.taxPlusSurcharge + excessIncome;
      if (baseTax + rawSurcharge > maxAllowedTaxPlusSurcharge) {
        surcharge = Math.max(0, maxAllowedTaxPlusSurcharge - baseTax);
        surchargeMarginalRelief = Math.max(0, rawSurcharge - surcharge);
      }
    }

    return {
      totalTaxableIncome,
      normalRawTax,
      rows,
      cg,
      rebate87A,
      rebateMarginalRelief,
      normalTaxAfterRebate,
      baseTax,
      surchargeRateNormal,
      surchargeRateSpecial,
      rawSurcharge,
      surcharge,
      surchargeMarginalRelief,
      taxPlusSurcharge: baseTax + surcharge,
    };
  }

  /**
   * Calculate eligible Chapter VI-A & Employer NPS deductions with statutory caps enforced per regime.
   */
  function evaluateTaxDeductions(rawInput, cfg) {
    const grossNormalIncome = Math.max(0, Number(rawInput.grossNormalIncome) || 0);
    const isSalariedOrPensioner = rawInput.incomeSource !== 'self-employed';
    const ageGroup = rawInput.ageGroup || 'below60'; // 'below60' | 'senior' | 'super-senior'
    const residency = rawInput.residency || 'resident'; // 'resident' | 'nri'
    const sector = rawInput.sector || 'private'; // 'private' | 'govt'
    const seniorParents = Boolean(rawInput.seniorParents);

    // 1. Standard Deduction: ₹75,000 New / ₹50,000 Old (Salaried & Pensioners only)
    const newStdDed = isSalariedOrPensioner ? Math.min(grossNormalIncome, cfg.newStdDed) : 0;
    const oldStdDed = isSalariedOrPensioner ? Math.min(grossNormalIncome, cfg.oldStdDed) : 0;

    // 2. Employer NPS 80CCD(2): Allowed in BOTH New & Old Regimes (Private: 14% New / 10% Old; Govt: 14% Both)
    const isGovt = sector === 'govt' || sector === 'government';
    const rawEmployerNps = Math.max(0, Number(rawInput.employerNps80CCD2) || 0);
    const basicPlusDa = Math.max(0, Number(rawInput.basicPlusDa) || 0);
    // If Basic+DA is provided, enforce exact % ceiling; if only gross salary is known, use gross salary upper bound
    const maxNew80CCD2Pct = 0.14;
    const maxOld80CCD2Pct = isGovt ? 0.14 : 0.10;
    const referenceSalary = basicPlusDa > 0 ? Math.min(basicPlusDa, grossNormalIncome) : grossNormalIncome;
    const newEmployerNps = isSalariedOrPensioner
      ? Math.min(rawEmployerNps, referenceSalary * maxNew80CCD2Pct)
      : 0;
    const oldEmployerNps = isSalariedOrPensioner
      ? Math.min(rawEmployerNps, referenceSalary * maxOld80CCD2Pct)
      : 0;

    // 3. Old Regime-only deductions (Sec 80CCE combines 80C + 80CCD(1) within ₹1,50,000 cap)
    const raw80C = Math.max(0, Number(rawInput.sec80C) || 0);
    const raw80CCD1 = Math.max(0, Number(rawInput.nps80CCD1) || 0);
    const combined80CCE = raw80C + raw80CCD1;
    const sec80C = Math.min(combined80CCE, 150000);

    // Section 80D: Self limit (25k <60, 50k 60+) + Parents limit (25k <60, 50k 60+)
    // Resident NRIs cannot claim extra senior exemption bonus; 80D allows self + parents (max 50k/75k/100k)
    const isSelfSenior = ageGroup !== 'below60';
    const sec80DMax = (isSelfSenior ? 50000 : 25000) + (seniorParents ? 50000 : 25000);
    const raw80D = Math.max(0, Number(rawInput.sec80D) || 0);
    const sec80D = Math.min(raw80D, sec80DMax);

    const raw24b = Math.max(0, Number(rawInput.sec24b) || 0);
    const sec24b = Math.min(raw24b, 200000);

    const raw80CCD1B = Math.max(0, Number(rawInput.nps80CCD1B) || 0);
    const nps80CCD1B = Math.min(raw80CCD1B, 50000);

    const hraExempt = isSalariedOrPensioner ? Math.max(0, Number(rawInput.hraExempt) || 0) : 0;
    const ltaAndOther = Math.max(0, Number(rawInput.otherExemptions) || 0);

    const warnings = [];
    if (combined80CCE > 150000) warnings.push('Section 80C / 80CCD(1) combined claim clamped to statutory ₹1,50,000 Sec 80CCE limit (Old Regime).');
    if (raw80D > sec80DMax) {
      warnings.push(
        `Section 80D clamped to ₹${sec80DMax.toLocaleString('en-IN')} (${isSelfSenior ? '₹50k Self 60+' : '₹25k Self <60'} + ${seniorParents ? '₹50k Senior Parents 60+' : '₹25k Parents <60'
        }).`
      );
    }
    if (raw24b > 200000) warnings.push('Section 24(b) self-occupied housing loan interest clamped to ₹2,00,000.');
    if (raw80CCD1B > 50000) warnings.push('Section 80CCD(1B) voluntary NPS clamped to ₹50,000.');
    if (rawEmployerNps > 0 && !isSalariedOrPensioner) {
      warnings.push('Section 80CCD(2) applies only to salaried employees with employer NPS contributions.');
    }

    const totalNewDeductions = Math.min(grossNormalIncome, newStdDed + newEmployerNps);
    const totalOldDeductions = Math.min(
      grossNormalIncome,
      oldStdDed + oldEmployerNps + sec80C + sec80D + sec24b + nps80CCD1B + hraExempt + ltaAndOther
    );

    return {
      grossNormalIncome,
      isSalariedOrPensioner,
      ageGroup,
      residency,
      sector,
      seniorParents,
      newStdDed,
      oldStdDed,
      newEmployerNps,
      oldEmployerNps,
      sec80C,
      sec80D,
      sec80DMax,
      sec24b,
      nps80CCD1B,
      hraExempt,
      ltaAndOther,
      totalNewDeductions,
      totalOldDeductions,
      warnings,
    };
  }

  /**
   * Calculate tax under the New Tax Regime (Income-tax Act, 2025 Sec 202 / Legacy Sec 115BAC).
   */
  function calculateNewRegimeTax(input) {
    const cfg = TAX_YEAR_CONFIG[input.taxYear] || TAX_YEAR_CONFIG['2026-27'];
    const ded = evaluateTaxDeductions(input, cfg);

    const rawNormalTaxable = Math.max(0, ded.grossNormalIncome - ded.totalNewDeductions);
    const stcg111A = Math.max(0, Number(input.stcg111A) || 0);
    const ltcg112A = Math.max(0, Number(input.ltcg112A) || 0);

    // Apply Section 288A rounding (nearest ₹10) to total taxable income, adjusting normal income cleanly
    const unroundedTotal = rawNormalTaxable + stcg111A + ltcg112A;
    const roundedTotal = roundNearest10(unroundedTotal);
    const roundingDelta = roundedTotal - unroundedTotal;
    const normalTaxableIncome = Math.max(0, Math.round(rawNormalTaxable + roundingDelta));

    const core = computeBaseAndSurcharge({
      regime: 'new',
      normalTaxableIncome,
      stcg111A,
      ltcg112A,
      slabs: cfg.newSlabs,
      residency: ded.residency,
      cfg,
    });

    const cess = (core.baseTax + core.surcharge) * 0.04;
    const exactTotalTax = core.baseTax + core.surcharge + cess;
    const totalTax = roundNearest10(exactTotalTax); // Sec 288B

    return {
      regime: 'new',
      taxYear: cfg.key,
      cfg,
      deductions: ded,
      stdDed: ded.newStdDed,
      employerNps: ded.newEmployerNps,
      totalDeductions: ded.totalNewDeductions,
      normalTaxableIncome,
      totalTaxableIncome: core.totalTaxableIncome,
      slabs: cfg.newSlabs,
      rows: core.rows,
      normalRawTax: core.normalRawTax,
      rebate87A: core.rebate87A,
      marginalRelief: core.rebateMarginalRelief,
      normalTaxAfterRebate: core.normalTaxAfterRebate,
      capitalGains: core.cg,
      baseTax: core.baseTax,
      surcharge: core.surcharge,
      surchargeMarginalRelief: core.surchargeMarginalRelief,
      cess,
      exactTotalTax,
      totalTax,
    };
  }

  /**
   * Calculate tax under the Old Tax Regime (with age & residency exemptions and Chapter VI-A deductions).
   */
  function calculateOldRegimeTax(input) {
    const cfg = TAX_YEAR_CONFIG[input.taxYear] || TAX_YEAR_CONFIG['2026-27'];
    const ded = evaluateTaxDeductions(input, cfg);
    const slabs = getOldRegimeSlabs(ded.ageGroup, ded.residency);

    const rawNormalTaxable = Math.max(0, ded.grossNormalIncome - ded.totalOldDeductions);
    const stcg111A = Math.max(0, Number(input.stcg111A) || 0);
    const ltcg112A = Math.max(0, Number(input.ltcg112A) || 0);

    const unroundedTotal = rawNormalTaxable + stcg111A + ltcg112A;
    const roundedTotal = roundNearest10(unroundedTotal);
    const roundingDelta = roundedTotal - unroundedTotal;
    const normalTaxableIncome = Math.max(0, Math.round(rawNormalTaxable + roundingDelta));

    const core = computeBaseAndSurcharge({
      regime: 'old',
      normalTaxableIncome,
      stcg111A,
      ltcg112A,
      slabs,
      residency: ded.residency,
      cfg,
    });

    const cess = (core.baseTax + core.surcharge) * 0.04;
    const exactTotalTax = core.baseTax + core.surcharge + cess;
    const totalTax = roundNearest10(exactTotalTax); // Sec 288B

    return {
      regime: 'old',
      taxYear: cfg.key,
      cfg,
      deductions: ded,
      stdDed: ded.oldStdDed,
      employerNps: ded.oldEmployerNps,
      totalDeductions: ded.totalOldDeductions,
      normalTaxableIncome,
      totalTaxableIncome: core.totalTaxableIncome,
      slabs,
      rows: core.rows,
      normalRawTax: core.normalRawTax,
      rebate87A: core.rebate87A,
      marginalRelief: core.rebateMarginalRelief,
      normalTaxAfterRebate: core.normalTaxAfterRebate,
      capitalGains: core.cg,
      baseTax: core.baseTax,
      surcharge: core.surcharge,
      surchargeMarginalRelief: core.surchargeMarginalRelief,
      cess,
      exactTotalTax,
      totalTax,
    };
  }

  /**
   * Compare New vs Old Tax Regimes side-by-side.
   */
  function compareTaxRegimes(input) {
    const newRegime = calculateNewRegimeTax(input);
    const oldRegime = calculateOldRegimeTax(input);

    // Baseline Old Regime tax without optional Chapter VI-A deductions (shows incremental savings of deductions)
    const oldBaseline = calculateOldRegimeTax({
      ...input,
      sec80C: 0,
      sec80D: 0,
      sec24b: 0,
      nps80CCD1B: 0,
      hraExempt: 0,
      otherExemptions: 0,
      employerNps80CCD2: 0,
    });

    const grossTotalIncome =
      newRegime.deductions.grossNormalIncome +
      (Math.max(0, Number(input.stcg111A) || 0) + Math.max(0, Number(input.ltcg112A) || 0));

    const newMonthlyTax = newRegime.totalTax / 12;
    const oldMonthlyTax = oldRegime.totalTax / 12;
    const newMonthlyTakeHome = Math.max(0, (grossTotalIncome - newRegime.totalTax) / 12);
    const oldMonthlyTakeHome = Math.max(0, (grossTotalIncome - oldRegime.totalTax) / 12);

    const savings = Math.abs(oldRegime.totalTax - newRegime.totalTax);
    const recommended = newRegime.totalTax <= oldRegime.totalTax ? 'new' : 'old';

    return {
      grossTotalIncome,
      newRegime: {
        ...newRegime,
        monthlyTax: newMonthlyTax,
        monthlyTakeHome: newMonthlyTakeHome,
        effectiveRatePct: grossTotalIncome > 0 ? (newRegime.totalTax / grossTotalIncome) * 100 : 0,
        takeHomePct: grossTotalIncome > 0 ? Math.max(0, ((grossTotalIncome - newRegime.totalTax) / grossTotalIncome) * 100) : 0,
      },
      oldRegime: {
        ...oldRegime,
        monthlyTax: oldMonthlyTax,
        monthlyTakeHome: oldMonthlyTakeHome,
        effectiveRatePct: grossTotalIncome > 0 ? (oldRegime.totalTax / grossTotalIncome) * 100 : 0,
        takeHomePct: grossTotalIncome > 0 ? Math.max(0, ((grossTotalIncome - oldRegime.totalTax) / grossTotalIncome) * 100) : 0,
      },
      taxSavedByOldDeductions: Math.max(0, oldBaseline.totalTax - oldRegime.totalTax),
      recommended,
      savings,
      warnings: newRegime.deductions.warnings,
    };
  }

  /* ==========================================================================
   * 3. GST 2.0 ENGINE (WITH HSN / SAC CLASSIFICATION AWARENESS)
   * ======================================================================== */

  const GST_CATALOG = [
    {
      id: 'services-it',
      label: 'IT, SaaS, Consulting & Professional Services — SAC 9983 (18% Standard)',
      rate: 18,
      hsnSac: 'SAC 9983',
      note: 'Standard GST 2.0 rate (18%) applies to IT, software/SaaS, consulting, and commercial services. Verify applicable SAC on cbic-gst.gov.in.',
      categoryType: 'Services',
    },
    {
      id: 'electronics-capital',
      label: 'Electronics, Appliances & B2B Goods — HSN 84/85 (18% Standard)',
      rate: 18,
      hsnSac: 'HSN 84 / 85',
      note: 'Standard 18% GST covers electronics, capital goods, consumer durables, and cement following post-Sept 2025 GST 2.0 streamlining.',
      categoryType: 'Goods',
    },
    {
      id: 'essentials-packaged',
      label: 'Essential Packaged Food, Hotels (<=7.5k), Apparel — HSN 04/21/61/62 (5% Merit)',
      rate: 5,
      hsnSac: 'HSN 04 / 21 / 61 / 62',
      note: '5% Merit Slab applies to notified essential processed foods, medicines, and affordable apparel/hospitality under GST 2.0.',
      categoryType: 'Goods',
    },
    {
      id: 'exempt-essentials',
      label: 'Unpacked Grains, Fresh Produce, Healthcare, Education — HSN 07/10 / SAC 9992/9993 (0% Exempt)',
      rate: 0,
      hsnSac: 'HSN 07/10 / SAC 9992',
      note: 'Exempt (0%) category: fresh agricultural produce, unpackaged grains, individual life/health insurance, healthcare, and core education.',
      categoryType: 'Exempt',
    },
    {
      id: 'bullion-jewellery',
      label: 'Gold, Silver & Cut Precious Jewellery — HSN 7108/7113 (3% Special)',
      rate: 3,
      hsnSac: 'HSN 7108 / 7113',
      note: 'Special 3% GST rate applies to gold, silver, and precious jewellery (0.25% applies to rough unworked diamonds).',
      categoryType: 'Special Rate',
    },
    {
      id: 'luxury-demerit',
      label: 'Aerated Sugary Drinks, Sin & Super-Luxury Goods — HSN 2202/24/87 (40% Demerit)',
      rate: 40,
      hsnSac: 'HSN 2202 / 24 / 87',
      note: '40% GST 2.0 Luxury/Sin slab applies to demerit beverages, tobacco products, and high-end luxury motor vehicles/yachts.',
      categoryType: 'Luxury / Sin',
    },
    {
      id: 'historical-12',
      label: 'Pre-Sept 2025 Legacy 12% Bracket Reference — Historical (12%)',
      rate: 12,
      hsnSac: 'Pre-GST 2.0 Historical',
      note: 'Historical 12% bracket retained strictly for reconciling invoices issued before September 22, 2025 (superseded by GST 2.0).',
      categoryType: 'Historical',
    },
    {
      id: 'historical-28',
      label: 'Pre-Sept 2025 Legacy 28% Bracket Reference — Historical (28%)',
      rate: 28,
      hsnSac: 'Pre-GST 2.0 Historical',
      note: 'Historical 28% bracket retained strictly for reconciling invoices issued before September 22, 2025 (superseded by GST 2.0).',
      categoryType: 'Historical',
    },
  ];

  const GST_SLABS_GST2 = [0, 3, 5, 18, 40];
  const GST_SLABS_ALL = [0, 3, 5, 12, 18, 28, 40];

  function calculateGST({ unitAmount, quantity = 1, mode = 'exclusive', rate = 18, supply = 'intra' }) {
    const safeUnit = Math.max(0, Number(unitAmount) || 0);
    const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));
    const safeRate = Math.max(0, Math.min(40, Number(rate) || 0));
    const enteredTotal = safeUnit * safeQty;

    let netBase = 0;
    let totalGst = 0;
    let grossTotal = 0;

    if (mode === 'inclusive') {
      grossTotal = enteredTotal;
      netBase = grossTotal / (1 + safeRate / 100);
      totalGst = grossTotal - netBase;
    } else {
      netBase = enteredTotal;
      totalGst = netBase * (safeRate / 100);
      grossTotal = netBase + totalGst;
    }

    const roundedGst = roundPaisa(totalGst);
    const roundedNet = mode === 'inclusive' ? roundPaisa(grossTotal - roundedGst) : roundPaisa(netBase);
    const roundedGross = mode === 'inclusive' ? roundPaisa(grossTotal) : roundPaisa(roundedNet + roundedGst);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (supply === 'intra') {
      cgst = roundPaisa(roundedGst / 2);
      sgst = roundPaisa(roundedGst - cgst);
    } else {
      igst = roundedGst;
    }

    const taxSharePct = roundedGross > 0 ? (roundedGst / roundedGross) * 100 : 0;

    return {
      unitAmount: safeUnit,
      quantity: safeQty,
      mode,
      rate: safeRate,
      supply,
      netBase: roundedNet,
      totalGst: roundedGst,
      grossTotal: roundedGross,
      perUnitGross: roundPaisa(roundedGross / safeQty),
      cgst,
      sgst,
      igst,
      taxSharePct,
      baseSharePct: roundedGross > 0 ? 100 - taxSharePct : 0,
    };
  }

  /* ==========================================================================
   * 4. SIP & MUTUAL FUND ENGINE
   * ======================================================================== */

  function calculateSIP({ mode = 'sip', amount, ratePct, years, stepUpPct = 0 }) {
    const safeAmt = Math.max(0, Number(amount) || 0);
    const safeRate = Math.max(0, Number(ratePct) || 0);
    const safeYears = Math.max(1, Math.min(50, Math.round(Number(years) || 1)));
    const safeStepUp = mode === 'sip' ? Math.max(0, Math.min(50, Number(stepUpPct) || 0)) : 0;

    const schedule = [];
    let totalInvested = 0;
    let portfolioValue = 0;

    if (mode === 'lumpsum') {
      totalInvested = safeAmt;
      portfolioValue = safeAmt;
      const annualFactor = 1 + safeRate / 100;

      for (let yr = 1; yr <= safeYears; yr++) {
        portfolioValue *= annualFactor;
        schedule.push({
          year: yr,
          annualDeposit: yr === 1 ? safeAmt : 0,
          cumulativeInvested: totalInvested,
          totalReturns: Math.max(0, portfolioValue - totalInvested),
          yearEndValue: portfolioValue,
        });
      }
    } else {
      // AMFI / Standard Indian Monthly SIP: Annuity Due (installment invested at start of each month)
      const monthlyRate = safeRate / 12 / 100;
      let currentMonthlySip = safeAmt;

      for (let yr = 1; yr <= safeYears; yr++) {
        let annualDeposit = 0;
        for (let m = 1; m <= 12; m++) {
          totalInvested += currentMonthlySip;
          annualDeposit += currentMonthlySip;
          portfolioValue = (portfolioValue + currentMonthlySip) * (1 + monthlyRate);
        }
        schedule.push({
          year: yr,
          annualDeposit,
          cumulativeInvested: totalInvested,
          totalReturns: Math.max(0, portfolioValue - totalInvested),
          yearEndValue: portfolioValue,
        });
        if (safeStepUp > 0) {
          currentMonthlySip = currentMonthlySip * (1 + safeStepUp / 100);
        }
      }
    }

    const roundedInvested = roundPaisa(totalInvested);
    const roundedMaturity = roundPaisa(portfolioValue);
    const estimatedReturns = Math.max(0, roundPaisa(roundedMaturity - roundedInvested));
    const realValue = roundPaisa(roundedMaturity / Math.pow(1.06, safeYears)); // 6% India CPI benchmark
    const swpMonthly = roundPaisa((roundedMaturity * 0.04) / 12);
    const estLtcg112A = roundPaisa(Math.max(0, estimatedReturns - 125000) * 0.125);

    return {
      mode,
      amount: safeAmt,
      ratePct: safeRate,
      years: safeYears,
      stepUpPct: safeStepUp,
      invested: roundedInvested,
      returns: estimatedReturns,
      maturity: roundedMaturity,
      multiplier: roundedInvested > 0 ? roundedMaturity / roundedInvested : 0,
      gainPct: roundedInvested > 0 ? (estimatedReturns / roundedInvested) * 100 : 0,
      investedSharePct: roundedMaturity > 0 ? (roundedInvested / roundedMaturity) * 100 : 0,
      returnsSharePct: roundedMaturity > 0 ? (estimatedReturns / roundedMaturity) * 100 : 0,
      realValue,
      swpMonthly,
      estLtcg112A,
      schedule,
    };
  }

  /* ==========================================================================
   * 5. FIXED DEPOSIT (FD) & RECURRING DEPOSIT (RD) ENGINE WITH SEC 194A TDS
   * ======================================================================== */

  /**
   * Compute FD or RD maturity and Section 194A TDS impact.
   * Official TDS thresholds (w.e.f. FY 2025-26 / Tax Year 2026-27 u/s 194A):
   * - Bank / Post Office Interest: ₹50,000 (Resident < 60), ₹1,00,000 (Resident Senior 60+)
   * - TDS rate: 10% with PAN (or 20% without PAN) when projected annual interest exceeds threshold.
   */
  function calculateFDRD({
    type = 'fd', // 'fd' | 'rd'
    amount, // Principal (FD) or Monthly Deposit (RD)
    ratePct,
    months,
    compounding = 'quarterly', // 'quarterly' | 'monthly' | 'half-yearly' | 'annual' | 'simple'
    isSeniorCitizen = false,
    hasPan = true,
  }) {
    const safeAmt = Math.max(0, Number(amount) || 0);
    const safeRate = Math.max(0, Number(ratePct) || 0);
    const safeMonths = Math.max(1, Math.min(360, Math.round(Number(months) || 12)));
    const yearsExact = safeMonths / 12;

    const freqMap = {
      monthly: 12,
      quarterly: 4,
      'half-yearly': 2,
      annual: 1,
    };
    const n = freqMap[compounding] || 4;

    let invested = 0;
    let maturity = 0;
    const yearlySchedule = [];

    if (type === 'fd') {
      invested = safeAmt;
      const calcAtMonth = (mCount) => {
        const t = mCount / 12;
        if (compounding === 'simple') {
          return safeAmt * (1 + (safeRate / 100) * t);
        }
        return safeAmt * Math.pow(1 + safeRate / (100 * n), n * t);
      };

      maturity = calcAtMonth(safeMonths);
      for (let m = 12; m <= safeMonths; m += 12) {
        const val = calcAtMonth(m);
        yearlySchedule.push({
          label: `Year ${m / 12}`,
          invested: safeAmt,
          interest: val - safeAmt,
          value: val,
        });
      }
      if (safeMonths % 12 !== 0) {
        yearlySchedule.push({
          label: `${safeMonths} Months`,
          invested: safeAmt,
          interest: maturity - safeAmt,
          value: maturity,
        });
      }
    } else {
      // Recurring Deposit (standard Indian IBA/SBI formula: each deposit earns compound/simple over remaining months)
      invested = safeAmt * safeMonths;
      const calcRdValue = (totalMonths) => {
        let sum = 0;
        for (let rem = 1; rem <= totalMonths; rem++) {
          const t = rem / 12;
          if (compounding === 'simple') {
            sum += safeAmt * (1 + (safeRate / 100) * t);
          } else {
            sum += safeAmt * Math.pow(1 + safeRate / (100 * n), n * t);
          }
        }
        return sum;
      };

      maturity = calcRdValue(safeMonths);
      for (let m = 12; m <= safeMonths; m += 12) {
        const inv = safeAmt * m;
        const val = calcRdValue(m);
        yearlySchedule.push({
          label: `Year ${m / 12}`,
          invested: inv,
          interest: Math.max(0, val - inv),
          value: val,
        });
      }
      if (safeMonths % 12 !== 0) {
        yearlySchedule.push({
          label: `${safeMonths} Months`,
          invested,
          interest: Math.max(0, maturity - invested),
          value: maturity,
        });
      }
    }

    const totalInterest = Math.max(0, maturity - invested);
    const annualAvgInterest = totalInterest / yearsExact;
    // First-year annualized yield
    const effectiveAnnualYieldPct =
      compounding === 'simple'
        ? safeRate
        : (Math.pow(1 + safeRate / (100 * n), n) - 1) * 100;

    // Section 194A Bank / Post Office TDS Thresholds (w.e.f. FY 2025-26 & Tax Year 2026-27)
    const tdsThreshold = isSeniorCitizen ? 100000 : 50000;
    const tdsRatePct = hasPan ? 10 : 20;
    const tdsTriggered = annualAvgInterest > tdsThreshold;
    // Under Indian Sec 194A, once total annual interest exceeds threshold, 10%/20% applies on total interest
    const estimatedAnnualTds = tdsTriggered ? annualAvgInterest * (tdsRatePct / 100) : 0;
    const estimatedTotalTds = tdsTriggered ? totalInterest * (tdsRatePct / 100) : 0;

    return {
      type,
      amount: safeAmt,
      ratePct: safeRate,
      months: safeMonths,
      compounding,
      isSeniorCitizen,
      hasPan,
      invested,
      totalInterest,
      maturity,
      annualAvgInterest,
      effectiveAnnualYieldPct,
      tdsThreshold,
      tdsRatePct,
      tdsTriggered,
      estimatedAnnualTds,
      estimatedTotalTds,
      postTdsMaturity: Math.max(0, maturity - estimatedTotalTds),
      yearlySchedule,
    };
  }

  /* ==========================================================================
   * 6. HRA EXEMPTION ENGINE (OLD TAX REGIME ONLY — SEC 10(13A) / RULE 2A)
   * ======================================================================== */

  function calculateHRA({
    basicSalaryAnnual,
    daAnnual = 0,
    hraReceivedAnnual,
    rentPaidAnnual,
    isMetro = true,
  }) {
    const basic = Math.max(0, Number(basicSalaryAnnual) || 0);
    const da = Math.max(0, Number(daAnnual) || 0);
    const hraReceived = Math.max(0, Number(hraReceivedAnnual) || 0);
    const rentPaid = Math.max(0, Number(rentPaidAnnual) || 0);

    const salaryForHra = basic + da;
    const metroPct = isMetro ? 0.50 : 0.40;

    // Three statutory conditions under Rule 2A / Sec 10(13A) (Old Tax Regime only)
    const cond1ActualHra = hraReceived;
    const cond2RentMinus10Pct = Math.max(0, rentPaid - 0.10 * salaryForHra);
    const cond3CityLimit = metroPct * salaryForHra;

    const exemptHra =
      rentPaid > 0 && hraReceived > 0
        ? Math.min(cond1ActualHra, cond2RentMinus10Pct, cond3CityLimit)
        : 0;
    const taxableHra = Math.max(0, hraReceived - exemptHra);

    let bindingCondition = 'No Rent / Zero HRA Claimed';
    if (exemptHra > 0) {
      if (exemptHra === cond1ActualHra) bindingCondition = 'Condition 1: Actual HRA Received';
      else if (exemptHra === cond2RentMinus10Pct) bindingCondition = 'Condition 2: Rent Paid Minus 10% of (Basic + DA)';
      else bindingCondition = `Condition 3: ${isMetro ? '50% Metro' : '40% Non-Metro'} Salary Ceiling`;
    }

    const landlordPanRequired = rentPaid > 100000;
    const tds194IBApplicable = rentPaid > 600000; // > ₹50,000 per month

    return {
      basicSalaryAnnual: basic,
      daAnnual: da,
      salaryForHra,
      hraReceivedAnnual: hraReceived,
      rentPaidAnnual: rentPaid,
      isMetro,
      metroPct,
      cond1ActualHra,
      cond2RentMinus10Pct,
      cond3CityLimit,
      exemptHra,
      taxableHra,
      bindingCondition,
      landlordPanRequired,
      tds194IBApplicable,
    };
  }

  /* ==========================================================================
   * 7. NPS RETIREMENT & TAX DEDUCTION ENGINE (80CCD(1), 80CCD(1B), 80CCD(2))
   * ======================================================================== */

  function calculateNPS({
    currentAge = 30,
    retirementAge = 60,
    monthlyEmployeeContribution = 0,
    annualBasicPlusDa = 0,
    employerContribPct = 0,
    voluntaryAnnual80CCD1B = 0,
    sector = 'private', // 'private' | 'govt'
    expectedReturnPct = 10,
    annuitySharePct = 40,
    annuityRatePct = 6,
  }) {
    const safeAge = Math.max(18, Math.min(70, Math.round(Number(currentAge) || 30)));
    const safeRetireAge = Math.max(safeAge + 1, Math.min(75, Math.round(Number(retirementAge) || 60)));
    const years = safeRetireAge - safeAge;

    const monthlyEmp = Math.max(0, Number(monthlyEmployeeContribution) || 0);
    const basicDa = Math.max(0, Number(annualBasicPlusDa) || 0);
    const safeEmpPct = Math.max(0, Math.min(14, Number(employerContribPct) || 0));
    const annualVoluntary = Math.max(0, Number(voluntaryAnnual80CCD1B) || 0);

    const annualEmployeeContribution = monthlyEmp * 12;
    const annualEmployerContribution = basicDa * (safeEmpPct / 100);
    const totalAnnualDeposit = annualEmployeeContribution + annualEmployerContribution + annualVoluntary;

    // Statutory Tax Deductions across regimes
    const isGovtNps = sector === 'govt' || sector === 'government';
    const employerLimitNew = basicDa * 0.14; // Both Govt and Private enjoy 14% under New Regime
    const employerLimitOld = basicDa * (isGovtNps ? 0.14 : 0.10); // Private 10% Old Regime

    const newRegime80CCD2 = Math.min(annualEmployerContribution, employerLimitNew);
    const oldRegime80CCD2 = Math.min(annualEmployerContribution, employerLimitOld);

    // Employee regular contribution under 80CCD(1): up to 10% of Basic+DA (if provided) & within 80CCE ₹1.5L ceiling
    const max80CCD1BySalary = basicDa > 0 ? basicDa * 0.10 : annualEmployeeContribution;
    const oldRegime80CCD1 = Math.min(annualEmployeeContribution, max80CCD1BySalary, 150000);
    const oldRegime80CCD1B = Math.min(annualVoluntary, 50000);

    const totalOldRegimeDeduction = oldRegime80CCD1 + oldRegime80CCD1B + oldRegime80CCD2;
    const totalNewRegimeDeduction = newRegime80CCD2;

    // Monthly compounding accumulation projection
    const monthlyTotalDeposit = totalAnnualDeposit / 12;
    const monthlyRate = Math.max(0, Number(expectedReturnPct) || 0) / 12 / 100;
    let totalInvested = 0;
    let corpus = 0;
    const schedule = [];

    for (let yr = 1; yr <= years; yr++) {
      for (let m = 1; m <= 12; m++) {
        totalInvested += monthlyTotalDeposit;
        corpus = (corpus + monthlyTotalDeposit) * (1 + monthlyRate);
      }
      schedule.push({
        age: safeAge + yr,
        year: yr,
        cumulativeInvested: totalInvested,
        returns: Math.max(0, corpus - totalInvested),
        corpusValue: corpus,
      });
    }

    const safeAnnuityShare = Math.max(40, Math.min(100, Number(annuitySharePct) || 40));
    const lumpSumShare = 100 - safeAnnuityShare;
    const lumpSumCorpus = corpus * (lumpSumShare / 100);
    const annuityCorpus = corpus * (safeAnnuityShare / 100);
    const estimatedMonthlyPension = (annuityCorpus * (Math.max(0, Number(annuityRatePct) || 6) / 100)) / 12;

    return {
      currentAge: safeAge,
      retirementAge: safeRetireAge,
      years,
      sector,
      annualEmployeeContribution,
      annualEmployerContribution,
      annualVoluntary,
      totalAnnualDeposit,
      newRegime80CCD2,
      oldRegime80CCD1,
      oldRegime80CCD1B,
      oldRegime80CCD2,
      totalOldRegimeDeduction,
      totalNewRegimeDeduction,
      totalInvested,
      totalReturns: Math.max(0, corpus - totalInvested),
      totalCorpus: corpus,
      annuitySharePct: safeAnnuityShare,
      lumpSumSharePct: lumpSumShare,
      lumpSumCorpus,
      annuityCorpus,
      estimatedMonthlyPension,
      schedule,
    };
  }

  return {
    TAX_YEAR_CONFIG,
    GST_CATALOG,
    GST_SLABS_GST2,
    GST_SLABS_ALL,
    roundNearest10,
    roundPaisa,
    validateNumericInput,
    getOldRegimeSlabs,
    computeSlabBreakdown,
    calculateNewRegimeTax,
    calculateOldRegimeTax,
    compareTaxRegimes,
    calculateGST,
    calculateSIP,
    calculateFDRD,
    calculateHRA,
    calculateNPS,
  };
});
