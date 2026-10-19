import fs from 'node:fs/promises';
import { parse } from '@babel/parser';
import { ENTREVISTA } from '../core/entrevista.js';
import { MODULOS } from '../core/profundos/index.js';
import { FORMULARIO_VERSION } from '../core/preconsultaFlow.js';
import { phq9, csi, PENDIENTES } from '../core/cuestionarios/index.js';

// Inventario reproducible del código, no una extracción de respuestas clínicas.
const codigo = await fs.readFile(new URL('../PreConsulta.jsx', import.meta.url), 'utf8');
const ast = parse(codigo, {sourceType:'module', plugins:['jsx']});
const base = [], mrs = [];
function texto(n) { return n?.type === 'StringLiteral' ? n.value : n?.type === 'JSXExpressionContainer' ? texto(n.expression) : null; }
function recorrer(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'JSXOpeningElement' && ['CampoNumero','CampoTexto','CampoSelect','GrupoMultiple','GrupoOpciones','EscalaNumerica'].includes(n.name?.name)) {
    const atr = id => n.attributes.find(a=>a.name?.name === id)?.value;
    const etiqueta = texto(atr('etiqueta'));
    if (etiqueta) base.push({ etiqueta, control:n.name.name, id:texto(atr('id')), archivo:'PreConsulta.jsx', linea:n.loc.start.line,
      valor:atr('valor') ? codigo.slice(atr('valor').start,atr('valor').end) : null });
  }
  if (n.type==='VariableDeclarator' && n.id?.name==='MRS') for(const item of n.init.elements) mrs.push({id:item.elements[0].value,etiqueta:item.elements[1].value});
  for(const v of Object.values(n)) if(Array.isArray(v)) v.forEach(recorrer); else if(v && typeof v==='object') recorrer(v);
}
recorrer(ast);
const dirigida = Object.entries(ENTREVISTA).flatMap(([grupo,m])=>m.preguntas.map(q=>({grupo,fuenteObsidian:m.fuente || 'Matriz clínica 2026-09-10',id:q.id,etiqueta:q.etiqueta,tipo:q.tipo,
  opciones:q.opciones || null,min:q.min??null,max:q.max??null,condicional:!!q.mostrarSi,obligatoria:false})));
const complementarias = MODULOS.flatMap(m=>m.PREGUNTAS.map(q=>({modulo:m.ID,id:q.id,texto:q.texto,tipo:q.tipo,condicional:!!q.mostrarSi,fuente:m.FUENTE,validacion:'Adaptación local, no acreditada como instrumento oficial'})));
// Cuestionarios validados (2026.10.1): texto oficial, opciones y licencia.
const validados = [
  ...[...phq9.ITEMS, phq9.DIFICULTAD].map(q=>({cuestionario:phq9.CLAVE,id:q.id,texto:q.texto,opciones:(q.opciones||phq9.OPCIONES).map(o=>[o.valor,o.etiqueta]),puntua:q.id!=='dificultad',fuente:phq9.FUENTE,licencia:'Sin permiso requerido (manual PHQ, Pfizer)'})),
  ...csi.ITEMS_A.map(q=>({cuestionario:csi.CLAVE,id:q.id,texto:q.texto,opciones:csi.OPCIONES.map(o=>[o.valor,o.etiqueta]),puntua:true,fuente:csi.FUENTE,licencia:'CC BY 4.0; '+csi.CAMBIOS})),
  ...csi.ITEMS_B.map(q=>({cuestionario:csi.CLAVE,id:q.id,texto:q.texto,opciones:csi.OPCIONES_B.map(o=>[o.valor,o.etiqueta]),puntua:false,fuente:csi.FUENTE,licencia:'CC BY 4.0; '+csi.CAMBIOS})),
];
const pendientesLicencia = PENDIENTES.map(m=>({clave:m.CLAVE,nombre:m.NOMBRE,estado:m.ESTADO,textoIncluido:false}));
const inventario = { formulario:FORMULARIO_VERSION, alcance:'Captura base, 11 dominios de síntomas, entrevista dirigida, módulos complementarios y cuestionarios validados; excluye consentimiento, honeypot y controles de navegación. No es conteo de preguntas obligatorias ni certificación clínica.',
  conteo:{controlesBase:base.length,mrs:mrs.length,entrevistaDirigida:dirigida.length,complementarias:complementarias.length,validados:validados.length,pendientesLicencia:pendientesLicencia.length},base,mrs,dirigida,complementarias,validados,pendientesLicencia};
const salida = new URL('../docs/INVENTARIO-PREGUNTAS-2026-09.json',import.meta.url);
const contenido=JSON.stringify(inventario,null,2)+'\n';
if(process.argv.includes('--check')) {
  if(await fs.readFile(salida,'utf8')!==contenido) throw Error('Inventario desactualizado');
} else await fs.writeFile(salida,contenido);
console.log(JSON.stringify(inventario.conteo));
