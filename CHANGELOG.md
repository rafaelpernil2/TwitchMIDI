# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [TwitchMIDI]

## [1.2.0] - 2022-04-13
### Added
- Fine-grained command access control with role check, whitelist and blackist
### Changed
- Major refactor to reduce code duplicity and spread features in different files/folders
- Reduced sweep precision to 256 again to reduce load, the outcome is pretty much the same

## [1.1.6] - 2022-04-12
### Added
- Easter egg (try !settempo 69)
### Changed
- Tempo value now can have decimals
- Reorganized clock instructions for perfect stability and precision
- Changed Math.floor to Math.round in timeout and sweep calculations to be more precise

## [1.1.5] - 2022-04-12
### Added
- Tempo validation, it must be between 35 and 400
### Fixed
- Clock start sync

## [1.1.4] - 2022-04-12
### Changed
- Removed commented-out code
- Minor refactor

## [1.1.3] - 2022-04-12
### Changed
- Renamed package.json name from "twitch-midi-bot" to "twitch-midi" | This is not a breaking change because this project is not published as a package

## [1.1.2] - 2022-04-12
### Changed
- More refactors to simplify code, now the MIDI clock is separate and all the utils are better categorized
- Documented lots of methods
- Simplified CC message handling code
- Improved error handling and validation
- Increased sweep precision from 256 to 512 steps
### Added
- Shared variables to send information between exported modules
### Fixed
- !midioff bugs, now flushes chord progressions/loops and waits a bit for everything to be clean


## [1.1.1] - 2022-04-12
### Fixed
- !fullstopmidi queue reset again

## [1.1.0] - 2022-04-12
### Added
- Loop queue resumes after chord queue is done
### Changed
- Big refactor of whole project
- Improved and simplified queue code
### Fixed
- No more queue collisions

## [1.0.8] - 2022-04-11
### Fixed
- !sendloop and !sendchord duplicate requests are now ignored
- Queue overlapping issues

## [1.0.7] - 2022-04-11
### Fixed
- !fullstopmidi and !stoploop queue reset

## [1.0.6] - 2022-04-10
### Added
- Command collision prevention, now a queue is created and chord progressions and loops are executed in order
### Fixed
- !midioff variable reset - Now !loop starts the MIDI clock again after !midioff-!midion sequence

## [1.0.5] - 2022-04-10
### Changed
- Now when queing a loop or chord progression, if the MIDI clock was stopped, it starts so that you don't need to always call !settempo to start the beat
- Default MIDI volume changed from 100/127 to 64/127

## [1.0.4] - 2022-04-09
### Changed
- Improved clock stability and sync commands - Now flushes loop when changing tempo and !sync calls !settempo with the current tempo
- Reduced CPU usage

## [1.0.3] - 2022-04-09
### Added
- VIP toggle to allow VIP users to use commands freely when Rewards mode is enabled
- Credits in !midion and !midioff

### Changed
- Command message unification
- Renamed WebMIDI keywords to MIDI for accuracy

## [1.0.2] - 2022-04-01
### Added
- Missing links to commands in README.md

## [1.0.1] - 2022-04-01
### Added
- Multi-OS bundle in Feature section inside README.md
- New documentation from previous commits

## [1.0.0] - 2022-04-01
### Added
- Initial stable version


[TwitchMIDI]: https://github.com/rafaelpernil2/TwitchMIDI
[1.2.0]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.1.6...v1.2.0
[1.1.6]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.8...v1.1.0
[1.0.8]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v0.1.3...v1.0.0
