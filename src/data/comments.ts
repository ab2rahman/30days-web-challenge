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

export const comments: Comment[] = [
  {
    id: 1,
    day: 1,
    username: "akskoko",
    text: 'Create a challenge title "Wait for {countdown timer starting from 30.000 seconds} to see the magic". Roll dice 4 times to generate a 4-digit number (1.000-9.999ms). Click to match the exact number!',
    likes: 4,
    status: "built",
    feature: "Magikarp Countdown Challenge",
    url: "https://www.instagram.com/p/DX3v1ATRb_9/",
  },
];
