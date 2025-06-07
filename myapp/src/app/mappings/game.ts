export interface message {
  session_id: string;
  name: string;
  progress: number;
  correctText: string;
  messageType: messageType;
  currTexted: string;
  remainingText: string;
}

export interface playerInfo {
  session_id: string;
  name: string;
  progress: number;
  remainingText: string;
  correctText: string;
  currTexted: string;
}

export type messageType = number;

export const KEY_STROKE: messageType = 0;
export const UPDATE_TEXT: messageType = 1;
