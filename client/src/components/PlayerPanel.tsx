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

    if (phase === 'GAME_OVER') {
        const standings = [...players].sort((a, b) => b.score - a.score);
        return (
            <div className={styles.playerPanel}>
                <span className={styles.standingsLabel}>Final Standings</span>
                <div className={styles.playerList}>
                    {standings.map((player, i) => (
                        <div key={player.id} className={styles.playerCard}>
                            <span>{i + 1}. {player.name}</span>
                            <span>{player.score}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    return (
        <div className={styles.playerPanel}>
            {drawer && (
                <div className={styles.drawerSection}>
                    <span className={styles.drawerLabel}>Current Drawer</span>
                    <div className={styles.playerCard}>{drawer.name}</div>
                </div>
            )}

            <div className={styles.playerList}>
                {others.map((player) => {
                    const hasGuessed = correctGuessers.includes(player.id);
                    const baseScore = scoresAtRoundStart[player.id] ?? player.score;
                    const displayedTotal = phase === 'DRAWING' ? baseScore : player.score;
                    const scoreChange = showScoreChange ? player.score - baseScore : null;

                    return (
                        <div key={player.id} className={styles.playerCard}>
                            <span>{player.name}</span>
                            <span>{displayedTotal}</span>
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