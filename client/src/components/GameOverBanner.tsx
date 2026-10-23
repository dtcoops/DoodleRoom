import type { Player } from '../types/types';

import styles from './GameOverBanner.module.css';

interface GameOverBannerProps {
    players: Player[];
    isHost: boolean;
    onReturnToLobby: () => void;
}

export function GameOverBanner({ players, isHost, onReturnToLobby }: GameOverBannerProps) {
    const topScore = Math.max(0, ...players.map((p) => p.score));
    const winners = players.filter((p) => p.score === topScore);

    let headline: string;
    if (topScore === 0) {
        headline = 'Nobody scored this time!';
    } else if (winners.length === 1) {
        headline = `${winners[0].name} wins!`;
    } else {
        headline = `It's a tie: ${winners.map((w) => w.name).join(' & ')}`;
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                <h2 className={styles.headline}>{headline}</h2>
                {topScore > 0 && <p className={styles.score}>{topScore} points</p>}
                {isHost ? (
                    <button className={styles.button} onClick={onReturnToLobby}>
                        Return to Lobby
                    </button>
                ) : (
                    <p className={styles.waiting}>Waiting for the host to return to the lobby…</p>
                )}
            </div>
        </div>
    );
}
