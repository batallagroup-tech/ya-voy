import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export function setStatusBarDark() {
  if (!Capacitor.isNativePlatform()) return;
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
}

export function setStatusBarLight() {
  if (!Capacitor.isNativePlatform()) return;
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
}
