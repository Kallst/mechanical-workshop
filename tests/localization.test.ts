import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { migrationChecksums } from '../scripts/migration-checksum';
import { translateText as t, spanish } from '../src/i18n/messages';

test('migration checksums accept existing Windows and Unix line endings but reject changed SQL', () => {
  const lf = 'CREATE TABLE sample(id integer);\nSELECT 1;\n';
  const crlf = lf.replaceAll('\n', '\r\n');
  assert.equal(migrationChecksums(lf).canonical, migrationChecksums(crlf).canonical);
  assert.ok(migrationChecksums(lf).accepted.has(createHash('sha256').update(crlf).digest('hex')));
  assert.ok(!migrationChecksums(lf.replace('SELECT 1','SELECT 2')).accepted.has(migrationChecksums(lf).canonical));
});
test('locale switching preserves proper names, identifiers, user content and English payload vocabulary', () => {
  for(const name of ['Brian','Nicolás','Álan','Tamara','Juan Jacobo','Anderson','Juanita','SO-1042','TRK-042','Custom service']) assert.equal(t('es',name),name);
  for(const [english,spanishValue] of Object.entries(spanish)) {
    assert.equal(t('es',english),spanishValue);
    assert.ok(spanishValue.trim().length>0);
  }
  assert.equal(t('en','Ready for review'),'Ready for review');
  assert.equal(t('es','Ready for review'),'En revisión');
  assert.equal(t('es','Enter a valid signed number with at most 3 decimal places.'),'Ingresa un número con signo con máximo 3 decimales.');
  assert.equal(t('es','Customer name must contain 2–100 characters.'),'Nombre del cliente debe tener entre 2 y 100 caracteres.');
  assert.equal(t('es','Reorder policy · Heavy-duty oil filter'),'Reposición · Filtro de aceite de servicio pesado');
  assert.equal(t('es','Your private workspace code is demo-123. Keep it for your next sign-in.'),'Tu código es demo-123. Guárdalo para volver a ingresar.');
  assert.equal(t('en','order.close'),'Order closed');
});
