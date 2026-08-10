import { createHash } from 'node:crypto';
import { open, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import Ajv from 'ajv';
import YAML from 'yaml';

const FRONTMATTER_LIMIT_BYTES = 256 * 1024;
const PUBLICATION_FIELDS = [
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
];

const CANDIDATE_USE_RE = /^uso_preconsulta\s*:\s*true\s*(?:#.*)?$/m;
const CANDIDATE_STATUS_RE = /^estado_clinico\s*:\s*["']?aprobado["']?\s*(?:#.*)?$/m;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const CURP_RE = /\b[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/i;
const RFC_RE = /\b[A-Z&N]{3,4}\d{6}[A-Z0-9]{3}\b/i;
const PHONE_RE = /(?:^|\D)(?:\+?52)?\d{10}(?:\D|$)/;
const MARKUP_RE = /<\/?[a-z][^>]*>|javascript\s*:/i;

export class ClinicalKnowledgeError extends Error {
  constructor(message, filePath = null) {
    super(filePath ? `${filePath}: ${message}` : message);
    this.name = 'ClinicalKnowledgeError';
    this.filePath = filePath;
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function extractFrontmatter(markdown) {
  const text = String(markdown).replace(/^\uFEFF/, '');
  const match = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  return match ? match[1] : null;
}

export function looksLikeApprovedCandidate(frontmatterText) {
  return Boolean(
    frontmatterText
    && CANDIDATE_USE_RE.test(frontmatterText)
    && CANDIDATE_STATUS_RE.test(frontmatterText)
  );
}

export function parseFrontmatter(frontmatterText, filePath = '<nota>') {
  const document = YAML.parseDocument(frontmatterText, {
    maxAliasCount: 0,
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });

  if (document.errors.length > 0) {
    const detail = document.errors.map((error) => error.message).join('; ');
    throw new ClinicalKnowledgeError(`frontmatter YAML invalido: ${detail}`, filePath);
  }

  const value = document.toJS({ maxAliasCount: 0 });
  if (!isPlainObject(value)) {
    throw new ClinicalKnowledgeError('el frontmatter debe ser un objeto YAML', filePath);
  }
  return value;
}

export function isApprovedForPreconsultation(frontmatter) {
  return frontmatter?.uso_preconsulta === true
    && frontmatter?.estado_clinico === 'aprobado';
}

function formatAjvErrors(errors = []) {
  return errors.map((error) => {
    const location = error.instancePath || '/';
    return `${location} ${error.message}`;
  }).join('; ');
}

export async function createNoteValidator(schemaPath) {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: true });
  return ajv.compile(schema);
}

function assertRealIsoDate(value, filePath) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const matches = date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
  if (!matches) {
    throw new ClinicalKnowledgeError('fecha_revision no es una fecha ISO valida', filePath);
  }
}

function assertUniqueIds(items, group, filePath) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new ClinicalKnowledgeError(`${group} contiene el id duplicado "${item.id}"`, filePath);
    }
    seen.add(item.id);
  }
  return seen;
}

function assertQuestionSemantics(note, filePath) {
  const questionIds = assertUniqueIds(note.preguntas, 'preguntas', filePath);
  assertUniqueIds(note.gatillos, 'gatillos', filePath);
  assertUniqueIds(note.banderas, 'banderas', filePath);

  for (const question of note.preguntas) {
    if (['numero', 'escala'].includes(question.tipo) && question.min >= question.max) {
      throw new ClinicalKnowledgeError(
        `pregunta "${question.id}": min debe ser menor que max`,
        filePath,
      );
    }
  }

  for (const trigger of note.gatillos) {
    if (!questionIds.has(trigger.pregunta_id)) {
      throw new ClinicalKnowledgeError(
        `gatillo "${trigger.id}" referencia una pregunta inexistente`,
        filePath,
      );
    }
    if (
      trigger.efecto.tipo === 'mostrar-pregunta'
      && !questionIds.has(trigger.efecto.destino)
    ) {
      throw new ClinicalKnowledgeError(
        `gatillo "${trigger.id}" muestra una pregunta inexistente`,
        filePath,
      );
    }
  }

  for (const flag of note.banderas) {
    if (!questionIds.has(flag.pregunta_id)) {
      throw new ClinicalKnowledgeError(
        `bandera "${flag.id}" referencia una pregunta inexistente`,
        filePath,
      );
    }
  }
}

function visitStrings(value, callback, pointer = '') {
  if (typeof value === 'string') {
    callback(value, pointer || '/');
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitStrings(item, callback, `${pointer}/${index}`));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      visitStrings(item, callback, `${pointer}/${key}`);
    }
  }
}

