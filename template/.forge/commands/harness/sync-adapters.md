---
description: Regenera os adapters (.claude, AGENTS.md, symlinks) a partir da fonte canonica .forge. Use apos editar qualquer arquivo em .forge/ ou quando o doctor reportar drift.
---

# /forge:sync-adapters

1. Rode `bash .forge/scripts/sync-adapters.sh --adapter claude` (acrescente `--copy-links` se o ambiente não suportar symlinks).
2. Confirme a linha final `OK claude adapter synced (...)`.
3. Rode `bash .forge/scripts/doctor.sh --report` e confirme "adapter claude sem drift".
4. Reporte em 1-2 linhas o que foi regenerado. Lembre o usuário: os alvos gerados (adapter Claude, `AGENTS.md` e symlinks) **nunca** são editados à mão — toda edição acontece em `.forge/**` seguida de re-sync.

Adapters adicionais (codex/qwen/kiro/gemini/cursor/agents-skills) chegam na wave W1.4 do harness.
