#!/usr/bin/env node
/**
 * Standalone reproduction for the devmode database routing bug.
 *
 * It exercises the same query() path used by POST /api/v1/errors/report
 * (src/controllers/errorReportController.js -> insertErrorLog -> query)
 * with devmode=false and devmode=true, then checks which physical database
 * received each row.
 */

import sql from 'mssql';
import config from '../src/config/index.js';
import { query, closeDb } from '../src/config/db.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const describeDb = (label, cfg) =>
  `${label}: ${cfg.user}@${cfg.server}:${cfg.port || 1433}/${cfg.database}`;

const openPool = async (server, database) => {
  const pool = new sql.ConnectionPool({
    server,
    database,
    user: config.db.prod.user,
    password: config.db.prod.password,
    options: { encrypt: false, trustServerCertificate: true },
  });
  await pool.connect();
  return pool;
};

const findMarker = async (server, database, errorMessage) => {
  const pool = await openPool(server, database);
  try {
    const result = await pool
      .request()
      .input('error_message', sql.NVarChar(sql.MAX), errorMessage)
      .query(
        'SELECT id, url, error_message, @@SERVERNAME AS server_name FROM dbo.logging_mike WHERE error_message = @error_message'
      );
    return result.recordset[0] ?? null;
  } finally {
    await pool.close();
  }
};

const markerMessage = (devmode) => `Reproduction marker: devmode=${devmode}`;

const insertMarker = async (devmode, label) => {
  const sqlText = `
    INSERT INTO dbo.logging_mike (
      request_body, headers, userid, delegatedto, createdAt, updatedAt,
      method, url, auth_token, error_message, error_stack, status_code
    )
    OUTPUT INSERTED.id
    VALUES (
      @request_body, @headers, @userid, @delegatedto,
      SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(),
      @method, @url, @auth_token, @error_message, @error_stack, @status_code
    )
  `;
  const params = {
    request_body: JSON.stringify({ reproduction: label }),
    headers: JSON.stringify({ 'x-repro': label }),
    userid: 'REPRO',
    delegatedto: 'REPRO',
    method: 'POST',
    url: `http://repro.local/api/v1/errors/report${devmode ? '?devmode=true' : ''}`,
    auth_token: null,
    error_message: markerMessage(devmode),
    error_stack: 'Reproduction stack',
    status_code: 500,
  };
  const rows = await query(sqlText, params, devmode);
  return rows[0]?.id ?? null;
};

const main = async () => {
  console.log('--- DevLogger DB routing reproduction ---\n');
  console.log('Resolved config:');
  console.log(`  ${describeDb('prod', config.db.prod)}`);
  console.log(`  ${describeDb('dev ', config.db.dev)}\n`);

  if (
    config.db.prod.server === config.db.dev.server &&
    config.db.prod.database === config.db.dev.database
  ) {
    console.warn(
      'WARNING: prod and dev configs resolve to the SAME server/database.\n'
    );
  }

  const prodServer = config.db.prod.server;
  const prodDatabase = config.db.prod.database;
  const devServer = config.db.dev.server;
  const devDatabase = config.db.dev.database;

  const prodMessage = markerMessage(false);
  const devMessage = markerMessage(true);
  let prodId;
  let devId;

  try {
    console.log('Inserting marker with devmode=false (should go to prod)...');
    prodId = await insertMarker(false, 'prod-mode');
    console.log(`  inserted id=${prodId}`);

    console.log('Inserting marker with devmode=true (should go to dev)...');
    devId = await insertMarker(true, 'dev-mode');
    console.log(`  inserted id=${devId}\n`);

    // Give the DB a moment to settle.
    await sleep(500);

    console.log('Checking prod database for the two markers...');
    const prodHasProdMarker = await findMarker(
      prodServer,
      prodDatabase,
      prodMessage
    );
    const prodHasDevMarker = await findMarker(
      prodServer,
      prodDatabase,
      devMessage
    );
    console.log(
      `  devmode=false marker present: ${prodHasProdMarker ? 'YES' : 'NO'}`
    );
    console.log(
      `  devmode=true marker present: ${prodHasDevMarker ? 'YES' : 'NO'}`
    );

    console.log('Checking dev database for the two markers...');
    const devHasProdMarker = await findMarker(
      devServer,
      devDatabase,
      prodMessage
    );
    const devHasDevMarker = await findMarker(
      devServer,
      devDatabase,
      devMessage
    );
    console.log(
      `  devmode=false marker present: ${devHasProdMarker ? 'YES' : 'NO'}`
    );
    console.log(
      `  devmode=true marker present: ${devHasDevMarker ? 'YES' : 'NO'}\n`
    );

    const prodOnlyGotProd = prodHasProdMarker && !prodHasDevMarker;
    const devOnlyGotDev = devHasDevMarker && !devHasProdMarker;

    if (prodOnlyGotProd && devOnlyGotDev) {
      console.log(
        'RESULT: PASS — devmode=false wrote to prod, devmode=true wrote to dev.'
      );
      process.exitCode = 0;
    } else {
      console.log('RESULT: FAIL — routing does not match devmode flag.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Reproduction failed with error:', error.message);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    // Clean up our markers from whichever database(s) they landed in.
    const cleanup = async (server, database, errorMessage) => {
      try {
        const pool = await openPool(server, database);
        try {
          await pool
            .request()
            .input('error_message', sql.NVarChar(sql.MAX), errorMessage)
            .query(
              'DELETE FROM dbo.logging_mike WHERE error_message = @error_message'
            );
        } finally {
          await pool.close();
        }
      } catch {
        // Ignore cleanup errors so the report still reflects the routing result.
      }
    };

    await cleanup(prodServer, prodDatabase, prodMessage);
    await cleanup(prodServer, prodDatabase, devMessage);
    await cleanup(devServer, devDatabase, prodMessage);
    await cleanup(devServer, devDatabase, devMessage);

    await closeDb();
  }
};

main();
