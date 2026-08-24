package com.zisamale.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * AndroidKeyStore-backed AES/GCM encryption helpers.
 *
 * Secret keys never leave the secure hardware/keystore; only ciphertext
 * (iv ‖ ct, base64) is persisted to private storage. Used for:
 *  - the SQLCipher database passphrase (DbKeyManager)
 *  - the session token (SessionStore)
 *
 * Principle 5 / ADR-005: nothing sensitive is written to disk in plaintext.
 */
object KeystoreCipher {

    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val TRANSFORM = "AES/GCM/NoPadding"
    private const val IV_BYTES = 12
    private const val GCM_BITS = 128

    /** Base64 blob format: [12-byte iv][ciphertext+tag]. */
    fun encrypt(alias: String, plain: ByteArray): String {
        val cipher = Cipher.getInstance(TRANSFORM)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey(alias))
        val iv = cipher.iv
        val ct = cipher.doFinal(plain)
        return Base64.encodeToString(iv + ct, Base64.NO_WRAP)
    }

    fun decrypt(alias: String, blob: String): ByteArray {
        val raw = Base64.decode(blob, Base64.NO_WRAP)
        require(raw.size > IV_BYTES) { "Corrupt ciphertext blob" }
        val iv = raw.copyOfRange(0, IV_BYTES)
        val ct = raw.copyOfRange(IV_BYTES, raw.size)
        val cipher = Cipher.getInstance(TRANSFORM)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(alias), GCMParameterSpec(GCM_BITS, iv))
        return cipher.doFinal(ct)
    }

    fun newRandomKeyMaterial(bytes: Int = 32): ByteArray {
        val buf = ByteArray(bytes)
        SecureRandom().nextBytes(buf)
        return buf
    }

    private fun getOrCreateKey(alias: String): SecretKey {
        val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (ks.getKey(alias, null) as? SecretKey)?.let { return it }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }
}
