import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface UserAvatarProps {
  avatar?: string;
  fallback: string;
  name: string;
  email?: string;
  size?: number;
  className?: string;
}

export function UserAvatar({
  avatar,
  fallback,
  name,
  email,
  size = 9,
  className = "",
}: UserAvatarProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className={`size-${size}`}>
        {avatar && <AvatarImage src={avatar} alt={name} />}
        <AvatarFallback className="text-sm">{fallback}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col text-sm">
        <span className="text-base text-card-foreground font-medium">
          {name}
        </span>
        {email && <span className=" text-muted-foreground">{email}</span>}
      </div>
    </div>
  );
}
