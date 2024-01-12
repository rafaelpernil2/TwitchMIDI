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

Simplemente pon la nueva versión en la carpeta actual. TwitchMIDI configurará todo automáticamente y añadirá lo que falte.


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

## Commands {#Commands}

#### !midihelp
&nbsp;&nbsp;&nbsp;&nbsp;Shows all commands available and info about each command.

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````command // (e.g "sendloop")````


#### !midion
&nbsp;&nbsp;&nbsp;&nbsp;Turns on the MIDI functionality of the bot


#### !midioff
&nbsp;&nbsp;&nbsp;&nbsp;Turns off the MIDI functionality of the bot

#### !midipause
&nbsp;&nbsp;&nbsp;&nbsp;Pauses the requests but keeps playing whatever was already playing

#### !midiresume
&nbsp;&nbsp;&nbsp;&nbsp;Reactivates requests after they were paused with !midipause

#### !addchord
&nbsp;&nbsp;&nbsp;&nbsp;Adds a chord progression or loop with an alias to [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json).

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````name/chords(chord length in quarter notes) // (e.g. "pop/C G(2) Amin(2) F")````


#### !removechord
&nbsp;&nbsp;&nbsp;&nbsp;Removes a chord progression or loop with an alias from [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json).

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````alias // (e.g. "pop")````


#### !chordlist
&nbsp;&nbsp;&nbsp;&nbsp;Shows all saved chord progressions or loops from [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json) that can be used


#### !sendnote
&nbsp;&nbsp;&nbsp;&nbsp;Sends a note or a set of notes.

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````note1 note2 ... // (e.g. "C4 E4 G4")````


#### !sendchord
&nbsp;&nbsp;&nbsp;&nbsp;Sends a chord progression with an alias or with chords.

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````chord1 chord2(chord length in quarter notes)... // (e.g. "C(4) G Amin(2) F","pop")````


#### !sendloop
&nbsp;&nbsp;&nbsp;&nbsp;Sends a loop with an alias or with chords.

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````chord1 chord2(chord length in quarter notes)... // (e.g. "C G Amin F","pop")````


#### !sendcc
&nbsp;&nbsp;&nbsp;&nbsp;Sends a MIDI CC message with an alias, code or value sweeps.

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````controller value,controller2 value2(delay_in_ms) // (e.g. "43 100,43 60", "cutoff sweep", "cutoff 100,cutoff 10(10000)")````


#### !midicurrentrequest
&nbsp;&nbsp;&nbsp;&nbsp;Shows the current request being played.


#### !midirequestqueue
&nbsp;&nbsp;&nbsp;&nbsp;Shows the request queue for chord progressions and loops.


#### !cclist
&nbsp;&nbsp;&nbsp;&nbsp;Shows a list of available CC command macros from [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json)


#### !midivolume
&nbsp;&nbsp;&nbsp;&nbsp;Sets the velocity for the chords/notes/loops.

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````value between 0 and 100 // (e.g. "50","100")````


#### !stoploop
&nbsp;&nbsp;&nbsp;&nbsp;Stops the loop once it ends


#### !fullstopmidi
&nbsp;&nbsp;&nbsp;&nbsp;Stops all MIDI messages and sound


#### !settempo
&nbsp;&nbsp;&nbsp;&nbsp;Starts the MIDI clock and sets a tempo.

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````tempo // (e.g. "120", "200")````


#### !syncmidi
&nbsp;&nbsp;&nbsp;&nbsp;Restarts the MIDI clock and syncs loop and clock on the next repetition


#### !fetchdb
&nbsp;&nbsp;&nbsp;&nbsp;Refreshes aliases, rewards and permissions configurations from the respective files.

## Troubleshooting

Question: I get authentication errors each time I open the app. What can I do?

Answer:

>Delete `bot-tokens.json` and `broadcaster-tokens.json` from your `config` folder. If that does not work, remove BROADCASTER_REFRESH_TOKEN, BROADCASTER_ACCESS_TOKEN, BOT_REFRESH_TOKEN and BOT_ACCESS_TOKEN from your `.env` file and re-configure it again

