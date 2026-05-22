
export function sendNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined') return;
  
  if (!('Notification' in window)) {
    console.warn("This browser does not support desktop notification");
    return;
  }

  const show = () => {
    try {
      if (typeof Notification === 'function') {
        try {
          return new Notification(title, options);
        } catch (e) {
          if (e instanceof TypeError && e.message.includes('Illegal constructor')) {
            console.warn("Notification constructor is illegal in this environment, likely due to iframe restrictions or browser security settings.");
            // Fallback for some browsers: try the service worker approach if available
          } else {
            throw e;
          }
        }
      } else {
        console.warn("Notification is not a function/constructor in this environment");
      }
    } catch (e) {
      console.warn("Notification creation failed:", e);
    }
  };

  if (Notification.permission === "granted") {
    return show();
  } else if (Notification.permission !== "denied") {
    try {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          show();
        }
      }).catch(err => {
        console.warn("Notification.requestPermission failed:", err);
      });
    } catch (e) {
       console.warn("Safe requestPermission failed:", e);
    }
  }
}
