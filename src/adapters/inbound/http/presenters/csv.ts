import type { ReportRows } from '../../../../application/use-cases/reports';
import { translateText, type Locale } from '../../../../shared/i18n/messages';
export function presentCsv(rows: ReportRows, kind: string, locale: Locale = 'en') {
    const cell = (value: unknown) => `"${String(typeof value === 'string' && /^[=+@-]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
    return rows.map((row, index) => row.map((value, column) => cell(index === 0 || (kind === 'orders' && column === 1) || (kind === 'materials' && column === 1) || value === 'Allocated to service orders only' ? translateText(locale, String(value)) : value)).join(',')).join('\r\n') + '\r\n';
}
