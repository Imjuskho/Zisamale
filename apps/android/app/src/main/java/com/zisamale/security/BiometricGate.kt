package com.zisamale.security

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

/**
 * Offline re-entry gate (Technical Development Prompt §3.1.3: "Login:
 * Biometric or PIN (no internet required)"). Uses the platform
 * BiometricPrompt with device-credential (PIN/pattern/password) fallback so
 * any enrolled screen lock satisfies the challenge.
 */
object BiometricGate {

    sealed class Availability {
        /** Device has an acceptable authenticator — call [authenticate]. */
        object Ready : Availability()

        /** No screen lock enrolled; gate cannot protect anything. */
        object NoCredential : Availability()

        /** Biometric hardware unavailable/temporarily locked out; PIN still works. */
        data class TryCredentialOnly(val reason: String) : Availability()
    }

    fun availability(activity: FragmentActivity): Availability {
        val bm = BiometricManager.from(activity)
        return when (bm.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_WEAK or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
        )) {
            BiometricManager.BIOMETRIC_SUCCESS -> Availability.Ready
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
                if (bm.canAuthenticate(BiometricManager.Authenticators.DEVICE_CREDENTIAL) ==
                    BiometricManager.BIOMETRIC_SUCCESS
                ) {
                    Availability.TryCredentialOnly("Unlock with your screen lock")
                } else {
                    Availability.NoCredential
                }
            else ->
                if (bm.canAuthenticate(BiometricManager.Authenticators.DEVICE_CREDENTIAL) ==
                    BiometricManager.BIOMETRIC_SUCCESS
                ) {
                    Availability.TryCredentialOnly("Biometrics unavailable — use screen lock")
                } else {
                    Availability.NoCredential
                }
        }
    }

    /**
     * Shows the system auth sheet. The combined BIOMETRIC_WEAK|DEVICE_CREDENTIAL
     * set is not accepted on every OS level (API 28/29 quirk), so degrade to
     * credential-only rather than crash.
     */
    fun authenticate(
        activity: FragmentActivity,
        title: String,
        subtitle: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val combos = listOf(
            BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL,
            BiometricManager.Authenticators.DEVICE_CREDENTIAL
        )
        var lastError: IllegalArgumentException? = null
        for (combo in combos) {
            try {
                val prompt = BiometricPrompt(
                    activity,
                    ContextCompat.getMainExecutor(activity),
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) =
                            onSuccess()

                        override fun onAuthenticationError(code: Int, errString: CharSequence) {
                            if (code != BiometricPrompt.ERROR_USER_CANCELED &&
                                code != BiometricPrompt.ERROR_NEGATIVE_BUTTON
                            ) {
                                onError(errString.toString())
                            } else {
                                onError("")
                            }
                        }
                    }
                )
                prompt.authenticate(
                    BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setAllowedAuthenticators(combo)
                        .build()
                )
                return
            } catch (e: IllegalArgumentException) {
                lastError = e
            }
        }
        throw lastError ?: IllegalStateException("No authenticator combination accepted")
    }
}
