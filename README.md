# TwitchMIDI

A full-featured configurable Twitch bot to connect with your MIDI equipment while streaming. Allow your viewers to be part of your musical creations!

[![Twitch MIDI Demo](https://feranern.sirv.com/Images/twitchmidicropshort.gif)](https://www.youtube.com/watch?v=3JK5JukHRn0)

## Table of Contents
- [TwitchMIDI](#twitchmidi)
  - [Table of Contents](#table-of-contents)
  - [Download](#download)
  - [Installation](#installation)
  - [Why?](#why)
  - [Features](#features)
  - [Commands](#commands)
      - [!midihelp](#midihelp)
      - [!midion](#midion)
      - [!midioff](#midioff)
      - [!addchord](#addchord)
      - [!removechord](#removechord)
      - [!chordlist](#chordlist)
      - [!sendnote](#sendnote)
      - [!sendchord](#sendchord)
      - [!sendloop](#sendloop)
      - [!sendcc](#sendcc)
      - [!cclist](#cclist)
      - [!midivolume](#midivolume)
      - [!stoploop](#stoploop)
      - [!fullstopmidi](#fullstopmidi)
      - [!settempo](#settempo)
      - [!syncmidi](#syncmidi)
      - [!fetchdb](#fetchdb)
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

[![](https://feranern.sirv.com/Images/TwitchMIDI_initConfig.png)](#installation)

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
  * High precision MIDI Clock using "nanotimer" with adjustable tempo via [!settempo](#settempo)
  * Sequencer on 4/4 time signature with infinite subdivisions (1 = Quarter note, 0.5 = 8th note, 0.25 = 16th note...)
  * Trigger individual notes or build a chord via [!sendnote](#sendnote)
  * Trigger chord progressions with specific length per chord via [!sendchord](#sendchord)
  * Loop chord progressions via [!sendloop](#sendloop)
  * Change MIDI velocity via [!midivolume](#midivolume)
  * Send CC (Control Change) messages and sweeps between values via [!sendcc](#sendcc)
  * Clock-Loop synchronizer to correct sync issues via [!syncmidi](#syncmidi)
  * Automatic synchronization that forces loops to wait until the start of the beat
  * On/Off bot toggle
* Configurable aliases on [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json)
  * Commands - Add as many command aliases as you want
  * Chord progressions/loops - Add an alias for a chord progresion to play or loop using "name/chords" syntax
    * Add chord progressions via [!addchord](#addchord)
    * Remove chord progression via [!removechord](#removechord)
    * List all added chord progressions with their name with [!chordlist](#chordlist)
  * Control Change controller names - Put a name to your Control Change controllers (e.g sustain: 64)
  * Control Change commands - Assign a set of cc commands
    * Sweep functionality, specify two values and the time in milliseconds to get from one value to other (e.g "cutoff 20(5000),cutoff 120(10000)")
    * List all added chord progressions with their name with [!cclist](#cclist)
  * Reload [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json) and [config/rewards.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/rewards.json) file while using the bot with [!fetchdb](#fetchdb)
* Commands explaination with examples via [!midihelp](#midihelp) commandname
* Fine-grained command access control with role check, whitelist and blackist on [config/permissions.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/permissions.json)
* Channel Points reward mode enabled via REWARDS_MODE flag and configurable on [config/rewards.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/rewards.json)
  * Set the name of your channe points reward and the command to launch (e.g. "Twitch Midi - Loop": "!sendloop" )
  * Commands only work for the streamer and mods
  * Allow VIPs to bypass rewards via VIP_REWARDS_MODE
* Bundle optimized for different operating systems and no extra software required for execution

## Commands

#### !midihelp
&nbsp;&nbsp;&nbsp;&nbsp;Shows all commands available and info about each command.

&nbsp;&nbsp;&nbsp;&nbsp;Syntax:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;````command // (e.g "sendloop")````


#### !midion
&nbsp;&nbsp;&nbsp;&nbsp;Turns on the MIDI functionality of the bot


#### !midioff
&nbsp;&nbsp;&nbsp;&nbsp;Turns off the MIDI functionality of the bot


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



## Contributing
There is no plan regarding contributions in this project.

## Credits
This software is developed by:

**Rafael Pernil Bronchalo** - *Software Engineer*

* [github/rafaelpernil2](https://github.com/rafaelpernil2)

## Changelog
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning - see the [CHANGELOG.md](CHANGELOG.md) file for details.

## License
All rights reserved
