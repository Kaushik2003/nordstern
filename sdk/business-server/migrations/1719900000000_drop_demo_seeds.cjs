/* eslint-disable camelcase */

// R6 follow-up — remove the demo/placeholder rows the baseline seeded into the money DB.
// The Operator Console must show ONLY real activity; seeded fake compliance cases, audit
// entries, and API keys violate that. We target the EXACT seeded rows (by their known
// deterministic identifiers/hashes) so no genuine operator data is ever touched. Deleting
// only the seed rows on a fresh anchor leaves clean, empty tables; on an anchor that has
// since recorded real rows, only the seeds are removed.

exports.up = (pgm) => {
  // Demo compliance cases (CASE-4117..CASE-4120).
  pgm.sql(`DELETE FROM nordstern.compliance_cases
           WHERE id IN ('CASE-4117','CASE-4118','CASE-4119','CASE-4120');`);

  // Demo API keys (the committed placeholder secrets).
  pgm.sql(`DELETE FROM nordstern.api_keys
           WHERE secret IN ('ns_live_abc123xyz7890pqrstuvw','ns_test_def456uvw1234lmnopoqr');`);

  // Demo audit-log genesis chain (5 seeded rows), targeted by their exact seed hashes so
  // only the placeholder chain is removed. Real audit entries start fresh from genesis.
  pgm.sql(`DELETE FROM nordstern.audit_logs
           WHERE hash IN ('57d4e31ceaff946a','400e10eb55576017','0d62a22c71675bbd','d824f07e2b4ad0e2','937210c0c364035c');`);
};

// Down is intentionally a no-op: we do not want the placeholder demo data back.
exports.down = () => {};
