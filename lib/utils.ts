export function generateUserId(): string {
  const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `匿名の参加者#${randomHex}`;
}

export function getUserId(): string {
  if (typeof window === 'undefined') {
    return generateUserId();
  }

  let userId = localStorage.getItem('chat-user-id');
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem('chat-user-id', userId);
  }
  return userId;
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
