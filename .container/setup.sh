#!/usr/bin/env bash
set -e

# ==============================================================================
# Midori VPN Control Panel — Systemd Quadlet Rootless Installer
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

QUADLET_DIR="${HOME}/.config/containers/systemd"
IMAGE_NAME="localhost/midori-vpn-control:latest"
SERVICE_NAME="midori-vpn-control.service"

build_image() {
    echo "🔨 [Podman] Compilando imagen ${IMAGE_NAME}..."
    podman build -t "${IMAGE_NAME}" -f "${SCRIPT_DIR}/Containerfile" "${ROOT_DIR}"
    echo "✅ Imagen construida exitosamente."
}

install_quadlet() {
    echo "📦 [Quadlet] Instalando servicio web para Podman Rootless..."
    
    mkdir -p "${QUADLET_DIR}"

    # Copy Quadlet unit
    cp "${SCRIPT_DIR}/midori-vpn-control.container" "${QUADLET_DIR}/midori-vpn-control.container"
    echo "📋 Archivo Quadlet copiado a ${QUADLET_DIR}/midori-vpn-control.container"

    # Reload user systemd manager
    systemctl --user daemon-reload
    echo "🔄 Systemd de usuario recargado."

    # Enable and start service
    systemctl --user enable --now "${SERVICE_NAME}"
    echo "🚀 Servicio ${SERVICE_NAME} habilitado e iniciado en http://127.0.0.1:5173."
    echo ""
    systemctl --user status "${SERVICE_NAME}" --no-pager || true
}

uninstall_quadlet() {
    echo "🛑 [Quadlet] Deteniendo y desinstalando ${SERVICE_NAME}..."
    systemctl --user stop "${SERVICE_NAME}" || true
    systemctl --user disable "${SERVICE_NAME}" || true
    rm -f "${QUADLET_DIR}/midori-vpn-control.container"
    systemctl --user daemon-reload
    echo "✅ Servicio ${SERVICE_NAME} desinstalado."
}

show_status() {
    systemctl --user status "${SERVICE_NAME}" --no-pager
}

show_logs() {
    journalctl --user -u "${SERVICE_NAME}" -f
}

case "$1" in
    build)
        build_image
        ;;
    install)
        build_image
        install_quadlet
        ;;
    uninstall)
        uninstall_quadlet
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        systemctl --user restart "${SERVICE_NAME}"
        ;;
    *)
        echo "Uso: $0 {build|install|uninstall|status|restart|logs}"
        echo ""
        echo "Comandos:"
        echo "  install    - Compila la imagen y registra el Quadlet en systemd (--user)"
        echo "  uninstall  - Elimina el Quadlet de systemd (--user)"
        echo "  status     - Muestra el estado del servicio"
        echo "  logs       - Sigue los logs en tiempo real (journalctl)"
        echo "  restart    - Reinicia el servicio"
        exit 1
        ;;
esac
