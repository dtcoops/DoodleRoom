import { useState } from "react"

import { useGameStore } from "../store/gameStore";
import styles from './HomeScreen.module.css';

type Mode = 'choose' | 'create' | 'join';

export function HomeScreen() {
    const [name, setName] = useState('');
    const [mode, setMode] = useState<Mode>('choose');
    const [roomCode, setRoomCode] = useState('');

    const createRoom = useGameStore((s) => s.createRoom);
    const joinRoom = useGameStore((s) => s.joinRoom);
    const errorMessage = useGameStore((s) => s.errorMessage);
    const clearError = useGameStore((s) => s.clearError);

    function handleBack() {
        setMode('choose');
        setRoomCode('');
        clearError();
    }

    return (
        <div className={ styles.mainPage }>
            <div className={ styles.branding }>
                <img className={ styles.logo } src="/handDrawn.svg" alt="DoodleRoom logo" />
                <h2 className={ styles.title }>DoodleRoom</h2>
            </div>

            {mode === 'choose' && (
                <div className={ styles.form }>
                    <button onClick={() => setMode('create')}>Create Game</button>
                    <button onClick={() => setMode('join')}>Join Game</button>
                </div>
            )}

            {mode === 'create' && (
                <div className={ styles.form }>
                    <div className={styles.inputGroup}>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className={styles.buttonGroup}>
                        <button onClick={() => createRoom(name.trim())} disabled={!name.trim()}>Create</button>
                        <button onClick={handleBack}>Back</button>
                    </div>
                </div>
            )}

            {mode === 'join' && (
                <div className={ styles.form }>
                    <div className={styles.inputGroup}>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                        <input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="Room code" />
                    </div>
                    <div className={styles.buttonGroup}>
                        <button onClick={() => joinRoom(roomCode.trim(), name.trim())} disabled={!name.trim() || !roomCode.trim()}>Join</button>
                        <button onClick={handleBack}>Back</button>
                    </div>
                </div>
            )}

            {errorMessage && <p>{errorMessage}</p>}
        </div>
    )
}