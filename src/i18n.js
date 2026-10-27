/**
 * The bundle's own strings.
 *
 * The previous version had all eight of them hard-coded in Czech, which is the reason the
 * addon could not be sold to a Slovak or Hungarian shop at all.
 */

import { language } from './shoptet.js';

const MESSAGES = {
  cs: {
    locale: 'cs-CZ',
    preorder: 'Předobjednat',
    presale: 'Předprodej',
    presaleLabel: 'Předobjednávka',
    presaleInfoLead: 'Zatím není skladem.',
    presaleInfoTail: 'Objednávku vyřídíme hned, jakmile bude zboží naskladněno.',
    ended: 'Předprodej skončil',
    endsIn: 'Do konce předprodeje',
    endsAt: 'Končí {date} v {time}',
    code: 'Kód',
    copyCode: 'Zkopírovat kód',
    copyShort: 'Kopírovat',
    copied: 'Zkopírováno',
    copyFailed: 'Zkopírujte kód ručně',
    discountShort: 'Sleva {percent} %',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    daysLong: 'dní',
    hoursLong: 'hodin',
    minutesLong: 'minut',
    secondsLong: 'sekund',
    video: 'Video',
    customerPhotos: 'Fotky od zákazníků',
  },
  sk: {
    locale: 'sk-SK',
    preorder: 'Predobjednať',
    presale: 'Predpredaj',
    presaleLabel: 'Predobjednávka',
    presaleInfoLead: 'Zatiaľ nie je skladom.',
    presaleInfoTail: 'Objednávku vybavíme hneď, ako bude tovar naskladnený.',
    ended: 'Predpredaj skončil',
    endsIn: 'Do konca predpredaja',
    endsAt: 'Končí {date} o {time}',
    code: 'Kód',
    copyCode: 'Skopírovať kód',
    copyShort: 'Kopírovať',
    copied: 'Skopírované',
    copyFailed: 'Skopírujte kód ručne',
    discountShort: 'Zľava {percent} %',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    daysLong: 'dní',
    hoursLong: 'hodín',
    minutesLong: 'minút',
    secondsLong: 'sekúnd',
    video: 'Video',
    customerPhotos: 'Fotky od zákazníkov',
  },
  en: {
    locale: 'en-GB',
    preorder: 'Pre-order',
    presale: 'Pre-sale',
    presaleLabel: 'Pre-order',
    presaleInfoLead: 'Not in stock yet.',
    presaleInfoTail: 'We will process the order as soon as the product is restocked.',
    ended: 'The pre-sale has ended',
    endsIn: 'Until the pre-sale ends',
    endsAt: 'Ends {date} at {time}',
    code: 'Code',
    copyCode: 'Copy the code',
    copyShort: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy the code by hand',
    discountShort: 'Save {percent}%',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    daysLong: 'days',
    hoursLong: 'hours',
    minutesLong: 'minutes',
    secondsLong: 'seconds',
    video: 'Video',
    customerPhotos: 'Customer photos',
  },
  hu: {
    locale: 'hu-HU',
    preorder: 'Előrendelés',
    presale: 'Elővásárlás',
    presaleLabel: 'Előrendelés',
    presaleInfoLead: 'Még nincs raktáron.',
    presaleInfoTail: 'A rendelést a termék beérkezése után azonnal feldolgozzuk.',
    ended: 'Az elővásárlás véget ért',
    endsIn: 'Az elővásárlás végéig',
    endsAt: 'Vége: {date}, {time}',
    code: 'Kód',
    copyCode: 'Kód másolása',
    copyShort: 'Másolás',
    copied: 'Másolva',
    copyFailed: 'Másolja ki a kódot kézzel',
    discountShort: '{percent}% kedvezmény',
    days: 'n',
    hours: 'ó',
    minutes: 'p',
    seconds: 'mp',
    daysLong: 'nap',
    hoursLong: 'óra',
    minutesLong: 'perc',
    secondsLong: 'másodperc',
    video: 'Videó',
    customerPhotos: 'Vásárlói fotók',
  },
};

/** @typedef {keyof typeof MESSAGES.cs} MessageKey */

/**
 * @param {'cs' | 'sk' | 'en' | 'hu'} [locale]
 * @returns {(key: MessageKey, vars?: Record<string, string | number>) => string}
 */
export function translator(locale = language()) {
  const catalogue = MESSAGES[locale] ?? MESSAGES.en;
  return (key, vars) => {
    const template = catalogue[key];
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}
