FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/*

# Install Tectonic 0.16.9 (pinned — latest as of 2026-06-29)
RUN wget -qO- https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.16.9/tectonic-0.16.9-x86_64-unknown-linux-gnu.tar.gz \
    | tar xz -C /usr/local/bin

WORKDIR /app
COPY server.mjs package.json ./

# Warm the Tectonic bundle cache so the first real compile is fast.
# Uses packages a typical EU CV template needs; failure is non-fatal.
RUN printf '\\documentclass{article}\\usepackage{geometry}\\usepackage{enumitem}\\usepackage{hyperref}\\begin{document}warm\\end{document}' > /tmp/w.tex \
    && tectonic -X compile /tmp/w.tex --outdir /tmp || true

RUN useradd -m app && chown -R app /app
USER app

EXPOSE 8080
CMD ["node", "server.mjs"]
