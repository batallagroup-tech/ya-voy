import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents, type RewardAdOptions } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";

// Banner oficial para Ya Voy Usuario
const BANNER_AD_ID = "ca-app-pub-3849768825456219/7317936592";
const TEST_BANNER_AD_ID = "ca-app-pub-3940256099942544/6300978111"; // Google Test ID

// Video Recompensado oficial para Ya Voy Usuario (Monedero Ya Voy)
const REWARD_AD_ID = "ca-app-pub-3849768825456219/2967190013";
const TEST_REWARD_AD_ID = "ca-app-pub-3940256099942544/5224354917";

let isInitialized = false;

/**
 * Inicializa el SDK de Google AdMob
 */
export async function initAdMob() {
  if (!Capacitor.isNativePlatform() || isInitialized) return;
  try {
    await AdMob.initialize({
      initializeForTesting: false,
    });
    isInitialized = true;
  } catch (e) {
    console.warn("AdMob init warning:", e);
  }
}

/**
 * Muestra el banner inferior en pantallas clave (Rastreo / Mis Pedidos)
 */
export async function showBottomBanner(marginBottom = 65) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await initAdMob();
    await AdMob.showBanner({
      adId: BANNER_AD_ID || TEST_BANNER_AD_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: marginBottom,
    });
  } catch (e) {
    console.warn("AdMob showBanner warning:", e);
  }
}

/**
 * Oculta el banner publicitario
 */
export async function hideBottomBanner() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.hideBanner();
  } catch {}
}

/**
 * Remueve el banner de la vista
 */
export async function removeBottomBanner() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.removeBanner();
  } catch {}
}

/**
 * Muestra un video recompensado para ganar saldo en el monedero
 */
export async function showRewardedAd(onRewardEarned: () => void | Promise<void>): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Simular recompensa en Web / Navegador de prueba
    await onRewardEarned();
    return true;
  }
  try {
    await initAdMob();
    const options: RewardAdOptions = {
      adId: REWARD_AD_ID || TEST_REWARD_AD_ID,
    };

    let rewardGiven = false;
    const triggerReward = async () => {
      if (rewardGiven) return;
      rewardGiven = true;
      try {
        await onRewardEarned();
      } catch (err) {
        console.error("Error executing onRewardEarned callback:", err);
      }
    };

    // 1. Registrar listener nativo para capturar el evento Rewarded de Google Mobile Ads
    const rewardedListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, async (rewardItem) => {
      console.log("AdMob Rewarded event fired:", rewardItem);
      await triggerReward();
    });

    const dismissedListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, async () => {
      console.log("AdMob Dismissed event fired");
      // Si el anuncio fue visto por completo pero el listener anterior no se activó a tiempo
      setTimeout(() => {
        rewardedListener.remove();
        dismissedListener.remove();
      }, 1500);
    });

    await AdMob.prepareRewardVideoAd(options);
    const rewardItem = await AdMob.showRewardVideoAd();
    if (rewardItem) {
      await triggerReward();
    }

    return true;
  } catch (e) {
    console.warn("Rewarded Ad error:", e);
    return false;
  }
}

export const showRewardedDiscount = showRewardedAd;
