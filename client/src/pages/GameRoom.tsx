import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';

import type { DrawSegment } from '../types/types';
import { ChatWindow } from '../components/ChatWindow';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { PlayerPanel } from '../components/PlayerPanel';

import styles from './GameRoom.module.css';

export function GameRoom() {
    const room = useGameStore((s) => s.room);
    const you = useGameStore((s) => s.you);
    const returnToLobby = useGameStore((s) => s.returnToLobby);
    const startGame = useGameStore((s) => s.startGame);
    const leaveRoom = useGameStore((s) => s.leaveRoom);
    const currentWord = useGameStore((s) => s.currentWord);
    const requestClearCanvas = useGameStore((s) => s.requestClearCanvas);
    const [incomingSegments, setIncomingSegments] = useState<DrawSegment[]>([]);
    const [clearSignal, setClearSignal] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const roomRef = useRef(room);

    useEffect(() => {
        function handleSegment(segment: DrawSegment) {
            setIncomingSegments((prev) => [...prev, segment]);
        }
        function handleClear() {
            setIncomingSegments([]);
            setClearSignal((n) => n + 1);
        }

        socket.on('draw:segment', handleSegment);
        socket.on('draw:clear', handleClear);

        return () => {
            socket.off('draw:segment', handleSegment);
            socket.off('draw:clear', handleClear);
        };
    }, []);

    useEffect(() => {
        roomRef.current = room;
    }, [room]);

    useEffect(() => {
        if (!room || room.gameState.phase !== 'DRAWING' || !room.gameState.roundEndsAt) {
            setTimeRemaining(null);
            return;
        }

        function tick() {
            const endsAt = roomRef.current?.gameState.roundEndsAt;
            if (!endsAt) return;
            setTimeRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
        }

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room?.gameState.phase, room?.gameState.roundEndsAt]);

    if (!room || !you) {
        return null;
    }

    const isHost = you.id === room.hostId;
    const isDrawer = you.id === room.gameState.drawerId;
    const phase = room.gameState.phase;
    const hasGuessedCorrectly = room.gameState.correctGuessers.includes(you.id);
    const shouldSendAsGuess = phase === 'DRAWING' && !isDrawer && !hasGuessedCorrectly;
    const wordLength = room.gameState.wordLength;

    function handleLocalDraw(segment: DrawSegment) {
        socket.emit('draw:segment', segment);
        setIncomingSegments((prev) => [...prev, segment]);
    }

    function getPillText() {
        if (phase === 'WAITING') return 'DoodleRoom';
        const wordPart = isDrawer ? currentWord : `${wordLength ?? '?'} letters`;
        return timeRemaining !== null ? `${wordPart}  •  ${timeRemaining}s` : wordPart;
    }

    function handleLocalClear() {
        requestClearCanvas();
        setIncomingSegments([]);
        setClearSignal((n) => n + 1);
    }

    return (
        <div className={styles.mainPage}>
            <div className={styles.playerPanelWrapper}>
                <PlayerPanel
                    players={room.players}
                    drawerId={room.gameState.drawerId}
                    phase={phase}
                    scoresAtRoundStart={room.gameState.scoresAtRoundStart}
                    correctGuessers={room.gameState.correctGuessers}
                />
            </div>

             <div className={styles.canvasWrapper}>
                <div className={styles.wordPill}>
                    {getPillText()}
                </div>
                <DrawingCanvas
                    enabled={isDrawer || phase === 'WAITING'}
                    onDraw={handleLocalDraw}
                    incomingSegments={incomingSegments}
                    clearSignal={clearSignal}
                />
                <button className={styles.clearButton} onClick={() => handleLocalClear()}>Clear</button>
            </div>

            <div className={styles.chatPanel}>
                <p className={styles.roomInfo}>Room Code: <strong>{room.roomCode}</strong></p>
                <div className={styles.controls}>
                    <div className={styles.buttonSlot}>
                        {isHost && phase === 'WAITING' && (
                            <button onClick={() => startGame()}>Start Game</button>
                        )}
                    </div>
                    <div className={styles.buttonSlot}>
                        {isHost && <button onClick={() => returnToLobby()}>End Game</button>}
                    </div>
                    <button className={styles.buttonLeave} onClick={() => leaveRoom()}>Leave Room</button>
                </div>
                <ChatWindow shouldSendAsGuess={shouldSendAsGuess} />
            </div>
        </div>
    )
}