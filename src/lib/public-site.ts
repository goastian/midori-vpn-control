import type { LocaleCode } from './locales'

type PublicCopy = { status: string; summary: string; unavailable: string; downloadDetail: string; privacyPending: string; termsPending: string }

// These are release-status notices, not approved legal policies or promises.
export const publicSiteCopy: Record<LocaleCode, PublicCopy> = {
  en: {
    status: 'Pre-release', summary: 'Manage your VPN account and devices with MidoriVPN.',
    unavailable: 'MidoriVPN 2.0 is not yet available for public download.',
    downloadDetail: 'The desktop target is Linux x86_64 (RPM), with systemd-resolved managing DNS. Browser store packages and a signed desktop release will appear here after validation and approval.',
    privacyPending: 'The VPN privacy policy is pending review and approval. This notice is not a privacy policy. Public registration and store publication remain blocked until the policy is available.',
    termsPending: 'The VPN terms of service are pending review and approval. This notice does not establish service terms. Public launch remains blocked until approved terms are available.',
  },
  es: {
    status: 'Versión preliminar', summary: 'Gestiona tu cuenta VPN y tus dispositivos con MidoriVPN.',
    unavailable: 'MidoriVPN 2.0 aún no está disponible para descarga pública.',
    downloadDetail: 'El cliente de escritorio está previsto para Linux x86_64 (RPM), con systemd-resolved gestionando DNS. Los paquetes de las tiendas y una versión de escritorio firmada aparecerán aquí tras su validación y aprobación.',
    privacyPending: 'La política de privacidad de la VPN está pendiente de revisión y aprobación. Este aviso no es una política de privacidad. El registro público y la publicación en tiendas siguen bloqueados hasta disponer de ella.',
    termsPending: 'Los términos de servicio de la VPN están pendientes de revisión y aprobación. Este aviso no establece condiciones de servicio. El lanzamiento público sigue bloqueado hasta disponer de términos aprobados.',
  },
  pt: {
    status: 'Versão preliminar', summary: 'Gira a sua conta VPN e os seus dispositivos com o MidoriVPN.',
    unavailable: 'O MidoriVPN 2.0 ainda não está disponível para transferência pública.',
    downloadDetail: 'O cliente de computador destina-se a Linux x86_64 (RPM), com DNS gerido pelo systemd-resolved. Os pacotes das lojas e a versão assinada estarão aqui após validação e aprovação.',
    privacyPending: 'A política de privacidade da VPN aguarda revisão e aprovação. Este aviso não é uma política de privacidade. O registo público e a publicação nas lojas permanecem bloqueados até estar disponível.',
    termsPending: 'Os termos de serviço da VPN aguardam revisão e aprovação. Este aviso não estabelece condições de serviço. O lançamento público permanece bloqueado até existirem termos aprovados.',
  },
  de: {
    status: 'Vorabversion', summary: 'Verwalte dein VPN-Konto und deine Geräte mit MidoriVPN.',
    unavailable: 'MidoriVPN 2.0 steht noch nicht zum öffentlichen Download bereit.',
    downloadDetail: 'Der Desktop-Client ist für Linux x86_64 (RPM) mit DNS-Verwaltung durch systemd-resolved vorgesehen. Store-Pakete und eine signierte Desktop-Version werden nach Prüfung und Freigabe hier angeboten.',
    privacyPending: 'Die VPN-Datenschutzerklärung muss noch geprüft und freigegeben werden. Dieser Hinweis ist keine Datenschutzerklärung. Öffentliche Registrierung und Store-Veröffentlichung bleiben bis dahin gesperrt.',
    termsPending: 'Die VPN-Nutzungsbedingungen müssen noch geprüft und freigegeben werden. Dieser Hinweis legt keine Nutzungsbedingungen fest. Der öffentliche Start bleibt bis zur Freigabe gesperrt.',
  },
  fr: {
    status: 'Préversion', summary: 'Gérez votre compte VPN et vos appareils avec MidoriVPN.',
    unavailable: 'MidoriVPN 2.0 ne peut pas encore être téléchargé publiquement.',
    downloadDetail: 'Le client de bureau vise Linux x86_64 (RPM), avec DNS géré par systemd-resolved. Les paquets des boutiques et la version signée seront proposés ici après validation et approbation.',
    privacyPending: 'La politique de confidentialité VPN attend une révision et une approbation. Cet avis ne constitue pas une politique de confidentialité. Les inscriptions publiques et la publication en boutique restent bloquées en attendant.',
    termsPending: 'Les conditions du service VPN attendent une révision et une approbation. Cet avis ne définit pas de conditions de service. Le lancement public reste bloqué en attendant leur approbation.',
  },
  tr: {
    status: 'Ön sürüm', summary: 'MidoriVPN ile VPN hesabınızı ve cihazlarınızı yönetin.',
    unavailable: 'MidoriVPN 2.0 henüz herkese açık olarak indirilemiyor.',
    downloadDetail: 'Masaüstü istemcisi Linux x86_64 (RPM) ve DNS için systemd-resolved hedefler. Mağaza paketleri ve imzalı masaüstü sürümü doğrulama ve onay sonrasında burada sunulacak.',
    privacyPending: 'VPN gizlilik politikası inceleme ve onay bekliyor. Bu bildirim bir gizlilik politikası değildir. Herkese açık kayıt ve mağaza yayını politika hazır olana kadar engellidir.',
    termsPending: 'VPN hizmet koşulları inceleme ve onay bekliyor. Bu bildirim hizmet koşulları belirlemez. Herkese açık yayın, onaylı koşullar hazır olana kadar engellidir.',
  },
  ru: {
    status: 'Предварительная версия', summary: 'Управляйте учётной записью VPN и устройствами с MidoriVPN.',
    unavailable: 'MidoriVPN 2.0 пока недоступен для публичной загрузки.',
    downloadDetail: 'Настольный клиент предназначен для Linux x86_64 (RPM) с DNS через systemd-resolved. Пакеты магазинов и подписанная версия появятся здесь после проверки и одобрения.',
    privacyPending: 'Политика конфиденциальности VPN ожидает проверки и одобрения. Это уведомление не является политикой конфиденциальности. Публичная регистрация и публикация в магазинах пока заблокированы.',
    termsPending: 'Условия использования VPN ожидают проверки и одобрения. Это уведомление не устанавливает условия обслуживания. Публичный запуск заблокирован до утверждения условий.',
  },
  uk: {
    status: 'Попередня версія', summary: 'Керуйте обліковим записом VPN і пристроями за допомогою MidoriVPN.',
    unavailable: 'MidoriVPN 2.0 ще недоступний для публічного завантаження.',
    downloadDetail: 'Настільний клієнт призначений для Linux x86_64 (RPM) із DNS через systemd-resolved. Пакети магазинів і підписана версія з’являться тут після перевірки та схвалення.',
    privacyPending: 'Політика конфіденційності VPN очікує перевірки та схвалення. Це повідомлення не є політикою конфіденційності. Публічну реєстрацію та публікацію в магазинах поки заблоковано.',
    termsPending: 'Умови використання VPN очікують перевірки та схвалення. Це повідомлення не встановлює умов обслуговування. Публічний запуск заблоковано до затвердження умов.',
  },
  ca: {
    status: 'Versió preliminar', summary: 'Gestiona el teu compte VPN i els teus dispositius amb MidoriVPN.',
    unavailable: 'MidoriVPN 2.0 encara no està disponible per a descàrrega pública.',
    downloadDetail: 'El client d’escriptori està previst per a Linux x86_64 (RPM), amb DNS gestionat per systemd-resolved. Els paquets de les botigues i la versió signada apareixeran aquí després de validar-los i aprovar-los.',
    privacyPending: 'La política de privadesa de la VPN està pendent de revisió i aprovació. Aquest avís no és una política de privadesa. El registre públic i la publicació a les botigues continuen bloquejats fins que estigui disponible.',
    termsPending: 'Les condicions de servei de la VPN estan pendents de revisió i aprovació. Aquest avís no estableix condicions de servei. El llançament públic continua bloquejat fins que hi hagi condicions aprovades.',
  },
  gl: {
    status: 'Versión preliminar', summary: 'Xestiona a túa conta VPN e os teus dispositivos con MidoriVPN.',
    unavailable: 'MidoriVPN 2.0 aínda non está dispoñible para descarga pública.',
    downloadDetail: 'O cliente de escritorio está previsto para Linux x86_64 (RPM), con DNS xestionado por systemd-resolved. Os paquetes das tendas e a versión asinada aparecerán aquí tras a súa validación e aprobación.',
    privacyPending: 'A política de privacidade da VPN está pendente de revisión e aprobación. Este aviso non é unha política de privacidade. O rexistro público e a publicación nas tendas seguen bloqueados ata dispoñer dela.',
    termsPending: 'As condicións de servizo da VPN están pendentes de revisión e aprobación. Este aviso non establece condicións de servizo. O lanzamento público segue bloqueado ata dispoñer de condicións aprobadas.',
  },
}
