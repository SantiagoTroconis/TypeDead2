# Type of the Dead — Voice Edition

Shooter retro de zombis donde **disparas hablando**: di en voz alta la palabra que flota sobre un zombi y el personaje le dispara una ráfaga, una bala por letra.

## Cómo jugar

1. Levanta un servidor local en esta carpeta (el micrófono **no** funciona abriendo el archivo con doble clic):
   ```bash
   python -m http.server 8000
   ```
2. Abre `http://localhost:8000` en **Google Chrome** (recomendado). Edge también funciona, pero suele mostrar las palabras con retraso; Firefox no tiene reconocimiento de voz.
3. Pulsa **PRESS TO START** y permite el acceso al micrófono.

- Di la palabra (en inglés) que aparece sobre un zombi para eliminarlo. Puedes decir varias seguidas.
- Los **jefes** tienen 2–3 palabras y hay que decirlas todas, en orden.
- Si dices algo que no coincide con ningún zombi, el combo se reinicia.
- En los menús también puedes decir **"begin"** o **"retry"**.

### El recuadro de voz

- Las barras junto a `LISTENING` muestran el volumen del micrófono en tiempo real.
- `· · ·` aparece en cuanto empiezas a hablar, mientras llega la transcripción (~0,5 s).
- Las palabras que dispararon salen en **amarillo brillante**; las que no, en verde tenue.
- Si nada de lo que dijiste coincide, el recuadro tiembla en rojo.

> El reconocimiento de voz de Chrome usa los servidores de Google, así que necesitas conexión a internet.

### Pronunciación

Por defecto el juego es **estricto**: la palabra solo cuenta si el reconocedor de voz la escribió tal cual (se perdonan mayúsculas, palabras separadas como "choco late" y una "s" de plural). Si la pronuncias mal y el navegador entiende otra cosa ("peace" en vez de *pizza*), es un fallo.

Para un modo más permisivo, que acepta palabras que suenan parecido y las alternativas del reconocedor, pon `lenientPronunciation: true` en `js/config/settings.js`.

## Estructura

```
index.html              Página y HUD (solo marcado)
css/
  theme.css             Variables de color y fuentes
  style.css             HUD, paneles, efecto CRT, indicador de micrófono
js/
  main.js               Punto de entrada
  Game.js               Bucle, oleadas, combate y disparo por voz
  config/settings.js    Valores ajustables (vida, velocidad, combo, idioma de voz)
  core/                 Viewport (escalado 1280x720), GameObject, caché de Sprites
  data/                 Etapas y banco de palabras (cotidianas, por dificultad)
  entities/             Player, Zombie, Boss, Bullet, Particle
  input/
    VoiceInput.js       Escucha continua con la Web Speech API
    WordMatcher.js      Comparación tolerante entre lo oído y las palabras en pantalla
  render/               Dibujo de los sprites (sceneSprites) y escenario de fondo
  ui/Hud.js             Actualización del HUD y overlays
_original/              Export original de CodeWisp (versión por teclado), como respaldo
```

## Ajustes

Todo lo ajustable está en `js/config/settings.js` (etapa inicial, vida, velocidad de zombis, ventana del combo, idioma del reconocimiento…).
