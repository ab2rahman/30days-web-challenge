export interface Comment {
  id: number;
  day: number;
  username: string;
  text: string;
  likes: number;
  status: "pending" | "building" | "built";
  feature?: string;
  url?: string;
}

export const comments: Comment[] = [];
