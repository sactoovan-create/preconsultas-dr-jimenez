import React from 'react';
import { Activity, Bone, HeartPulse, Droplet, Waves, Ribbon, Sun, ShieldCheck, Flower2, RefreshCw, ClipboardList } from 'lucide-react';
import { areaClinica, estiloArea } from './areasClinicas.js';
import './areasClinicas.css';
const ICONOS = { activity: Activity, bone: Bone, heart: HeartPulse, drop: Droplet, waves: Waves, ribbon: Ribbon, sun: Sun, shield: ShieldCheck, flower: Flower2, cycle: RefreshCw, clipboard: ClipboardList };
export default function AreaClinica({ id, corta = false }) {
  const area = areaClinica(id), Icono = ICONOS[area.icono];
  return <span className="area-identidad" style={estiloArea(id)}><Icono size={16} aria-hidden="true" />{!corta && <span>{area.nombre}</span>}</span>;
}
