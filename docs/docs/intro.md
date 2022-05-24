---
sidebar_position: 1
---
# Introduction {#introduction}

## Donwload {#Download}

Latest release - [TwitchMIDI for Windows, Linux & MacOS (x86-64)](https://github.com/rafaelpernil2/TwitchMIDI/releases/latest/download/TwitchMIDI.zip)

## Installation {#Installation}

* Extract the zip
* Run TwitchMIDI-yourplatform (e.g TwitchMIDI-win.exe)
* Follow the configuration steps to link this bot to your account. You will see something like this:

[![](https://feranern.sirv.com/Images/TwitchMIDI_initConfig.png)](#installation)

* Done. Have fun!

> Note: For MacOS, open a terminal, "cd" into the extracted folder and then execute it from there with "./TwitchMIDI-macos".
> Otherwise you will get an error like: "no such file or directory, open './config/aliases.json'"

## Update {#Update}

### Overriding custom settings

* Extract and replace all files except .env into your folder

### Safe method

Okay, this can get a little more complicated, but if you are using custom settings, you already know how they work

* Extract the zip in a different folder than before
* Copy and replace TwitchMIDI-yourplatform (e.g TwitchMIDI-win.exe) and package.json into your folder
* Open [config/permissions.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/permissions.json) and make sure all commands have an entry, otherwise those missing will always return permissions errors
* That's it!

> Note: You do not need to replace the entire config folder unless there is a major version change (e.g, from 1.x.x to 2.x.x).
> In case of doubt, compare old with new versions of config files and re-apply your changes. See [CHANGELOG.md](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/CHANGELOG.md) for more info.


## Why? {#Why}

This project was born out of an idea for my music streams ([twitch.tv/rafaelpernil](https://twitch.tv/rafaelpernil)) where I play piano and improvise with my synth and drum machine.
It is really fun, but I wanted to apply my software engineering skills to make something special for my streams, to provide my viewers a new fun way of interacting with my gear.

I had this idea for months but it was not up until recently that I started to define tangible goals and implement them. My previous project, PolyVolcaWeb using the Web MIDI API gave me the confidence and clarity to start :)

My goals were:

- Create a Twitch bot and process commands
- Create a set of MIDI functionalities such as MIDI clock with tempo adjustments, synced chord progressions, notes, loops, cc messages, macros...
- Unite commands and MIDI functionalities
- Make it fast, suitable for streamers, stable and easy to use

So far, this first version does all that, keep reading the features for more details!

## Features {#Features}

* Wide set of MIDI functionalities:
  * High precision MIDI Clock using "nanotimer" with adjustable tempo via [!settempo](#settempo)
  * Sequencer on 4/4 time signature with infinite subdivisions (1 = Quarter note, 0.5 = 8th note, 0.25 = 16th note...)
  * Trigger individual notes, build a chord or send a melody separated by commas via [!sendnote](#sendnote)
  * Trigger chord progressions with specific length per chord via [!sendchord](#sendchord) with an extensive list of chords to choose from. See [CHORDS.md](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/CHORDS.md)
  * Loop chord progressions via [!sendloop](#sendloop)
  * Support for music rests using "rest" as a replacement for a chord or note in [!sendnote](#sendnote), [!sendchord](#sendchord) and [!sendloop](#sendloop) requests
  * See the current chord progression via [!midicurrentrequest](#midicurrentrequest)
  * Check the chord progression request queue via [!midirequestqueue](#midirequestqueue)
  * Change MIDI velocity via [!midivolume](#midivolume)
  * Send CC (Control Change) messages and sweeps between values via [!sendcc](#sendcc)
  * Clock-Loop synchronizer to correct sync issues via [!syncmidi](#syncmidi)
  * Automatic synchronization that forces loops to wait until the start of the beat
  * On/Off bot toggle
  * Pause requests with [!midipause](#midipause) and resume with [!midiresume](#midiresume)
* Configurable aliases on [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json)
  * Commands - Add as many command aliases as you want
  * Chord progressions/loops - Add an alias for a chord progresion to play or loop using "name/chords" syntax
    * Add chord progressions via [!addchord](#addchord)
    * Remove chord progression via [!removechord](#removechord)
    * List all added chord progressions with their name with [!chordlist](#chordlist)
  * Control Change controller names - Put a name to your Control Change controllers (e.g sustain: 64)
  * Control Change commands - Assign a set of cc commands
    * Sweep functionality, specify two values and the time in milliseconds to get from one value to other (e.g "cutoff 20(5000),cutoff 120(10000)")
    * List all added Control Change commands with their name via [!cclist](#cclist)
  * Reload [config/aliases.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/aliases.json), [config/permissions.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/permissions.json) and [config/rewards.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/rewards.json) file while using the bot with [!fetchdb](#fetchdb)
* Commands explanation with examples via [!midihelp](#midihelp) commandname
* Fine-grained command access control with role check, whitelist and blackist on [config/permissions.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/permissions.json)
* Channel Points reward mode enabled via REWARDS_MODE flag and configurable on [config/rewards.json](https://github.com/rafaelpernil2/TwitchMIDI/blob/master/config/rewards.json)
  * Set the name of your channel points reward, the command to launch and the price (e.g. "Twitch Midi - Loop": \["!sendloop",100\] )
  * Automatic enable/disable rewards on [!midion](#midion)/[!midioff](#midioff)
  * Automatic points refund on bad requests / any kind of error
  * Commands only work for the streamer and mods
  * Allow VIPs to bypass rewards via VIP_REWARDS_MODE
* Bundle optimized for different operating systems and no extra software required for execution
* Internationalization with full support for English and Spanish as of right now
* Update checking on startup, a message appears if there is a new version available
