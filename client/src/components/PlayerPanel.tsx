import type { Player, GamePhase } from "../types/types";

import styles from './PlayerPanel.module.css';

interface PlayerPanelProps {
    players: Player[];
    drawerId: string | null;
    phase: GamePhase;
    scoresAtRoundStart: Record<string, number>;
    correctGuessers: string[];
}

export function PlayerPanel({ players, drawerId, phase, scoresAtRoundStart, correctGuessers }: PlayerPanelProps) {
    const drawer = players.find((p) => p.id === drawerId);
    const others = players.filter((p) => p.id !== drawerId);
    const showScoreChange = phase === 'DRAWING' || phase === 'ROUND_END';
    
    return (
        <div className={styles.playerPanel}>
            {/* Show Drawer details seperately if available */}
            {drawer && (
                <div className={styles.drawerSection}>
                    <span className={styles.drawerLabel}>Current Drawer</span>
                    <div className={styles.playerCard}>{drawer.name}</div>
                </div>
            )}

            <div className={styles.playerList}>
                {others.map((player) => {
                    const hasGuessed = correctGuessers.includes(player.id);
                    const scoreChange = showScoreChange
                        ? player.score - (scoresAtRoundStart[player.id] ?? player.score)
                        : null;
                    return (
                        <div key={player.id} className={styles.playerCard}>
                            <span>{player.name}</span>
                            <span>{player.score}</span>
                            {phase === 'DRAWING' && (
                                <span className={styles.status}>{hasGuessed ? '✓ Correct!' : 'Guessing...'}</span>
                            )}
                            {scoreChange !== null && <span className={styles.scoreChange}>+{scoreChange}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}