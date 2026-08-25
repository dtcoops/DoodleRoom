import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

import styles from './ChatWindow.module.css';

interface ChatWindowProps {
    shouldSendAsGuess: boolean;
}

export function ChatWindow({ shouldSendAsGuess }: ChatWindowProps) {
    const [message, setMessage] = useState('');
    const roomLog = useGameStore((s) => s.roomLog);
    const submitGuess = useGameStore((s) => s.submitGuess);
    const sendChat = useGameStore((s) => s.sendChat);

    function handleSubmit() {
        if (!message.trim()) {
            return;
        }

        if (shouldSendAsGuess) {
            submitGuess(message.trim());
        } else {
            sendChat(message.trim());
        }
        setMessage('');
    }

    return (
        <div className={styles.chatWindow}>
            <div className={styles.log}>
                {roomLog.map((entry, i) => {
                    if (entry.type === 'system') {
                        return <div key={i} className={styles.systemMessage}>{entry.message}</div>;
                    }
                    if (entry.type === 'chat') {
                        return <div key={i}><strong>{entry.playerName}:</strong> {entry.text}</div>;
                    }
                    // entry.type === 'guess'
                    return (
                        <div key={i}>
                            <strong>{entry.playerName}:</strong> {entry.correct ? '(guessed correctly!)' : entry.text}
                        </div>
                    );
                })}
            </div>

            <div className={styles.inputRow}>
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={shouldSendAsGuess ? "Type your guess..." : "Type a message..."}
                />
                <div className={styles.buttonSlot}>
                    <button onClick={handleSubmit}>Send</button>
                </div>
            </div>
        </div>
    );
}