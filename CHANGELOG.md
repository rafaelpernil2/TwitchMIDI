# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [TwitchMIDI]

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
[1.0.5]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/rafaelpernil2/TwitchMIDI/compare/v0.1.3...v1.0.0
