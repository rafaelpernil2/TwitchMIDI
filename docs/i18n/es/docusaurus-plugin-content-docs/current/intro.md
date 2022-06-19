---
sidebar_position: 1
---
# Introducción {#introduction}

## Descarga {#Download}

Última versión - [TwitchMIDI para Windows, Linux & MacOS (x86-64)](https://github.com/rafaelpernil2/TwitchMIDI/releases/latest/download/TwitchMIDI.zip)

## Instalación {#Installation}

* Descomprime el .zip
* Ejecuta TwitchMIDI-yourplatform (e.g TwitchMIDI-win.exe)
* SIigue los pasos de configuración para enlazar este bot a tu cuenta. Verás algo así:

[![](https://feranern.sirv.com/Images/TwitchMIDI_initConfig.png)](#installation)

* Listo. A divertirse!

> Nota: Para MacOS, abre una terminal, haz "cd" a la carpeta donde lo extraiste y ejecútalo desde ahí usando "./TwitchMIDI-macos".
> Sino, te saltará un error del estilo: "no such file or directory, open './config/aliases.json'"

## Actualización {#Update}

### Sobreescribiendo configuración personalizada

* Descomprime y reemplaza todos los archivos

### Método seguro

Okay, esto se puede complicar un poco, pero si estás usando una configuración personalizada, ya sabes cómo funciona

* Extrae el zip en una carpeta diferente a la usada anteriormente
* Copia y reemplaza TwitchMIDI-yourplatform (e.g TwitchMIDI-win.exe) y package.json en tu carpeta
* Abre [config/permissions.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/permissions.json) y asegúrate de que todos los comandos tienen datos de permisos, sino, aquellos que falten darán error de permisos en ejecución
* Eso es todo!

> Nota: No necesitarás reemplazar la carpeta "config" entera a menos que haya un cambio de versión mayor (e.g, de 1.x.x a 2.x.x).
> En caso de duda, compara la versiones viejas de los archivos de config con las nuevas y re-aplica tus cambios. Mira [CHANGELOG.md](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/CHANGELOG.md) para más info.


## ¿Por qué TwitchMIDI? {#Why}

Este proyecto surge de una idea para mis streams musicales en ([twitch.tv/rafaelpernil](https://twitch.tv/rafaelpernil)) donde toco piano e improviso con mi sintetizador y caja de ritmos.
Es muy divertido, pero quería aplicar mis habilidades de ingeniero de software para hacer algo especial y traer a mis viewers una forma divertida de interactuar con mis cacharros.

He tenido esta idea durante meses pero no fue hasta hace poco que empecé a definir objetivos tangibles y a implementarlos. Mi proyecto anterior, PolyVolcaWeb, que usa la API de Web MIDI me dio la confianza y claridad para embarcarme con esto :)

Mis objetivos eran:

- Crear un bot de Twitch y procesar comandos
- Crear un conjunto de funcionalidades MIDI como reloj MIDI con tempo regulable, progresiones de acordes sincronizadas, notas, loops, mensajes CC, macros...
- Unir comandos y funcionalidad MIDI
- Hacer que funcione rápido, se adapte a las necesidades de los streamers, y que sea estable y fácil de usar

Hasta ahora, esta versión cumple todo eso, sigue leyendo las funcionalidades para más detalle!

## Funcionalidades {#Features}

* Amplio abanico de funcionalidades MIDI:
  * Reloj MIDI de alta precisión usando "nanotimer" con tempo regulable via [!settempo](#settempo)
  * Secuenciador en tiempo 4/4 con infinitas sub-divisiones (1 = Negra, 0.5 = Corchea, 0.25 = Semicorchea...)
  * Lanza notas individuales, monta un acorde o manda una melodía separada por comas via [!sendnote](#sendnote)
  * Lanza progresiones de acordes con longitud específica por acorde via [!sendchord](#sendchord) con una extensa lista de acordes de los que elegir. Mira [CHORDS.md](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/CHORDS.md)
  * Loopea progresiones de acordes via [!sendloop](#sendloop)
  * Soporte para silencios usando "rest" como reemplazo para una nota o acorde en peticiones de [!sendnote](#sendnote), [!sendchord](#sendchord) y [!sendloop](#sendloop)
  * Mira la progresión de acordes sonando ahora mismo via [!midicurrentrequest](#midicurrentrequest)
  * Mira la cola de peticiones de progresiones de acordes via [!midirequestqueue](#midirequestqueue)
  * Cambia el volumen (velocity) de las notas/acordes MIDI via [!midivolume](#midivolume)
  * Manda mensajes CC (Control Change) y barridos entre valores via [!sendcc](#sendcc)
  * Sincronizador de reloj y loop para re-sincronizar ritmo y música via [!syncmidi](#syncmidi)
  * Sincronización automática de loops que fuerza a que el loop espere al comienzo del compás
  * Interruptor de encendido/apagado
  * Pausa las peticiones con [!midipause](#midipause) y re-actívalas con [!midiresume](#midiresume)
* Aliases configurables en [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json)
  * Comandos - Añade tantos alias para comandos como quieras
  * Progresiones de acordes/Loops - Añade un alias para una progresión de acordes o loop usando la sintaxis "nombre/acordes"
    * Añade progresiones de acordes via [!addchord](#addchord)
    * Borra progresiones de acordes via [!removechord](#removechord)
    * Lista todas las progresiones de acordes añadidas via [!chordlist](#chordlist)
  * Nombres de controlador Control Change- Ponle nombre a tus controladores Control Change (e.g sustain: 64)
  * Comandos Control Change - Asigna un conjunto de comandos CC
    * Funcionalidad de barrido, specify two values and the time in milliseconds to get from one value to other (e.g "cutoff 20(5000),cutoff 120(10000)")
    * Lista todas las macros de mensajes CC añadidas via [!cclist](#cclist)
  * Recarga los archivos [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json), [config/permissions.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/permissions.json) y [config/rewards.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/rewards.json) mientras usas el bot con [!fetchdb](#fetchdb)
* Explicaciones de los comandos con ejemplos via [!midihelp](#midihelp) nombreDelComando
* Control de acceso detallado con comprobación de roles, lista blanca y lista negra en [config/permissions.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/permissions.json)
* Modo Recompensas del Canal activado mediante el flag REWARDS_MODE y configurable en [config/rewards.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/rewards.json)
  * Pon el nombre de tu recompensa, el comando a lanzar y el precio (e.g. "Twitch Midi - Loop": \["!sendloop",100\] )
  * Activación/Desactivación automática de las recompensas via [!midion](#midion)/[!midioff](#midioff)
  * Devolución de puntos automática en peticiones fallidas o cualquier tipo de error en petición
  * Los comandos solo funcionan para streamer y moderadores en este modo
  * Permitir que los VIP usen comandos sin canjear recompensas mediante el flag VIP_REWARDS_MODE
* Ejecutable optimizado para diferentes sistemas operativos y sin dependencias externas
* Internacionalización completa en Inglés y Español (por ahora)
* Comprobación de actualizaciones al arranque, un mensaje aparece si hay una versión nueva disponible
