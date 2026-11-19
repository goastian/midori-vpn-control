import { computed } from 'vue'
import { useLocale, type LocaleCode } from './i18n'

type BrandCopy = {
  heroTitle: string
  heroAccent: string
  extensionTitle: string
  extensionDescription: string
  previewCaption: string
  skipContent: string
  controlPanel: string
}

const messages: Record<LocaleCode, BrandCopy> = {
  es: {
    heroTitle: 'Tu conexión,',
    heroAccent: 'a tu manera.',
    extensionTitle: 'Tu VPN en el navegador.',
    extensionDescription:
      'Así se ve la extensión de MidoriVPN: un selector de ubicación y un botón para conectar el tráfico del navegador. La app de escritorio cubre otras aplicaciones.',
    previewCaption: 'Captura de la extensión compilada. Ubicación de ejemplo; sin conexión activa.',
    skipContent: 'Saltar al contenido',
    controlPanel: 'Panel de control',
  },
  en: {
    heroTitle: 'Your connection,',
    heroAccent: 'your way.',
    extensionTitle: 'Your VPN in the browser.',
    extensionDescription:
      'This is the MidoriVPN extension: a location selector and a button to connect browser traffic. The desktop app covers other applications.',
    previewCaption: 'Screenshot of the built extension. Example location; no active connection.',
    skipContent: 'Skip to content',
    controlPanel: 'Control panel',
  },
  pt: {
    heroTitle: 'A tua ligação,',
    heroAccent: 'à tua maneira.',
    extensionTitle: 'A tua VPN no navegador.',
    extensionDescription:
      'Esta é a extensão MidoriVPN: um seletor de localização e um botão para ligar o tráfego do navegador. A aplicação de computador abrange outras aplicações.',
    previewCaption: 'Captura da extensão compilada. Localização de exemplo; sem ligação ativa.',
    skipContent: 'Saltar para o conteúdo',
    controlPanel: 'Painel de controlo',
  },
  de: {
    heroTitle: 'Deine Verbindung,',
    heroAccent: 'auf deine Art.',
    extensionTitle: 'Dein VPN im Browser.',
    extensionDescription:
      'So sieht die MidoriVPN-Erweiterung aus: eine Standortauswahl und eine Schaltfläche für den Browserverkehr. Die Desktop-App deckt andere Anwendungen ab.',
    previewCaption:
      'Screenshot der erstellten Erweiterung. Beispielstandort; keine aktive Verbindung.',
    skipContent: 'Zum Inhalt springen',
    controlPanel: 'Verwaltung',
  },
  fr: {
    heroTitle: 'Votre connexion,',
    heroAccent: 'à votre façon.',
    extensionTitle: 'Votre VPN dans le navigateur.',
    extensionDescription:
      'Voici l’extension MidoriVPN : un sélecteur de localisation et un bouton pour connecter le trafic du navigateur. L’application de bureau couvre les autres applications.',
    previewCaption:
      'Capture de l’extension compilée. Localisation d’exemple ; aucune connexion active.',
    skipContent: 'Aller au contenu',
    controlPanel: 'Panneau de contrôle',
  },
  tr: {
    heroTitle: 'Bağlantınız,',
    heroAccent: 'sizin tercihiniz.',
    extensionTitle: 'Tarayıcınızda VPN.',
    extensionDescription:
      'MidoriVPN uzantısı böyle görünür: bir konum seçici ve tarayıcı trafiğini bağlamak için bir düğme. Masaüstü uygulaması diğer uygulamaları kapsar.',
    previewCaption: 'Derlenen uzantının ekran görüntüsü. Örnek konum; etkin bağlantı yok.',
    skipContent: 'İçeriğe geç',
    controlPanel: 'Kontrol paneli',
  },
  ru: {
    heroTitle: 'Ваше подключение,',
    heroAccent: 'ваши правила.',
    extensionTitle: 'Ваш VPN в браузере.',
    extensionDescription:
      'Так выглядит расширение MidoriVPN: выбор местоположения и кнопка подключения трафика браузера. Настольное приложение охватывает другие приложения.',
    previewCaption:
      'Снимок собранного расширения. Пример местоположения; активного подключения нет.',
    skipContent: 'Перейти к содержимому',
    controlPanel: 'Панель управления',
  },
  uk: {
    heroTitle: 'Ваше підключення,',
    heroAccent: 'ваш вибір.',
    extensionTitle: 'Ваш VPN у браузері.',
    extensionDescription:
      'Так виглядає розширення MidoriVPN: вибір розташування та кнопка підключення трафіку браузера. Настільна програма охоплює інші програми.',
    previewCaption:
      'Знімок зібраного розширення. Приклад розташування; активного підключення немає.',
    skipContent: 'Перейти до вмісту',
    controlPanel: 'Панель керування',
  },
  ca: {
    heroTitle: 'La teva connexió,',
    heroAccent: 'a la teva manera.',
    extensionTitle: 'La teva VPN al navegador.',
    extensionDescription:
      'Així es veu l’extensió MidoriVPN: un selector d’ubicació i un botó per connectar el trànsit del navegador. L’aplicació d’escriptori cobreix altres aplicacions.',
    previewCaption: 'Captura de l’extensió compilada. Ubicació d’exemple; sense connexió activa.',
    skipContent: 'Salta al contingut',
    controlPanel: 'Tauler de control',
  },
  gl: {
    heroTitle: 'A túa conexión,',
    heroAccent: 'ao teu xeito.',
    extensionTitle: 'A túa VPN no navegador.',
    extensionDescription:
      'Así se ve a extensión MidoriVPN: un selector de localización e un botón para conectar o tráfico do navegador. A aplicación de escritorio cobre outras aplicacións.',
    previewCaption: 'Captura da extensión compilada. Localización de exemplo; sen conexión activa.',
    skipContent: 'Saltar ao contido',
    controlPanel: 'Panel de control',
  },
}

export function useBrandCopy() {
  const { locale } = useLocale()
  return computed(() => messages[locale.value])
}
