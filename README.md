# TwitchMIDI

A full-featured configurable Twitch bot to connect with your MIDI equipment while streaming. Allow your viewers to be part of your musical creations!

## Table of Contents
- [TwitchMIDI](#twitchmidi)
  - [Table of Contents](#table-of-contents)
  - [Download](#download)
  - [Installation](#installation)
  - [Why?](#why)
  - [Features](#features)
  - [Commands](#commands)
    - [Streamer/Mod only commands](#streamermod-only-commands)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!midion](#midion)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!midioff](#midioff)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!fullstopmidi](#fullstopmidi)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!syncmidi](#syncmidi)
    - [Streamer only commands](#streamer-only-commands)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!fetchdb](#fetchdb)
    - [Open commands](#open-commands)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!midihelp](#midihelp)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!settempo](#settempo)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!addchord](#addchord)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!removechord](#removechord)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!chordlist](#chordlist)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!sendnote](#sendnote)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!sendchord](#sendchord)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!sendloop](#sendloop)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!sendcc](#sendcc)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!cclist](#cclist)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!midivolume](#midivolume)
      - [&nbsp;&nbsp;&nbsp;&nbsp;!stoploop](#stoploop)
  - [Contributing](#contributing)
  - [Credits](#credits)
  - [Changelog](#changelog)
  - [License](#license)

## Download

Latest release - [TwitchMIDI for Windows, Linux & MacOS (x86-64)](https://github.com/rafaelpernil2/TwitchMIDI/releases/latest/download/TwitchMIDI.zip)

## Installation

* Extract the zip
* Run TwitchMIDI-yourplatform (e.g TwitchMIDI-win.exe)
* Follow the configuration steps to link this bot to your account. You will see something like this:

[![](https://feranern.sirv.com/Images/TwitchMIDI_initConfig.png)]()

* Done. Have fun!

## Why?

This project was born out of an idea for my music streams ([twitch.tv/rafaelpernil](https://twitch.tv/rafaelpernil)) where I play piano and improvise with my synth and drum machine.
It is really fun, but I wanted to apply my software engineering skills to make something special for my streams, to provide my viewers a new fun way of interacting with my gear.

I had this idea for months but it was not up until recently that I started to define tangible goals and implement them. My previous project, PolyVolcaWeb using the Web MIDI API gave me the confidence and clarity to start :)

My goals were:

- Create a Twitch bot and process commands
- Create a set of MIDI functionalities such as MIDI clock with tempo adjustments, synced chord progressions, notes, loops, cc messages, macros...
- Unite commands and MIDI functionalities
- Make it fast, suitable for streamers, stable and easy to use

So far, this first version does all that, keep reading the features for more details!

## Features

* Wide set of MIDI functionalities:
  * High precision MIDI Clock using "nanotimer" with adjustable tempo via !settempo
  * Sequencer on 4/4 time signature with infinite subdivisions (1 = Quarter note, 0.5 = 8th note, 0.25 = 16th note...)
  * Trigger individual notes or build a chord via !sendnote
  * Trigger chord progressions with specific length per chord via !sendchord
  * Loop chord progressions via !sendloop
  * Change MIDI velocity via !midivolume
  * Send CC (Control Change) messages and sweeps between values via !sendcc
  * Clock-Loop synchronizer to correct sync issues via !syncmidi
  * Automatic synchronization that forces loops to wait until the start of the beat
  * On/Off bot toggle
* Configurable aliases on [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json)
  * Commands - Add as many command aliases as you want
  * Chord progressions/loops - Add an alias for a chord progresion to play or loop using "name/chords" syntax
    * Add chord progressions via !addchord
    * Remove chord progression via !removechord
    * List all added chord progressions with their name with !chordlist
  * Control Change controller names - Put a name to your Control Change controllers (e.g sustain: 64)
  * Control Change commands - Assign a set of cc commands
    * Sweep functionality, specify two values and the time in milliseconds to get from one value to other (e.g "cutoff 20(5000),cutoff 120(10000)")
    * List all added chord progressions with their name with !cclist
  * Reload [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json) and [config/rewards.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/rewards.json) file while using the bot with !fetchdb
* Commands explaination with examples via !midihelp commandname
* Channel Points reward mode enabled via REWARDS_MODE flag and configurable on [config/rewards.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/rewards.json)
  * Set the name of your channe points reward and the command to launch (e.g. "Twitch Midi - Loop": "!sendloop" )
  * Commands only work for the streamer and mods

## Commands

### Streamer/Mod only commands
#### &nbsp;&nbsp;&nbsp;&nbsp;!midion
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Turns on the MIDI functionality of the bot

####  &nbsp;&nbsp;&nbsp;&nbsp;!midioff
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Turns off the MIDI functionality of the bot

####  &nbsp;&nbsp;&nbsp;&nbsp;!fullstopmidi
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Stops all MIDI messages and sound

####  &nbsp;&nbsp;&nbsp;&nbsp;!syncmidi
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Restarts the MIDI clock and syncs loop and clock on the next repetition

### Streamer only commands
####  &nbsp;&nbsp;&nbsp;&nbsp;!fetchdb
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Refreshes aliases configuration

### Open commands
####  &nbsp;&nbsp;&nbsp;&nbsp;!midihelp
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Shows all commands available and info about each command.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Syntax:```` command // (e.g "sendloop")````

####  &nbsp;&nbsp;&nbsp;&nbsp;!settempo
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Starts the MIDI clock and sets a tempo.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Syntax:```` tempo // (e.g. "120", "200")````

####  &nbsp;&nbsp;&nbsp;&nbsp;!addchord
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Adds a chord progression or loop with an alias.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Syntax:```` name/chords(chord length in quarter notes) // (e.g. "pop/C G(2) Amin(2) F")````

####  &nbsp;&nbsp;&nbsp;&nbsp;!removechord
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Removes a chord progression or loop with an alias.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Syntax:```` alias // (e.g. "pop")````
####  &nbsp;&nbsp;&nbsp;&nbsp;!chordlist
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Shows all saved chord progressions or loops that can be used

####  &nbsp;&nbsp;&nbsp;&nbsp;!sendnote
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sends a note or a set of notes.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Syntax:```` note1 note2 ... // (e.g. "C4 E4 G4")````
####  &nbsp;&nbsp;&nbsp;&nbsp;!sendchord
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sends a chord progression with an alias or with chords.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Syntax:```` chord1 chord2(chord length in quarter notes)... // (e.g. "C(4) G Amin(2) F","pop")````
####  &nbsp;&nbsp;&nbsp;&nbsp;!sendloop
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sends a loop with an alias or with chords.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Syntax:```` chord1 chord2(chord length in quarter notes)... // (e.g. "C G Amin F","pop")````

####  &nbsp;&nbsp;&nbsp;&nbsp;!sendcc
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sends a MIDI CC message with an alias, code or value sweeps.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Syntax:```` controller value,controller2 value2(delay_in_ms) // (e.g. "43 100,43 60","cutoff sweep","cutoff 100,cutoff 60","cutoff 100,cutoff 10(10000)")````

####  &nbsp;&nbsp;&nbsp;&nbsp;!cclist
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Shows a list of available CC command macros (e.g. cutoff sweep)

####  &nbsp;&nbsp;&nbsp;&nbsp;!midivolume
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sets the velocity for the chords/notes/loops.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Syntax:```` value between 0 and 100 // (e.g. "50","100")````
####  &nbsp;&nbsp;&nbsp;&nbsp;!stoploop
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Stops the loop once it ends


## Contributing
There is no plan regarding contributions in this project.
## Credits
This software is developed by:

**Rafael Pernil Bronchalo** - *Software Engineer*

* [github/rafaelpernil2](https://github.com/rafaelpernil2)

## Changelog
In progress...

## License
All rights reserved
