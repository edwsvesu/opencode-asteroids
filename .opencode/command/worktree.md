---
description: Crea un worktree local en .worktrees/ a partir del argumento recibido.
---

Analiza el argumento `$ARGUMENTS`. Puede contener espacios o no; deriva de él el nombre del worktree usando el contexto del argumento (normalízalo: minúsculas, espacios a guiones, sin caracteres especiales). Luego ejecuta exactamente y sin más acciones:

git worktree add .worktrees/<nombre-del-worktree>

No cambies de directorio. No hagas nada adicional.
