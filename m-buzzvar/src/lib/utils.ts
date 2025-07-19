export function formatDistanceToNow(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + (Math.floor(interval) === 1 ? " year ago" : " years ago");
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + (Math.floor(interval) === 1 ? " month ago" : " months ago");
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + (Math.floor(interval) === 1 ? " day ago" : " days ago");
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + (Math.floor(interval) === 1 ? " hour ago" : " hours ago");
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + (Math.floor(interval) === 1 ? " minute ago" : " minutes ago");
    }
    if (seconds < 10) {
      return "just now";
    }
    return Math.floor(seconds) + " seconds ago";
  }
  