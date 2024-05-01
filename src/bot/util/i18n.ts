import i18next from 'i18next';
import Locale from '../../../locales/en.js';

// type DeepKeys<T, S extends string> = T extends object
// 	? S extends `${infer I1}.${infer I2}`
// 		? I1 extends keyof T
// 			? `${I1}.${DeepKeys<T[I1], I2>}`
// 			: keyof T & string
// 		: S extends keyof T
// 		? `${S}`
// 		: keyof T & string
// 	: '';

type Join<K, P> = K extends string | number ? (P extends string | number ? `${K}${'' extends P ? '' : '.'}${P}` : never) : never;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

type Leaves<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
    ? { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T]
    : '';

type Keys<S> = S extends `${string}{{${infer B}}}${infer C}`
  ? C extends `${string}{{${string}}}${string}`
    ? [B, ...Keys<C>]
    : [B]
  : never;

type Interpolate<S, I extends Record<Keys<S>[number], string>> = S extends ''
  ? ''
  : S extends `${infer A}{{${infer B}}}${infer C}`
    ? C extends `${string}{{${string}}}${string}`
      ? `${A}${I[Extract<B, keyof I>]}${Interpolate<C, I>}`
      : `${A}${I[Extract<B, keyof I>]}${C}`
    : S;

type GetDictValue<T extends string, O> = T extends `${infer A}.${infer B}`
  ? A extends keyof O
    ? GetDictValue<B, O[A]>
    : never
  : T extends keyof O
    ? O[T]
    : never;

type CheckDictString<T extends string, O> = T extends `${infer A}.${infer B}`
  ? A extends keyof O
    ? `${A}.${Extract<CheckDictString<B, O[A]>, string>}`
    : never
  : T extends keyof O
    ? T
    : never;

export function i18n<K extends Leaves<typeof Locale>, I extends Record<Keys<GetDictValue<K, typeof Locale>>[number], string>>(
  key: CheckDictString<K, typeof Locale>,
  args: I & { lng: string }
): Interpolate<GetDictValue<K, typeof Locale>, I> {
  return i18next.t(key, { ...args, interpolation: { escapeValue: false } }); // .replace(/[^\S\r\n]+$/gm, '');
}

export type TranslationKey = CheckDictString<Leaves<typeof Locale>, typeof Locale>;
