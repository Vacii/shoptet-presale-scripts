/**
 * The bundle's own strings.
 *
 * The previous version had all eight of them hard-coded in Czech, which is the reason the
 * addon could not be sold to a Slovak or Hungarian shop at all.
 */

import { language } from './shoptet.js';

const MESSAGES = {
  cs: {
    preorder: 'Předobjednat',
    preorderWithDiscount: 'Objednat s předprodejovou slevou',
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
    discount: 'Sleva {percent} % na předobjednávku',
    discountWithCode: 'S kódem ušetříte {percent} %',
    discountShort: 'Sleva {percent} %',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    daysLong: 'dní',
    hoursLong: 'hodin',
    minutesLong: 'minut',
    secondsLong: 'sekund',
  },
  sk: {
    preorder: 'Predobjednať',
    preorderWithDiscount: 'Objednať s predpredajovou zľavou',
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
    discount: 'Zľava {percent} % na predobjednávku',
    discountWithCode: 'S kódom ušetríte {percent} %',
    discountShort: 'Zľava {percent} %',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    daysLong: 'dní',
    hoursLong: 'hodín',
    minutesLong: 'minút',
    secondsLong: 'sekúnd',
  },
  en: {
    preorder: 'Pre-order',
    preorderWithDiscount: 'Order with pre-sale discount',
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
    discount: '{percent}% off pre-orders',
    discountWithCode: 'Save {percent}% with code',
    discountShort: 'Save {percent}%',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    daysLong: 'days',
    hoursLong: 'hours',
    minutesLong: 'minutes',
    secondsLong: 'seconds',
  },
  hu: {
    preorder: 'Előrendelés',
    preorderWithDiscount: 'Rendelés elővásárlási kedvezménnyel',
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
    discount: '{percent}% kedvezmény előrendelésre',
    discountWithCode: 'A kóddal {percent}% kedvezmény',
    discountShort: '{percent}% kedvezmény',
    days: 'n',
    hours: 'ó',
    minutes: 'p',
    seconds: 'mp',
    daysLong: 'nap',
    hoursLong: 'óra',
    minutesLong: 'perc',
    secondsLong: 'másodperc',
  },
};

/** @typedef {keyof typeof MESSAGES.cs} MessageKey */

/**
 * @param {'cs' | 'sk' | 'en' | 'hu'} [locale]
 * @returns {(key: MessageKey, vars?: Record<string, string | number>) => string}
 */
export function translator(locale = language()) {
  const catalogue = MESSAGES[locale] ?? MESSAGES.cs;
  return (key, vars) => {
    const template = catalogue[key];
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}
