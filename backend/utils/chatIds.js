/** Normalize IDs from JWT / JSON / Postgres so comparisons and inserts stay consistent. */
function toInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function sameId(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return Number(a) === Number(b);
}

module.exports = { toInt, sameId };
