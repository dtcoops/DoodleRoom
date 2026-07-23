import { Room } from "../types/types";

export type JoinResult =
  | { success: true; room: Room }
  | { success: false; reason: string };

export type LeaveResult =
  | { success: true; room: Room }
  | { success: false; reason: string };