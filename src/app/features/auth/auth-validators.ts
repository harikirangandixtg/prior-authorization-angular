import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** @xtglobal.com, subdomains allowed (jane@xtglobal.com, jane@us.xtglobal.com). */
const EMAIL_RE = /^[^\s@]+@([a-z0-9-]+\.)*xtglobal\.com$/i;
const ALLOWED_CHARS = /^[A-Za-z0-9@#$%^&*!?\-_.]+$/;

export const emailDomain: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  !c.value || EMAIL_RE.test(String(c.value).trim()) ? null : { domain: true };

export function passwordChecks(pw: string): { label: string; ok: boolean }[] {
  return [
    { label: '8 to 128 characters', ok: pw.length >= 8 && pw.length <= 128 },
    { label: 'At least one letter', ok: /[A-Za-z]/.test(pw) },
    { label: 'At least one number', ok: /\d/.test(pw) },
    { label: 'Only letters, numbers and @ # $ % ^ & * ! ? - _ .', ok: pw.length > 0 && ALLOWED_CHARS.test(pw) },
  ];
}

export const strongPassword: ValidatorFn = (c) =>
  !c.value || passwordChecks(String(c.value)).every((r) => r.ok) ? null : { weak: true };

export const passwordsMatch =
  (a: string, b: string): ValidatorFn =>
  (g) => (g.get(a)?.value === g.get(b)?.value ? null : { mismatch: true });
