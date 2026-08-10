import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildManifestFromVault,
  createManifest,
  createNoteValidator,
  extractFrontmatter,
  looksLikeApprovedCandidate,
  parseFrontmatter,
  serializeManifest,
  validateAndSelectNote,
} from '../scripts/lib/clinicalKnowledge.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(projectRoot, 'clinical-knowledge', 'schema.json');
const validator = await createNoteValidator(schemaPath);

let passed = 0;
let failed = 0;

async function test(name, callback) {
  try {
    await callback();
    passed += 1;
    console.log(`  PASA  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FALLA ${name}`);
    console.error(error);
  }
}

function validFrontmatter(id = 'dolor-pelvico-base') {
  return `
id: ${id}
uso_preconsulta: true
estado_clinico: aprobado
version: "1.0.0"
fecha_revision: 2026-08-10
area: dolor-pelvico
titulo: "Este campo extra no se publica"
preguntas:
  - id: dolor-intensidad
    texto: "Indique la intensidad del dolor"
    tipo: escala
    requerida: false
    min: 0
    max: 10
gatillos:
  - id: dolor-intenso
    pregunta_id: dolor-intensidad
    operador: mayor-o-igual
    valor: 8
    efecto:
      tipo: marcar-revision-medica
      destino: dolor-prioritario
banderas:
  - id: revisar-dolor-intenso
    pregunta_id: dolor-intensidad
    operador: mayor-o-igual
    valor: 8
    prioridad: alta
    mensaje_medico: "Revisar el patron y la evolucion en consulta"
fuentes:
  - titulo: "Guia clinica de ejemplo para validar el contrato"
    anio: 2025
    url: "https://example.org/guia-clinica"
`;
}

function approvedMarkdown(id, body = '# Contenido no publicable') {
  return `---${validFrontmatter(id)}---\n${body}\n`;
}

function parsedValidNote(id = 'dolor-pelvico-base') {
  return parseFrontmatter(validFrontmatter(id));
}

console.log('Conocimiento clinico · seleccion y privacidad');

await test('solo reconoce los dos sellos de aprobacion juntos', () => {
  assert.equal(looksLikeApprovedCandidate(validFrontmatter()), true);
  assert.equal(
    looksLikeApprovedCandidate(validFrontmatter().replace('estado_clinico: aprobado', 'estado_clinico: borrador')),
    false,
  );
  assert.equal(
    looksLikeApprovedCandidate(validFrontmatter().replace('uso_preconsulta: true', 'uso_preconsulta: false')),
    false,
  );
});

await test('extrae solo el frontmatter inicial', () => {
  const markdown = approvedMarkdown('extraccion-segura', 'Paciente Ejemplo no debe salir');
  const frontmatter = extractFrontmatter(markdown);
  assert.match(frontmatter, /id: extraccion-segura/);
  assert.doesNotMatch(frontmatter, /Paciente Ejemplo/);
});

await test('selecciona unicamente los campos permitidos', () => {
  const entry = validateAndSelectNote(parsedValidNote(), validator);
  assert.equal(entry.id, 'dolor-pelvico-base');
  assert.equal('titulo' in entry, false);
  assert.deepEqual(Object.keys(entry), [
    'id',
    'uso_preconsulta',
    'estado_clinico',
    'version',
    'fecha_revision',
    'area',
    'preguntas',
    'gatillos',
    'banderas',
    'fuentes',
  ]);
});

console.log('Conocimiento clinico · validacion del contrato');

await test('rechaza version no semantica, fecha imposible y area no normalizada', () => {
  const invalidVersion = parsedValidNote();
  invalidVersion.version = 1;
  assert.throws(() => validateAndSelectNote(invalidVersion, validator), /version/);

  const invalidDate = parsedValidNote();
  invalidDate.fecha_revision = '2026-02-30';
  assert.throws(() => validateAndSelectNote(invalidDate, validator), /fecha_revision/);

  const invalidArea = parsedValidNote();
  invalidArea.area = 'Dolor pelvico';
  assert.throws(() => validateAndSelectNote(invalidArea, validator), /area/);
});

await test('exige los cuatro arrays y al menos una fuente', () => {
  for (const field of ['preguntas', 'gatillos', 'banderas', 'fuentes']) {
    const note = parsedValidNote();
    note[field] = {};
    assert.throws(() => validateAndSelectNote(note, validator), new RegExp(field));
  }

  const withoutSources = parsedValidNote();
  withoutSources.fuentes = [];
  assert.throws(() => validateAndSelectNote(withoutSources, validator), /fuentes/);
});

await test('rechaza IDs duplicados y referencias clinicas rotas', () => {
  const duplicate = parsedValidNote();
  duplicate.preguntas.push(structuredClone(duplicate.preguntas[0]));
  assert.throws(() => validateAndSelectNote(duplicate, validator), /id duplicado/);

  const brokenReference = parsedValidNote();
  brokenReference.gatillos[0].pregunta_id = 'pregunta-inexistente';
  assert.throws(() => validateAndSelectNote(brokenReference, validator), /pregunta inexistente/);
});

