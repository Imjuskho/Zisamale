# ── Zisamale Android release rules (pilot hardening, M5) ─────────────
# Release builds run R8 (isMinifyEnabled=true). Everything below exists so
# reflection-driven stacks survive shrinking:
#   Room/SQLCipher (encrypted local store), Retrofit+Gson (wire DTOs),
#   Hilt workers (background sync), OkHttp platform probes.

# ── Local store ───────────────────────────────────────────────────────
-keep class com.zisamale.data.local.** { *; }
-keep class com.zisamale.domain.model.** { *; }

# SQLCipher loads native code and is configured reflectively.
-keep class net.zetetic.database.** { *; }
-keep class net.sqlcipher.** { *; }

# ── Wire models (Retrofit + Gson) ─────────────────────────────────────
# Gson serializes via reflection on field names; data classes must keep names.
-keep class com.zisamale.data.remote.** { *; }
-keep class com.zisamale.ml.EdgeTelemetryRecord { *; }
-keepclassmembers class kotlin.Metadata { *; }

# Retrofit interfaces/proxies.
-keepattributes Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations, AnnotationDefault
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ── WorkManager / Hilt workers (@HiltWorker uses reflection) ──────────
-keep class androidx.hilt.work.HiltWorkerFactory { *; }
-keepclasseswithmembernames class * extends androidx.work.ListenableWorker

# ── Compose / Kotlin ─────────────────────────────────────────────────
-dontwarn kotlinx.coroutines.debug.**
-keepclassmembers class com.zisamale.** {
    volatile <fields>;
}
