# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [TwitchMIDI]

## [1.3.0] - 2022-05-07
### Added
- !midirequestqueue command - Shows the requests in the queue
- !midicurrentrequest command - You can see which request is playing right now
- Now a message in chat appears showing the request being played currently

### Fixed
- Now !syncmidi and !settempo commands don't clear the entire queue, only skips the current request

## [1.2.17] - 2022-05-06
### Added
- MacOS execution notes in README. If not launched properly, it has issues with paths

### Fixed
- Reproducibility of bundles, now deletes previous assets before bundling

### Changed
- Upgraded "pkg" from 5.5.2 to 5.6.0
- Updated package-lock.json to Node 16+ version (lockfileVersion 2)
- Updated GitHub Actions pipelines

## [1.2.16] - 2022-04-24
### Fixed
- Sweep CC messages overload, now duplicate messages are avoided

### Changed
- CC messages sweep precision now works as a frequency, taking into account the time difference

## [1.2.15] - 2022-04-22
### Changed
- Documented more methods and added missing return types
- Removed unused files

## [1.2.14] - 2022-04-22
### Changed
- Minor refactors

## [1.2.13] - 2022-04-22
### Fixed
- !addchord now trims spaces before and after in the alias and chord progression before adding

## [1.2.12] - 2022-04-22
### Removed
- GZip compression to binaries

## [1.2.11] - 2022-04-22
### Added
- GZip compression to binaries, now they take up less space
### Changed
- Improved !sendcc command parsing and simplified code further
### Fixed
- Bugs when mixing CC commands with delay and without delay
- CC command list request with spaces between commands now works

## [1.2.10] - 2022-04-20
### Changed
- Re-organized midioff, midivolume and triggerClock to remove unnecessary exports and simplify code

## [1.2.9] - 2022-04-17
### Changed
- Added missing JSDocs in one method

## [1.2.8] - 2022-04-17
### Changed
- Refactor more methods to compact input parameters
- Updated JSDocs

## [1.2.7] - 2022-04-17
### Changed
- Sweep method refactor to compact input parameters

## [1.2.6] - 2022-04-17
### Fixed
- Line jump on first .env initialization error message

## [1.2.5] - 2022-04-17
### Changed
- Improved environment variable load error handling

## [1.2.4] - 2022-04-17
### Changed
- Cleaned up comments and minor name refactors

## [1.2.3] - 2022-04-17
### Changed
- More refactors, grouped code and simplified where possible
- Added environment variable validation and parsing on initialization

## [1.2.2] - 2022-04-15
### Changed
- Code re-ordering/refactors
- Simplified and unified style in .env variable loading
- Documented more methods
### Removed
- Dead code

## [1.2.1] - 2022-04-13
### Changed
- Bettercodehub.yaml excluded directories. Same code

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
[1.3.0]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.17...v1.3.0
[1.2.17]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.16...v1.2.17
[1.2.16]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.15...v1.2.16
[1.2.15]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.14...v1.2.15
[1.2.14]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.13...v1.2.14
[1.2.13]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.12...v1.2.13
[1.2.12]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.11...v1.2.12
[1.2.11]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.10...v1.2.11
[1.2.10]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.9...v1.2.10
[1.2.9]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.8...v1.2.9
[1.2.8]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.7...v1.2.8
[1.2.7]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.2.0...v1.2.1
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
