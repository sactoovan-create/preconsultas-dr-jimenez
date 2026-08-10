#!/usr/bin/env node

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildManifestFromVault,
  ClinicalKnowledgeError,
  serializeManifest,
} from './lib/clinicalKnowledge.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const defaultVault = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'iCloud~md~obsidian',
  'Documents',
  'Boveda - Dr. Ivan Jimenez Martinez',
);

function usage() {
  return `Uso:
  npm run knowledge:build -- [--vault RUTA] [--output RUTA]
  npm run knowledge:check -- [--vault RUTA] [--output RUTA]

Opciones:
  --vault   Vault de Obsidian. Tambien acepta OBSIDIAN_VAULT.
  --output  Manifiesto de salida (por defecto clinical-knowledge/manifest.json).
  --check   No escribe; falla si el manifiesto versionado esta desactualizado.
  --help    Muestra esta ayuda.
`;
}

function parseArguments(argv) {
  const options = {
    check: false,
    output: path.join(projectRoot, 'clinical-knowledge', 'manifest.json'),
    vault: process.env.OBSIDIAN_VAULT || defaultVault,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') {
      options.check = true;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--vault' || argument === '--output') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new ClinicalKnowledgeError(`falta el valor de ${argument}`);
      }
      options[argument.slice(2)] = path.resolve(value);
      index += 1;
    } else {
      throw new ClinicalKnowledgeError(`opcion desconocida: ${argument}`);
    }
  }
  return options;
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const schemaPath = path.join(projectRoot, 'clinical-knowledge', 'schema.json');
  const { manifest, stats } = await buildManifestFromVault({
    vaultPath: options.vault,
    schemaPath,
  });
  const output = serializeManifest(manifest);

  if (options.check) {
    let current;
    try {
      current = await readFile(options.output, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new ClinicalKnowledgeError(
          `no existe ${options.output}; ejecuta npm run knowledge:build`,
        );
      }
      throw error;
    }
    if (current !== output) {
      throw new ClinicalKnowledgeError(
        'el manifiesto esta desactualizado; ejecuta npm run knowledge:build y revisa el diff',
      );
    }
    process.stdout.write(
      `Manifiesto vigente: ${stats.approvedNotes} notas aprobadas de ${stats.markdownFiles} Markdown.\n`,
    );
    return;
  }

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, output, 'utf8');
  process.stdout.write(
    `Manifiesto escrito: ${stats.approvedNotes} notas aprobadas de ${stats.markdownFiles} Markdown.\n`,
  );
}

run().catch((error) => {
  const prefix = error instanceof ClinicalKnowledgeError ? 'Conocimiento clinico' : 'Error inesperado';
  process.stderr.write(`${prefix}: ${error.message}\n`);
  process.exitCode = 1;
});
