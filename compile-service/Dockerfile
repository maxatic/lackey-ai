FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/*

# Install Tectonic 0.16.9 (pinned — latest as of 2026-06-29)
RUN wget -qO- https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.16.9/tectonic-0.16.9-x86_64-unknown-linux-gnu.tar.gz \
    | tar xz -C /usr/local/bin

WORKDIR /app
COPY server.mjs package.json ./

# Shared Tectonic cache: warm it at build AND use it at runtime, so the first compile
# after a cold start reuses the baked bundle instead of re-downloading it. Critical with
# scale-to-zero — otherwise every machine wake re-fetches the bundle and risks the 25s timeout.
# (Default cache lives in the build user's $HOME, which the runtime 'app' user can't see.)
ENV TECTONIC_CACHE_DIR=/var/cache/tectonic
RUN mkdir -p "$TECTONIC_CACHE_DIR" \
    && printf '\\documentclass{article}\\usepackage{geometry}\\usepackage{enumitem}\\usepackage{hyperref}\\begin{document}warm\\end{document}' > /tmp/w.tex \
    && tectonic -X compile /tmp/w.tex --outdir /tmp || true

RUN useradd -m app && chown -R app /app "$TECTONIC_CACHE_DIR"
USER app

EXPOSE 8080
CMD ["node", "server.mjs"]
