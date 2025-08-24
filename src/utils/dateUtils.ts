import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const ROME_TIMEZONE = 'Europe/Rome';

export const formatRomeDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  return formatInTimeZone(
    dateObj,
    ROME_TIMEZONE,
    'dd/MM/yyyy \'alle\' HH:mm',
    { locale: it }
  );
};

export const formatRomeDateTimeShort = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  return formatInTimeZone(
    dateObj,
    ROME_TIMEZONE,
    'dd/MM HH:mm',
    { locale: it }
  );
};