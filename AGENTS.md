# AGENTS.md

Clon de Asteroids: juego HTML5 Canvas 100% vanilla JS en un solo archivo `game.js`, sin dependencias, sin bundler, sin `package.json`.

## Comandos

- No hay build, lint, test ni typecheck. La única verificación es manual: abrir `index.html` en el navegador o `npx serve .`.
- Probar un cambio: recargar la página. No hay hot-reload.

## Arquitectura

- Todo el juego vive en `game.js` (423 líneas, sin módulos ES): clases `Bullet`, `Asteroid`, `Ship`, `Particle` + funciones top-level que comparten el mismo scope. No importar/exportar desde otros archivos.
- `index.html` fija el canvas en `width="800" height="600"`; `game.js` repite el tamaño en las constantes `W` y `H`. Si cambias uno, cambias el otro.
- Máquina de estados global: `state` = `'playing' | 'dead' | 'gameover'`; `update(dt)` maneja cada rama por separado.
- Espacio toroidal: `wrap(v, max)` envuelve coordenadas; los objetos actualizan posición con `x = wrap(x + vx*dt, W)`.
- Tablas `RADII`, `SPEEDS`, `POINTS` están indexadas por tamaño de asteroide (1=pequeño, 2=mediano, 3=grande); el índice `0` es un marcador no usado.
- `initGame()` se ejecuta al cargar y `requestAnimationFrame(loop)` arranca el loop; `dt` está clamped a `0.05s`.

## Gotchas de input

- `keys` = teclas sostenidas; `justPressed` = flanco ascendente. `pressed(code)` **consume** la flag: se debe llamar una sola vez por frame (disparar usa edge detection), llamarlo dos veces pierde el evento.
- `Space`, flechas y `↑` tienen `preventDefault()` para evitar scroll de página.
- Input se referencia por `e.code` (`'Space'`, `'ArrowLeft'`), no por `keyCode`.

## Estilo

- Identificadores en inglés, comentarios en español (solo cuando aportan valor). `canvas`/`ctx` son globales: los métodos `draw()` los usan directamente.
