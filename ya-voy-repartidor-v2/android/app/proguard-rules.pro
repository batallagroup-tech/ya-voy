# Capacitor / Cordova
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase / Google Services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Stripe
-keep class com.stripe.** { *; }

# Clerk (se ejecuta en WebView, no necesita reglas nativas)

# Mantener trazas de error legibles
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Admob
-keep class com.google.android.gms.ads.** { *; }
