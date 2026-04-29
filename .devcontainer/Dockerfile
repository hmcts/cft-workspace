FROM mcr.microsoft.com/devcontainers/base:ubuntu

ARG USERNAME=hmcts
ARG USER_UID=1000
ARG USER_GID=1000
ARG NVM_VERSION=v0.40.1
ARG JAVA_VERSION=21-tem

ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        zsh git curl wget ca-certificates jq unzip xz-utils gnupg lsb-release \
        sudo locales tzdata \
        postgresql-client; \
    \
    install -m 0755 -d /etc/apt/keyrings; \
    \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | gpg --dearmor -o /etc/apt/keyrings/githubcli.gpg; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list; \
    \
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor -o /etc/apt/keyrings/microsoft.gpg; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/azure-cli/ $(lsb_release -cs) main" \
        > /etc/apt/sources.list.d/azure-cli.list; \
    \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list; \
    \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        gh azure-cli docker-ce-cli docker-buildx-plugin docker-compose-plugin; \
    \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
        amd64) yq_arch=amd64; rg_arch=x86_64-unknown-linux-musl ;; \
        arm64) yq_arch=arm64; rg_arch=aarch64-unknown-linux-gnu ;; \
        *) echo "unsupported arch: $arch" >&2; exit 1 ;; \
    esac; \
    curl -fsSL "https://github.com/mikefarah/yq/releases/latest/download/yq_linux_${yq_arch}" \
        -o /usr/local/bin/yq; \
    chmod +x /usr/local/bin/yq; \
    rg_ver="14.1.1"; \
    curl -fsSL "https://github.com/BurntSushi/ripgrep/releases/download/${rg_ver}/ripgrep-${rg_ver}-${rg_arch}.tar.gz" \
        | tar -xz -C /tmp; \
    install -m 0755 "/tmp/ripgrep-${rg_ver}-${rg_arch}/rg" /usr/local/bin/rg; \
    rm -rf "/tmp/ripgrep-${rg_ver}-${rg_arch}"; \
    \
    rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    if id ubuntu >/dev/null 2>&1; then userdel -r ubuntu 2>/dev/null || true; fi; \
    if id vscode >/dev/null 2>&1; then userdel -r vscode 2>/dev/null || true; fi; \
    groupadd --gid ${USER_GID} ${USERNAME}; \
    useradd --uid ${USER_UID} --gid ${USER_GID} --create-home --shell /bin/zsh ${USERNAME}; \
    getent group docker >/dev/null || groupadd --system docker; \
    usermod -aG sudo,docker ${USERNAME}; \
    echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME}; \
    chmod 0440 /etc/sudoers.d/${USERNAME}

USER ${USERNAME}
ENV HOME=/home/${USERNAME}
WORKDIR ${HOME}

# Pre-create .config so the host-bind-mounted .config/gh doesn't cause
# Docker to materialise .config as root and lock the user out of it.
RUN mkdir -p "$HOME/.config"

RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended --keep-zshrc

RUN curl -s "https://get.sdkman.io?rcupdate=true" | bash \
    && bash -lc 'set -ex; \
        source "$HOME/.sdkman/bin/sdkman-init.sh"; \
        sdk install java '"${JAVA_VERSION}"'; \
        sdk install gradle; \
        sdk flush archives; sdk flush temp'

RUN curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | PROFILE=/dev/null bash \
    && bash -lc 'set -ex; \
        export NVM_DIR="$HOME/.nvm"; \
        . "$NVM_DIR/nvm.sh"; \
        nvm install --lts; \
        nvm alias default "lts/*"; \
        corepack enable'

RUN cat >> "$HOME/.zshrc" <<'EOF'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# zsh history (file location is bind-mounted from the host in devcontainer.json)
HISTFILE=$HOME/.zsh_history
HISTSIZE=10000000
SAVEHIST=10000
setopt INC_APPEND_HISTORY SHARE_HISTORY HIST_IGNORE_DUPS
EOF

RUN cat >> "$HOME/.bashrc" <<'EOF'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# bash history (file location is bind-mounted from the host in devcontainer.json)
HISTFILE=$HOME/.bash_history
HISTSIZE=1000000
HISTFILESIZE=20000000
shopt -s histappend
EOF

RUN bash -c 'export NVM_DIR="$HOME/.nvm"; \
    . "$NVM_DIR/nvm.sh"; \
    nvm use default; \
    npm install -g @anthropic-ai/claude-code'
