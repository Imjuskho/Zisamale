package com.zisamale.monitoring

import android.content.Context
import java.io.File
import java.time.Instant

/**
 * Crash telemetry without a vendor SDK (M5): uncaught exceptions are appended
 * to a small rolling file so the next sync can ship them (future: attach to
 * /ml/telemetry or a dedicated endpoint). The default handler still runs so
 * the OS crash flow is untouched.
 *
 * Ring buffer semantics live in [CrashLog.prune] (pure, unit-tested); this
 * class only performs I/O.
 */
object CrashReporter {

    private const val DIR = "crash"
    private const val FILE = "crash.log"
    private const val MAX_ENTRIES = 50

    fun install(context: Context) {
        val appContext = context.applicationContext
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            runCatching { append(appContext, thread.name, throwable) }
            previous?.uncaughtException(thread, throwable)
        }
    }

    private fun append(context: Context, threadName: String, throwable: Throwable) {
        val dir = File(context.filesDir, DIR).apply { mkdirs() }
        val file = File(dir, FILE)
        val entry = buildString {
            append(Instant.now().toString())
            append(" | ")
            append(threadName)
            append(" | ")
            appendLine(CrashLog.format(throwable))
        }
        file.appendText(entry)
        val pruned = CrashLog.prune(file.readLines(), MAX_ENTRIES)
        if (pruned.size < file.readLines().size) file.writeText(pruned.joinToString("\n"))
    }

    fun drainPendingReports(context: Context): List<String> {
        val file = File(File(context.filesDir, DIR), FILE)
        if (!file.exists()) return emptyList()
        val lines = file.readLines()
        file.delete()
        return lines
    }
}

/** Pure helpers (JVM-tested): formatting + ring-buffer pruning. */
object CrashLog {

    fun format(throwable: Throwable): String =
        "${throwable.javaClass.name}: ${throwable.message.orEmpty().take(300)}"

    fun prune(lines: List<String>, maxEntries: Int): List<String> =
        if (lines.size <= maxEntries) lines else lines.takeLast(maxEntries)
}
