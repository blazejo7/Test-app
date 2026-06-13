// Committed so `tsc --noEmit` works in CI without first generating the
// (gitignored) expo-env.d.ts.
//
// - expo/types: declarations for `*.css` imports and EXPO_PUBLIC_* env vars.
// - jest: global describe/it/expect for the rules unit tests.
/// <reference types="expo/types" />
/// <reference types="jest" />
