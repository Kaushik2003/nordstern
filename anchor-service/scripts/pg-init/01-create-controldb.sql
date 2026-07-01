-- Creates the control-plane database if it doesn't exist.
-- PostgreSQL's CREATE DATABASE cannot run inside a transaction block,
-- so we use DO $$ with a check instead.
SELECT 'CREATE DATABASE controldb OWNER anchor'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'controldb')
\gexec
