# Oracle Cloud VM — Setup e Operação

Máquina atual: Oracle Linux 9.7 — `137.131.157.30`
Chave SSH: `./keys/ssh-key-2026-04-27.key`

---

## 1. Conectar na VM

```bash
chmod 400 ./keys/ssh-key-2026-04-27.key
ssh -i ./keys/ssh-key-2026-04-27.key opc@137.131.157.30
```

---

## 2. Instalar Docker

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker opc
```

Sair e entrar de novo pra ativar o grupo:
```bash
exit
ssh -i ./keys/ssh-key-2026-04-27.key opc@137.131.157.30
docker --version
docker compose version
```

---

## 3. Abrir portas no firewall da VM

```bash
# Portas web
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Verificar
sudo firewall-cmd --list-all
```

**Também abrir no Oracle Cloud Console:**
Networking → VCN → Subnet → Security List → Add Ingress Rule
- TCP porta 80 — Source `0.0.0.0/0` — Stateless: No
- TCP porta 443 — Source `0.0.0.0/0` — Stateless: No

---

## 4. Otimizar memória — Swap

Verificar situação atual:
```bash
free -h
swapon --show
df -h
```

Criar 2GB de swap (recomendado para VMs com 1-2GB RAM):
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Persistir após reboot
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Swappiness: 60 = começa a usar swap quando RAM < 40%
# Diminuir para 20-30 se tiver SSD (acesso mais rápido)
echo 'vm.swappiness=60' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Confirmar
free -h
```

---

## 5. Deploy do frontend (Docker)

Na sua máquina local, copiar o projeto:
```bash
scp -i ./keys/ssh-key-2026-04-27.key -r . opc@137.131.157.30:~/movemove
```

Na VM:
```bash
cd ~/movemove
docker compose up -d --build
```

Verificar se está rodando:
```bash
docker compose ps
docker compose logs -f frontend
```

Acessar no browser: `http://137.131.157.30`

---

## 6. HTTPS com Let's Encrypt (quando tiver domínio)

```bash
# Instalar Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Gerar certificado (substituir pelo seu domínio)
sudo certbot --nginx -d seudominio.com

# Renovação automática (já configurada pelo certbot)
sudo systemctl enable --now certbot-renew.timer
```

---

## 7. Comandos úteis no dia a dia

```bash
# Ver uso de recursos
htop
free -h
df -h

# Docker
docker compose ps                    # status dos containers
docker compose logs -f               # logs em tempo real
docker compose up -d --build         # rebuild e sobe
docker compose down                  # para tudo
docker system prune -f               # limpa imagens antigas

# Atualizar o app (da máquina local)
scp -i ./keys/ssh-key-2026-04-27.key -r dist/ opc@137.131.157.30:~/movemove/dist
ssh -i ./keys/ssh-key-2026-04-27.key opc@137.131.157.30 "cd movemove && docker compose up -d --build"
```

---

## 8. Estrutura Docker atual

```
movemove/
├── Dockerfile              # build frontend (Node) + serve (Nginx)
├── docker-compose.yml      # orquestra frontend + backend (futuro)
└── docker/
    ├── nginx.conf          # config Nginx: SPA + proxy /api para backend
    └── setup-oracle.sh     # script de setup completo da VM
```

**Portas:**
- `80` → Nginx → frontend (SPA)
- `/api/*` → proxy → backend na porta 3000 (quando existir)

---

## 9. Próximos passos — Backend

Quando o backend estiver pronto (Cloudflare Workers + D1 ou Node + PostgreSQL):

1. Descomentar bloco `backend` no `docker-compose.yml`
2. Criar `backend/` com o código da API
3. Configurar variáveis de ambiente em `.env` (não commitar)
4. Rodar `docker compose up -d --build`

**Rotas planejadas:**
- `GET/POST /api/exercises` — configurações do GuidedRecorder (issue #11)
- `GET/POST /api/profiles` — perfis de crianças
- `GET/POST /api/sessions` — histórico de sessões

---

## 10. Segurança básica (recomendado antes de ir pra produção)

```bash
# Desabilitar login por senha (só chave SSH)
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Fail2ban — bloqueia IPs com muitas tentativas de login
sudo dnf install -y fail2ban
sudo systemctl enable --now fail2ban

# Atualizações automáticas de segurança
sudo dnf install -y dnf-automatic
sudo systemctl enable --now dnf-automatic.timer
```
