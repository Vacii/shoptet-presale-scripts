/**
 * Build-time constants substituted by webpack's DefinePlugin.
 *
 * Declared rather than imported, because the value has to be inlined at build time —
 * the bundle Shoptet's pipeline produces carries no environment with it.
 */

/** The API origin for the fallback fetch; an empty string in a normal build. */
declare const __CFP_API_ORIGIN__: string | undefined;
