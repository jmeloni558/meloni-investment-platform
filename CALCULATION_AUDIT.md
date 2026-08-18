# Excel-to-Website Calculation Audit

Audit date: 2026-08-18

Source workbook: `Investment Property Analysis(3).xlsx`

## Scope

The website calculation engine was compared against the formulas in all seven workbook tabs:

1. Assumptions
2. Debt Service
3. Taxes From Operations
4. Taxes Due on Sale
5. Cash Flow Table
6. Amortization Schedule
7. Rate Buydown Comparison Tool

The audit covered acquisition and rent assumptions, rent growth, vacancy, operating expenses, depreciation, property appreciation, holding period, selling expenses, amortizing and interest-only debt, points, origination fees, operating taxes, sale taxes, after-tax equity reversion, IRR, NPV, direct capitalization, GRM and rate-buydown break-even.

## Baseline reconciliation

The website logic reconciles to the workbook baseline outputs within floating-point rounding:

- Year 1 Cap Rate: 6.163496144%
- Year 1 GRM: 8.761261261x
- IRR: 6.258791020%
- NPV: -$72,916.9165
- Direct Cap Value at 6.5%: $368,861.5385
- GRM Value at 8.35x: $370,740.00
- Taxes Due on Sale: $36,195.8921
- After-Tax Equity Reversion: $418,303.9948

## Regression cases

The reconstructed workbook formulas were tested against the website engine for the following cases:

- Baseline all-cash acquisition
- 80% LTV, 30-year amortizing mortgage
- Interest-only mortgage sold before the mortgage horizon
- Interest-only mortgage sold exactly at the mortgage horizon
- Interest-only mortgage sold after the mortgage horizon
- Mortgage points plus origination fee
- One-year disposition
- Negative property appreciation
- Two-unit property with different rent growth, vacancy and expense assumptions
- 40-year all-cash holding period

All tested calculations matched except the two issues described below.

## Issue 1 — Interest-only loan balance after mortgage horizon

### Workbook behavior

The workbook carries the full principal balance through the interest-only mortgage horizon. After the mortgage horizon, the Debt Service schedule reports the remaining balance as zero. Therefore:

- sale in or before the final mortgage year: full mortgage principal is deducted from sale proceeds;
- sale after the mortgage horizon: loan payoff is zero under the workbook convention.

### Previous website behavior

The website continued carrying the interest-only principal balance indefinitely after the mortgage horizon. This understated after-tax equity reversion and could materially understate IRR and NPV for a holding period longer than the mortgage horizon.

Example: $311,200 interest-only mortgage, 6.5%, 30-year horizon, sale in Year 31:

- Workbook/intended loan payoff: $0
- Previous website loan payoff: $311,200
- Workbook/intended IRR: 12.9683%
- Previous website IRR: 12.1742%
- Workbook/intended NPV: $42,784.90
- Previous website NPV: $26,571.79

### Fix

`engine-fidelity-fix.js` now sets the modeled interest-only balance to the mortgage amount through the mortgage horizon and to zero afterward, then recalculates loan payoff, after-tax equity reversion, total investment cash flows, IRR and NPV.

## Issue 2 — Rate Buydown break-even formula

### Workbook behavior

The workbook uses:

`NPER(Higher Rate / 12, Monthly Payment Savings, -Point Cost)`

For the workbook defaults ($200,000, 30 years, 7.0% versus 6.3%, 2 points):

- Monthly savings: $92.6594
- Point cost: $4,000
- Workbook break-even: 49.878 months / 4.1565 years

### Previous website behavior

The website used simple point cost divided by monthly savings, producing about 43.17 months. That did not match the workbook because it ignored the time value of the upfront point cost at the higher mortgage rate.

### Fix

The website now uses the workbook-equivalent NPER calculation.

## Source workbook defect discovered during audit

The original workbook contains a likely reference error in the `Assumptions` sheet's sale-year loan payoff row beginning with Year 26. Years 1–25 reference the matching Debt Service ending-balance row. Year 26 begins referencing the following year's balance instead:

- Year 25 (`AA49`) correctly references `Debt Service!E28`.
- Year 26 (`AB49`) references `Debt Service!E30`, but the sequential reference should be `Debt Service!E29`.
- Years 27–40 remain shifted by one row, with Year 40 ultimately referencing `E44` instead of `E43`.

The website was **not changed to reproduce this apparent workbook typo**. It continues using the correct ending mortgage balance for the actual sale year.

## Result

With the interest-only horizon and rate-buydown corrections applied, the website calculation logic matches the intended workbook methodology across the audited operating, financing, tax, valuation and return calculations, subject to the documented source-workbook Year 26–40 loan-payoff reference defect.
