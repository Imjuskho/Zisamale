package com.zisamale.util

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.File
import java.util.UUID

/**
 * Stages visit photos for upload: re-encodes camera output to a bounded JPEG
 * (longest edge ≤ 1600px) so each queued photo is well under the server's
 * 10MB cap even on 2G uplink. Returns null when decoding fails.
 */
object PhotoCompressor {

    private const val MAX_DIMENSION = 1600
    private const val JPEG_QUALITY = 82

    fun compressToJpeg(input: File, outputDir: File): File? {
        return try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(input.absolutePath, bounds)
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

            val sampleSize = calculateInSampleSize(bounds, MAX_DIMENSION)
            val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            val bitmap = BitmapFactory.decodeFile(input.absolutePath, options) ?: return null

            val scaled = scaleDown(bitmap)
            outputDir.mkdirs()
            val out = File(outputDir, "photo_${UUID.randomUUID()}.jpg")
            out.outputStream().use { stream ->
                scaled.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, stream)
            }
            if (scaled !== bitmap) bitmap.recycle()
            out
        } catch (_: Throwable) {
            null
        }
    }

    private fun calculateInSampleSize(bounds: BitmapFactory.Options, maxDim: Int): Int {
        var sample = 1
        var largest = maxOf(bounds.outWidth, bounds.outHeight)
        while (largest / (sample * 2) >= maxDim) sample *= 2
        return sample
    }

    private fun scaleDown(bitmap: Bitmap): Bitmap {
        val largest = maxOf(bitmap.width, bitmap.height)
        if (largest <= MAX_DIMENSION) return bitmap
        val ratio = MAX_DIMENSION.toFloat() / largest
        return Bitmap.createScaledBitmap(
            bitmap,
            (bitmap.width * ratio).toInt().coerceAtLeast(1),
            (bitmap.height * ratio).toInt().coerceAtLeast(1),
            true
        )
    }
}
