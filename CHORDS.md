# List of supported chords

This program uses [harmonics](https://github.com/scribbletune/harmonics) by [scribbletune](https://github.com/scribbletune) to convert chord notation to MIDI notes.

But, in addition to those provided by [harmonics](https://github.com/scribbletune/harmonics), I included some extra ones for a more confortable syntax.

## Harmonics notation

- 5th
- M7#5sus4
- 7#5sus4
- sus4
- M7sus4
- 7sus4
- 7no5
- aug
- M7b6
- maj7#5
- 7#5
- 7b13
- M
- maj7
- 7th
- 6th
- 7add6
- 7b6
- Mb5
- M7b5
- 7b5
- maj#4
- 7#11
- M6#11
- 7#11b13
- m#5
- mb6M7
- m7#5
- m
- m/ma7
- m7
- m6
- mMaj7b6
- dim
- oM7
- m7b5
- dim7
- o7M7
- 4th
- madd4
- m7add11
- add#9
- 7#5#9
- 7#9
- 13#9
- 7#9b13
- maj7#9#11
- 7#9#11
- 13#9#11
- 7#9#11b13
- sus2
- M9#5sus4
- sus24
- M9sus4
- 11th
- 9sus4
- 13sus4
- 9no5
- 13no5
- M#5add9
- maj9#5
- 9#5
- 9b13
- Madd9
- maj9
- 9th
- 6/9
- maj13
- M7add13
- 13th
- M9b5
- 9b5
- 13b5
- 9#5#11
- maj9#11
- 9#11
- 69#11
- M13#11
- 13#11
- 9#11b13
- m9#5
- madd9
- mM9
- m9
- m69
- m13
- mMaj9b6
- m9b5
- m11A
- m11
- b9sus
- 11b9
- 7sus4b9b13
- alt7
- 7#5b9
- Maddb9
- M7b9
- 7b9
- 13b9
- 7b9b13
- 7#5b9#11
- 7b9#11
- 13b9#11
- 7b9b13#11
- mb6b9
- 7b9#9

> Info extracted from [chordMaps.json](https://github.com/scribbletune/harmonics/blob/main/gen/chordMaps.json)

## Custom notation

I added support for major chords providing just a note, standard extended chords without "th" and minor chord variants using "min" instead of "m":

- 4
- 5
- 6
- 7
- 9
- 11
- 13
- min#5
- minb6M7
- min7#5
- min
- min/ma7
- min7
- min6
- minMaj7b6
- min7b5
- minadd4
- min7add11
- min9#5
- minadd9
- minM9
- min9
- min69
- min13
- minMaj9b6
- min9b5
- min11A
- min11
- minb6b9
