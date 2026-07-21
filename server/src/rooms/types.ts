
export type Player = {
  id: string;
  name: string;
};

export type Room = {
    roomCode: string;
    hostId: string;
    players: Player[];
}

export type JoinResult =
  | { success: true; room: Room }
  | { success: false; reason: string };

  export type LeaveResult =
  | { success: true; room: Room }
  | { success: false; reason: string };