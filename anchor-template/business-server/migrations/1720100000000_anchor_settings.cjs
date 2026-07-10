/* eslint-disable */
// Per-anchor runtime settings (key/value). Lets the operator update things that were previously
// only set at provisioning (e.g. the brand logo) without recreating the container. Small and open.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS nordstern.anchor_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS nordstern.anchor_settings;`);
};
