import { ChatClient } from "@twurple/chat";
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage";
import { addChordAlias, disableMidi, fullStop, getChordList, initMidi, removeChordAlias, sendCCMessage, sendMIDIChord, sendMIDILoop, sendMIDINote, setMidiTempo, setVolume, stopMIDILoop, syncMidi } from "./midi-handler";

export const onMessageHandlerClosure = (chatClient: ChatClient, targetMidiName: string, targetMidiChannel: number) => {
    const MIDI_ON = "midion";
    const MIDI_OFF = "midioff";
    const ADD_CHORD_ALIAS = "addchord";
    const REMOVE_CHORD_ALIAS = "removechord";
    const GET_CHORD_LIST = "chordlist";
    const SEND_NOTE = "sendnote";
    const SEND_CHORD = "sendchord";
    const SEND_LOOP = "sendloop";
    const SEND_CC = "sendcc";
    const MIDI_VOLUME = "midivolume";
    const STOP_LOOP = "stoploop";
    const FULL_STOP = "fullstopmidi";
    const SET_TEMPO = "settempo";
    const SYNC = "syncmidi";
    type CommandType =
        typeof MIDI_ON |
        typeof SET_TEMPO |
        typeof SEND_CHORD |
        typeof ADD_CHORD_ALIAS |
        typeof REMOVE_CHORD_ALIAS |
        typeof GET_CHORD_LIST |
        typeof SEND_NOTE |
        typeof SEND_CC |
        typeof SEND_LOOP |
        typeof STOP_LOOP |
        typeof SYNC |
        typeof FULL_STOP |
        typeof MIDI_OFF |
        typeof MIDI_VOLUME;
    const onMessageMap: Record<CommandType, (channel: string, user: string, message: string, msg: TwitchPrivateMessage) => Promise<void>> = {
        [MIDI_ON]: async (channel, user, message, msg) => {
            const { isMod, isBroadcaster } = msg.userInfo;
            if (isMod || isBroadcaster) {
                await initMidi(targetMidiName);
                chatClient.say(channel, 'MIDI magic enabled!');
            } else {
                chatClient.say(channel, 'Meeeec, you do not have enough permissions');
            }

        },
        [MIDI_OFF]: async (channel, user, message, msg) => {
            const { isMod, isBroadcaster } = msg.userInfo;
            if (isMod || isBroadcaster) {
                await disableMidi();
                chatClient.say(channel, 'MIDI magic disabled!');
            } else {
                chatClient.say(channel, 'Meeeec, you do not have enough permissions');
            }

        },
        [MIDI_VOLUME]: async (channel, user, message) => {
            const volume = setVolume(message)
            chatClient.say(channel, 'Volume set to ' + volume + '%');
        },
        [SET_TEMPO]: async (channel, user, message) => {
            const tempo = await setMidiTempo(channel, message);
            chatClient.say(channel, 'Tempo set to ' + tempo);
        },
        [SEND_NOTE]: async (channel, user, message) => {
            chatClient.say(channel, 'Note sent! ');
            await sendMIDINote(channel, message, targetMidiChannel);
        },
        [SEND_CC]: async (channel, user, message, msg) => {
            const [key] = await sendCCMessage(channel, message, msg, targetMidiChannel);
            chatClient.say(channel, `Control Change(CC#${key}) message sent! `);
        },
        [SEND_CHORD]: async (channel, user, message) => {
            chatClient.say(channel, 'Chord progression enqueued! ');
            await sendMIDIChord(channel, message, targetMidiChannel);
        },
        [ADD_CHORD_ALIAS]: async (channel, user, message) => {
            await addChordAlias(channel, message);
            chatClient.say(channel, 'Chord progression saved! ');
        },
        [REMOVE_CHORD_ALIAS]: async (channel, user, message) => {
            await removeChordAlias(channel, message);
            chatClient.say(channel, 'Chord progression removed! ');
        },
        [GET_CHORD_LIST]: async (channel) => {
            const chordProgressionList = await getChordList();
            chatClient.say(channel, 'Here is the list of saved chord progresison/loop:');
            for (const [alias, chordProgression] of chordProgressionList) {
                chatClient.say(channel, `🎵${alias}🎵:🎼${chordProgression}🎼`)
            }
        },
        [SEND_LOOP]: async (channel, user, message) => {
            chatClient.say(channel, 'Loop enqueued! ');
            await sendMIDILoop(channel, message, targetMidiChannel);
        },
        [STOP_LOOP]: async (channel) => {
            stopMIDILoop();
            chatClient.say(channel, 'Dequeuing loop.. Done! ');
        },
        [FULL_STOP]: async (channel, user, message, msg) => {
            const { isMod, isBroadcaster } = msg.userInfo;
            if (isMod || isBroadcaster) {
                fullStop();
                chatClient.say(channel, 'Stopping all MIDI... Done!');
            } else {
                chatClient.say(channel, 'Ask a mod to run this command');
            }
        },
        [SYNC]: async (channel) => {
            syncMidi();
            chatClient.say(channel, "Let's fix this mess... Done!");
        }
    }
    const aliasMap: Record<string, CommandType> = {
        "encendermidi": MIDI_ON,
        "encenderjamones": MIDI_ON,
        "apagarmidi": MIDI_OFF,
        "apagarjamones": MIDI_OFF,
        "volumemidi": MIDI_VOLUME,
        "volumenmidi": MIDI_VOLUME,
        "volumenacorde": MIDI_VOLUME,
        "volumenloop": MIDI_VOLUME,
        "volumenbucle": MIDI_VOLUME,
        "tempo": SET_TEMPO,
        "chord": SEND_CHORD,
        "acordes": SEND_CHORD,
        "progresion": SEND_CHORD,
        "loop": SEND_LOOP,
        "pararbucle": STOP_LOOP,
        "pararloop": STOP_LOOP,
        "bucle": SEND_LOOP,
        "sync": SYNC,
        "sincronizar": SYNC,
        "stop": FULL_STOP,
        "fullstop": FULL_STOP,
        "addloop": ADD_CHORD_ALIAS,
        "deleteloop": REMOVE_CHORD_ALIAS,
        "quitarloop": REMOVE_CHORD_ALIAS,
        "deletechord": REMOVE_CHORD_ALIAS,
        "looplist": GET_CHORD_LIST,
        "nota": SEND_NOTE,
        "note": SEND_NOTE,
        "cc": SEND_CC,
        "controlchange": SEND_CC
    }
    return async (channel: string, user: string, message: string, msg: TwitchPrivateMessage): Promise<void> => {
        // Ignore messages that are not commands
        if (!message.startsWith("!")) {
            return;
        }
        const commandMessage = message.slice(1).split(" ")[0].toLowerCase() as CommandType;
        try {
            // Try to get the function directly or look up by alias
            const handler = onMessageMap?.[commandMessage] ?? onMessageMap?.[aliasMap[commandMessage]];
            await handler?.(channel, user, message, msg);
        } catch (error) {
            chatClient.say(channel, String(error));
        }
        return
    }
}
