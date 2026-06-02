import '@testing-library/jest-dom'
// Inicializa o i18n (singleton, recursos inline) para que componentes com useTranslation
// renderizem traduzidos nos testes. Força pt-BR (no jsdom o navigator é en-US) para que as
// asserções de texto sejam determinísticas.
import i18n from '../i18n'
// Aguarda o init + idioma (resolve quando os recursos inline estão prontos) para que o
// primeiro render dos testes já tenha as traduções.
await i18n.changeLanguage('pt-BR')
