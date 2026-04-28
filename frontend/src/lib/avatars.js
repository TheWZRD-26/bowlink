// 8 animal avatars hosted locally in /public/avatars/
export const PRESET_AVATARS = [
  { id: "howl", label: "Howl", src: "/avatars/howl.png" },
  { id: "fox", label: "Fox", src: "/avatars/fox.png" },
  { id: "red-panda", label: "Red Panda", src: "/avatars/red-panda.png" },
  { id: "hedgehog", label: "Hedgehog", src: "/avatars/hedgehog.png" },
  { id: "rabbit", label: "Rabbit", src: "/avatars/rabbit.png" },
  { id: "frog", label: "Frog", src: "/avatars/frog.png" },
  { id: "turtle", label: "Turtle", src: "/avatars/turtle.png" },
  { id: "snail", label: "Snail", src: "/avatars/snail.png" },
];

export const DEFAULT_AVATAR = "/avatars/howl.png";

export function resolveAvatar(user) {
  if (!user) return DEFAULT_AVATAR;
  return user.custom_avatar || user.picture || DEFAULT_AVATAR;
}