function assertNoPatientIdentifiers(entry, filePath) {
  visitStrings(entry, (value, pointer) => {
    if (EMAIL_RE.test(value)) {
      throw new ClinicalKnowledgeError(`posible correo personal en ${pointer}`, filePath);
    }
    if (CURP_RE.test(value)) {
      throw new ClinicalKnowledgeError(`posible CURP en ${pointer}`, filePath);
    }
    if (RFC_RE.test(value)) {
      throw new ClinicalKnowledgeError(`posible RFC en ${pointer}`, filePath);
    }
    if (PHONE_RE.test(value)) {
      throw new ClinicalKnowledgeError(`posible telefono personal en ${pointer}`, filePath);
    }
    if (MARKUP_RE.test(value)) {
      throw new ClinicalKnowledgeError(`HTML o esquema ejecutable no permitido en ${pointer}`, filePath);
    }
  });
}

function assertSafeSourceUrls(entry, filePath) {
  for (const source of entry.fuentes) {
    if (!source.url) continue;
    let url;
    try {
      url = new URL(source.url);
    } catch {
      throw new ClinicalKnowledgeError('la fuente contiene una URL invalida', filePath);
    }
    if (url.username || url.password) {
      throw new ClinicalKnowledgeError('las fuentes no pueden incluir credenciales en la URL', filePath);
    }
    const sensitiveParameters = ['token', 'key', 'secret', 'email', 'phone', 'patient', 'paciente'];
    for (const name of url.searchParams.keys()) {
      if (sensitiveParameters.some((candidate) => name.toLowerCase().includes(candidate))) {
        throw new ClinicalKnowledgeError(
          `la fuente contiene un parametro sensible: ${name}`,
          filePath,
        );
      }
    }
  }
}

function clonePublishedFields(note) {
  const result = {};
  for (const field of PUBLICATION_FIELDS) {
    result[field] = structuredClone(note[field]);
  }
  return result;
}

export function validateAndSelectNote(note, validator, filePath = '<nota>') {
  if (!isApprovedForPreconsultation(note)) return null;
  if (!validator(note)) {
    throw new ClinicalKnowledgeError(
      `contrato clinico invalido: ${formatAjvErrors(validator.errors)}`,
      filePath,
    );
  }

  assertRealIsoDate(note.fecha_revision, filePath);
  assertQuestionSemantics(note, filePath);

  const entry = clonePublishedFields(note);
  assertNoPatientIdentifiers(entry, filePath);
  assertSafeSourceUrls(entry, filePath);
  return entry;
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right, 'en'))
      .map((key) => [key, sortObjectKeys(value[key])]),
  );
}

export function stableJson(value, spaces = 0) {
  return JSON.stringify(sortObjectKeys(value), null, spaces);
}

function digest(value) {
  return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

export function createManifest(entries) {
  const withHashes = entries
    .map((entry) => ({ ...entry, content_hash: digest(entry) }))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));

  return {
    schema_version: 1,
    entry_count: withHashes.length,
    content_hash: digest(withHashes),
    entries: withHashes,
  };
}

async function listMarkdownFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files;
}

async function readFrontmatterPrefix(filePath) {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(FRONTMATTER_LIMIT_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).toString('utf8');
  } finally {
    await handle.close();
  }
}

export async function buildManifestFromVault({ vaultPath, schemaPath }) {
  const validator = await createNoteValidator(schemaPath);
  const markdownFiles = await listMarkdownFiles(vaultPath);
  const approvedEntries = [];
  const sourceById = new Map();

  for (const filePath of markdownFiles) {
    const prefix = await readFrontmatterPrefix(filePath);
    const frontmatterText = extractFrontmatter(prefix);
    if (
      frontmatterText === null
      && /^\uFEFF?---[ \t]*\r?\n/.test(prefix)
      && looksLikeApprovedCandidate(prefix)
    ) {
      throw new ClinicalKnowledgeError(
        `frontmatter aprobado sin cierre dentro de ${FRONTMATTER_LIMIT_BYTES} bytes`,
        filePath,
      );
    }
    if (!looksLikeApprovedCandidate(frontmatterText)) continue;

    const note = parseFrontmatter(frontmatterText, filePath);
    const entry = validateAndSelectNote(note, validator, filePath);
    if (!entry) continue;

    if (sourceById.has(entry.id)) {
      throw new ClinicalKnowledgeError(
        `id clinico duplicado "${entry.id}"; tambien aparece en ${sourceById.get(entry.id)}`,
        filePath,
      );
    }
    sourceById.set(entry.id, filePath);
    approvedEntries.push(entry);
  }

  return {
    manifest: createManifest(approvedEntries),
    stats: {
      markdownFiles: markdownFiles.length,
      approvedNotes: approvedEntries.length,
    },
  };
}

export function serializeManifest(manifest) {
  return `${stableJson(manifest, 2)}\n`;
}
