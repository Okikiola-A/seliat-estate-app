// AdminDashboard's data tables are built with CSS Grid rather than a plain
// HTML table. The reason: table-layout:fixed requires guessing every
// column's width up front, and that guess never held up across different
// content lengths and screen sizes — several rounds of tuning proved it.
// Grid's `auto` track sizing does this correctly instead: for a column
// given `auto`, the browser measures the actual rendered content across
// every cell in that column (header included) and sizes the track to fit
// it exactly — no guessing, and it's correct on any device by
// construction. Columns given `minmax(0, Nfr)` are the flexible ones
// (names, addresses, detail text) that absorb whatever space is left;
// the `minmax(0, ...)` (paired with min-width:0/overflow:hidden on the
// cells themselves) stops long unbroken content in those columns from
// forcing the column wider than its share — same guarantee
// table-layout:fixed gave us for TruncatedText, without the up-front
// width guessing that came with it.
export const responsiveTableCSS = `
  .grid-table-card {
    overflow: hidden;
  }
  .grid-table {
    display: grid;
    width: 100%;
  }
  .grid-row {
    display: contents;
  }
  .grid-cell {
    padding: 0.7rem 0.75rem;
    display: flex;
    align-items: center;
    min-width: 0;
    overflow: hidden;
  }
  .grid-header-cell {
    padding: 0.6rem 0.75rem;
    display: flex;
    align-items: center;
    font-weight: 700;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 480px) {
    .grid-cell {
      padding: 0.55rem 0.45rem;
      font-size: 0.78rem;
    }
    .grid-header-cell {
      padding: 0.45rem 0.45rem;
      font-size: 0.6rem;
    }
  }
`