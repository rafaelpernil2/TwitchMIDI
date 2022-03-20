import { ChatClient } from "@twurple/chat";
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage";
import { disableMidi, fullStop, initMidi, sendMIDIChord, sendMIDILoop, setMidiTempo, setVolume, stopMIDILoop, syncMidi } from "../providers/midi-provider";

export const onMessageHandlerClosure = (chatClient: ChatClient, targetMidiName: string) => {
    const MIDI_ON = "midion";
    const MIDI_OFF = "midioff";
    const SEND_CHORD = "sendchord";
    const SEND_LOOP = "sendloop";
    const MIDI_VOLUME = "midivolume";
    const STOP_LOOP = "stoploop";
    const FULL_STOP = "fullstopmidi";
    const SET_TEMPO = "settempo";
    const SYNC = "syncmidi";
    type CommandType =
        typeof MIDI_ON |
        typeof SET_TEMPO |
        typeof SEND_CHORD |
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
        [SEND_CHORD]: async (channel, user, message) => {
            chatClient.say(channel, 'Chord progression sent! ');
            await sendMIDIChord(channel, message);
        },
        [SEND_LOOP]: async (channel, user, message) => {
            chatClient.say(channel, 'The loop is rolling! ');
            await sendMIDILoop(channel, message);
        },
        [STOP_LOOP]: async (channel) => {
            stopMIDILoop();
            chatClient.say(channel, 'And... The loop is gone! ');
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
        "fullstop": FULL_STOP
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
