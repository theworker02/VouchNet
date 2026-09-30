import nextVitals from 'eslint-config-next/core-web-vitals';

export default [...nextVitals, { files: ['src/**/*.ts'], rules: { 'no-console': 'error' } }];
