import type { LinguiConfig } from '@lingui/conf';

const config: LinguiConfig = {
  locales: ['pt-BR'],
  sourceLocale: 'pt-BR',
  catalogs: [
    {
      path: 'src/i18n/locales/{locale}',
      include: ['src'],
    },
  ],
  format: 'po',
  compileNamespace: 'es',
};

export default config;
