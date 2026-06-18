import { z } from 'zod';

// Cédula (10 dígitos) o RUC (13 dígitos), solo números
export const identificacionEcSchema = z
  .string()
  .regex(/^\d{10}$|^\d{13}$/, 'Debe tener 10 dígitos (cédula) o 13 dígitos (RUC)');

// Teléfono Ecuador / Colombia: 7–15 dígitos, acepta +, espacios, guiones y paréntesis
export const phoneSchema = z
  .string()
  .regex(
    /^[\+]?[\d\s\-\(\)]{7,15}$/,
    'Formato inválido. Ej: 0991234567 o +593991234567'
  );

// Email — solo si el campo tiene contenido
export const emailSchema = z.string().email('Correo electrónico inválido');

// Orden de servicio — máximo 50 caracteres
export const serviceOrderSchema = z
  .string()
  .max(50, 'La orden de servicio no puede superar 50 caracteres');
