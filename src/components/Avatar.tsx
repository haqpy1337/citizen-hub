"use client";

interface Props {
  username: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({ username, avatarUrl, size = 32, className = "" }: Props) {
  const style = { width: size, height: size, minWidth: size };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        style={style}
        className={`rounded-full object-cover border border-edge ${className}`}
      />
    );
  }

  const fontSize = Math.max(10, Math.round(size * 0.38));
  return (
    <div
      style={{ ...style, fontSize }}
      className={`rounded-full bg-hull border border-edge flex items-center justify-center font-bold text-ink uppercase shrink-0 ${className}`}
    >
      {username[0]}
    </div>
  );
}
