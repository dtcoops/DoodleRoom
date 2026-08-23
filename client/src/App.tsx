import './App.css'

import { useGameStore } from './store/gameStore';
import { GameRoom } from './pages/GameRoom';
import { HomeScreen } from './pages/HomeScreen';

function App() {
    const room = useGameStore((s) => s.room);
    return room ? <GameRoom /> : <HomeScreen />;
}

export default App