await test('rechaza rangos incoherentes y contenido ejecutable', () => {
  const badRange = parsedValidNote();
  badRange.preguntas[0].min = 10;
  badRange.preguntas[0].max = 5;
  assert.throws(() => validateAndSelectNote(badRange, validator), /min debe ser menor/);

  const markup = parsedValidNote();
  markup.preguntas[0].texto = '<script>alert(1)</script>';
  assert.throws(() => validateAndSelectNote(markup, validator), /HTML/);
});

await test('detiene posibles identificadores de paciente en lo publicable', () => {
  const email = parsedValidNote();
  email.preguntas[0].ayuda = 'Enviar a persona@example.com';
  assert.throws(() => validateAndSelectNote(email, validator), /correo personal/);

  const phone = parsedValidNote();
  phone.banderas[0].mensaje_medico = 'Llamar al 5512345678';
  assert.throws(() => validateAndSelectNote(phone, validator), /telefono personal/);
});

console.log('Conocimiento clinico · manifiesto determinista');

await test('ordena entradas, conserva orden clinico y genera hashes estables', () => {
  const first = validateAndSelectNote(parsedValidNote('zeta-conocimiento'), validator);
  const second = validateAndSelectNote(parsedValidNote('alfa-conocimiento'), validator);
  const manifestA = createManifest([first, second]);
  const manifestB = createManifest([second, first]);

  assert.equal(serializeManifest(manifestA), serializeManifest(manifestB));
  assert.deepEqual(manifestA.entries.map((entry) => entry.id), [
    'alfa-conocimiento',
    'zeta-conocimiento',
  ]);
  assert.match(manifestA.content_hash, /^sha256:[a-f0-9]{64}$/);
  assert.match(manifestA.entries[0].content_hash, /^sha256:[a-f0-9]{64}$/);
});

await test('compila un vault sin copiar cuerpo, rutas ni notas no aprobadas', async () => {
  const vault = await mkdtemp(path.join(os.tmpdir(), 'clinical-knowledge-'));
  try {
    await writeFile(
      path.join(vault, 'zeta.md'),
      approvedMarkdown('zeta-conocimiento', 'Paciente Privada Ejemplo 5511112222'),
      'utf8',
    );
    await writeFile(
      path.join(vault, 'alfa.md'),
      approvedMarkdown('alfa-conocimiento', 'Otro cuerpo privado'),
      'utf8',
    );
    await writeFile(
      path.join(vault, 'borrador.md'),
      approvedMarkdown('nota-borrador').replace('estado_clinico: aprobado', 'estado_clinico: borrador'),
      'utf8',
    );

    const first = await buildManifestFromVault({ vaultPath: vault, schemaPath });
    const second = await buildManifestFromVault({ vaultPath: vault, schemaPath });
    const serialized = serializeManifest(first.manifest);

    assert.equal(first.stats.markdownFiles, 3);
    assert.equal(first.stats.approvedNotes, 2);
    assert.equal(serialized, serializeManifest(second.manifest));
    assert.doesNotMatch(serialized, /Paciente Privada|Otro cuerpo|nota-borrador/);
    assert.doesNotMatch(serialized, new RegExp(vault.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    await rm(vault, { recursive: true, force: true });
  }
});

await test('detiene IDs repetidos entre notas aprobadas', async () => {
  const vault = await mkdtemp(path.join(os.tmpdir(), 'clinical-knowledge-'));
  try {
    await writeFile(path.join(vault, 'uno.md'), approvedMarkdown('id-repetido'), 'utf8');
    await writeFile(path.join(vault, 'dos.md'), approvedMarkdown('id-repetido'), 'utf8');
    await assert.rejects(
      buildManifestFromVault({ vaultPath: vault, schemaPath }),
      /id clinico duplicado/,
    );
  } finally {
    await rm(vault, { recursive: true, force: true });
  }
});

await test('no omite en silencio un frontmatter aprobado sin cierre', async () => {
  const vault = await mkdtemp(path.join(os.tmpdir(), 'clinical-knowledge-'));
  try {
    await writeFile(
      path.join(vault, 'incompleta.md'),
      `---${validFrontmatter('nota-sin-cierre')}\n# Falta el delimitador final`,
      'utf8',
    );
    await assert.rejects(
      buildManifestFromVault({ vaultPath: vault, schemaPath }),
      /frontmatter aprobado sin cierre/,
    );
  } finally {
    await rm(vault, { recursive: true, force: true });
  }
});

console.log(`\nResultado conocimiento clinico: ${passed} pasan, ${failed} fallan.`);
if (failed > 0) process.exitCode = 1;
