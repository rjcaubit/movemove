#!/bin/bash
# Setup Docker + firewall na VM Oracle Linux 9
# Rodar como opc: bash setup-oracle.sh

set -e

echo "==> Instalando Docker..."
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Iniciando Docker..."
sudo systemctl enable --now docker
sudo usermod -aG docker opc
echo "AVISO: Faça logout e login novamente para usar docker sem sudo"

echo "==> Abrindo portas 80 e 443 no firewall da VM..."
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

echo "==> Versões instaladas:"
docker --version
docker compose version

echo ""
echo "PRONTO. Próximo passo:"
echo "  1. Faça logout e login novamente (para grupo docker)"
echo "  2. Clone o repo ou copie os arquivos"
echo "  3. Execute: docker compose up -d --build"
