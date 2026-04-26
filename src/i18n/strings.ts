// Strings PT-BR centralizadas. ADR-1 do study #1: sem framework de i18n na Fase 0.

export const strings = {
  app: {
    title: 'Movemove — Detector de Movimento',
  },
  welcome: {
    headline: 'Olá! Vamos detectar seus movimentos.',
    explainer:
      'Toque no botão abaixo para ligar a câmera. Os movimentos ficam só no seu aparelho — nada é enviado pra internet.',
    cta: 'Ligar câmera',
  },
  loading: {
    text: 'Carregando detector de movimento…',
    subtext: 'Da primeira vez pode demorar alguns segundos.',
    spinnerAriaLabel: 'Carregando',
    statusInitWasm: 'Inicializando WASM…',
    statusDownloadingModel: 'Baixando modelo…',
    statusReady: 'Pronto',
    statusOpeningCamera: 'Abrindo câmera…',
  },
  calibration: {
    instruction: 'Fique parado, de frente, braços ao lado do corpo.',
    countdown: (n: number) => `${n}…`,
    capturing: 'Capturando…',
    ok: 'Pronto!',
    retry: 'Confiança baixa. Vamos tentar de novo?',
  },
  active: {
    recalibrate: 'Recalibrar',
    debugToggle: 'Debug',
  },
  error: {
    cameraDenied:
      'Você precisa permitir a câmera. Clique no cadeado ↗︎ na barra do navegador e permita o acesso.',
    cameraNotFound:
      'Não encontramos câmera. Conecte uma webcam ou abra esta página no celular.',
    insecureContext:
      'A câmera só funciona em HTTPS ou abrindo por http://localhost. Se você abriu por um IP da rede (192.168.x.x), abra direto em http://localhost:5173 no computador, ou use um túnel HTTPS (cloudflared) pra acessar do celular.',
    modelDownload:
      'Não conseguimos baixar o detector. Verifique sua internet e tente de novo.',
    generic: 'Algo deu errado. Tente recarregar a página.',
    retry: 'Tentar de novo',
  },
  states: {
    noBody: 'Apareça pra câmera 👋',
    lowLight:
      'Iluminação fraca. Chegue mais perto da janela ou acenda uma luz.',
    driftCalibration:
      'Sua calibração pode estar errada. Recalibrar agora?',
    recalibrate: 'Recalibrar',
  },
} as const;
