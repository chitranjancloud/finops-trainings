# Dependency security status

Verified on 2026-11-01.

## Applied updates

- Updated the npm lockfile with compatible security patches, including Axios 1.21.0, follow-redirects 1.16.2, form-data 4.0.6, Sharp 0.35.5, Zod 4.6.7, js-yaml 4.3.2, browserslist 4.29.5, baseline-browser-mapping 2.11.34, and brace-expansion 1.1.21 / 5.0.12.
- Updated Next.js to 15.5.28 and Nodemailer to 10.3.1.
- Required PostCSS >=8.5.23 and applied an override to replace Next.js's vulnerable pinned copy. The lockfile resolves PostCSS 8.5.32.

## Remaining advisory

`npm audit --omit=dev` reports **0 vulnerabilities**. The full audit reports **15 moderate dependency findings**, all propagated from one advisory: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), affecting Minimatch <11.0.1.

The development linting stack still requires Minimatch 3.x and 10.x. Current eslint-plugin-import, eslint-plugin-react, and eslint-plugin-jsx-a11y depend on the 3.x callable CommonJS API. Minimatch 11 exports an object instead, so a global override would break callers. No compatible patched 3.x release was available from npm when checked. These findings remain open; they have not been suppressed or treated as fixed.

Recheck the parent linting packages for compatible releases before updating. Avoid `npm audit fix --force`: npm currently proposes downgrading ESLint to 4.0.0, which is incompatible with this project's flat configuration.

## Verification

- `npm audit --omit=dev`: 0 vulnerabilities.
- Full audit: 0 critical, 0 high, 15 moderate (the development advisory above).
- Local smoke checks passed for Nodemailer message generation without sending, Sharp PNG resizing, and loading the Razorpay SDK.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run build`: passed with network access for Google Fonts. The build skips linting according to the existing Next.js configuration.

Commit both package.json and package-lock.json together. A remote GitHub security dashboard needs the changes pushed and a fresh scan before its findings can change.
