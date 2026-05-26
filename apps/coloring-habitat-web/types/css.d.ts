// TS 6 requires explicit module declarations for side-effect-only CSS
// imports (TS2882). Next.js's PostCSS pipeline handles these at build
// time; this stub just satisfies the type checker for `import 'X.css'`
// statements.
declare module "*.css";
