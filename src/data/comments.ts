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
  {
    id: 2,
    day: 2,
    username: "harriesantosoyusuf",
    text: "https://www.a1k0n.net/2011/07/20/donut-math.html\n2006 donut c",
    likes: 1,
    status: "built",
    feature: "ASCII Donut Math Animation",
    url: "https://www.instagram.com/p/DX5w_9zA5GH/",
  },
  {
    id: 3,
    day: 3,
    username: "mahfiraamalia",
    text: "Pak abdu kata anak saya tambahin bloop sama elgranmaja lagi berantem 🗿",
    likes: 1,
    status: "built",
    feature: "Granloop Arena TV",
    url: "https://www.instagram.com/p/DX9YAmXztsE/",
  },
  {
    id: 4,
    day: 4,
    username: "nuruldarari",
    text: "Make zoro from one piece say something on the screen when u first visit the web",
    likes: 0,
    status: "built",
    feature: "Zoro Santoryu Splash Screen",
    url: "https://www.instagram.com/reel/DYCGW9Phni8/",
  },
];
